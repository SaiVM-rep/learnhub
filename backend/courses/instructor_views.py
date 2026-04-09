from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Avg, Count, F, Max
from django.shortcuts import get_object_or_404

from .models import Course, Module, Lesson, Enrollment
from .permissions import IsInstructor, IsInstructorOwner
from .utils import get_youtube_duration
from .instructor_serializers import (
    InstructorCourseListSerializer,
    InstructorCourseCreateSerializer,
    InstructorCourseUpdateSerializer,
    InstructorCurriculumSerializer,
    InstructorModuleSerializer,
    InstructorLessonSerializer,
    InstructorDashboardStatsSerializer,
)


# ─── Dashboard Stats ───────────────────────────────────────────────

class InstructorDashboardView(APIView):
    permission_classes = [IsInstructor]

    def get(self, request):
        courses = Course.objects.filter(instructor=request.user)
        total_courses = courses.count()
        published = courses.filter(is_published=True).count()
        draft = total_courses - published

        enrollments = Enrollment.objects.filter(
            course__instructor=request.user, is_active=True
        )
        total_students = enrollments.values('student').distinct().count()

        total_revenue = 0.0
        for c in courses:
            count = c.enrollments.filter(is_active=True).count()
            total_revenue += float(c.price) * count

        avg_rating = courses.aggregate(
            avg=Avg('reviews__rating')
        )['avg'] or 0.0

        data = {
            'total_courses': total_courses,
            'published_courses': published,
            'draft_courses': draft,
            'total_students': total_students,
            'total_revenue': round(total_revenue, 2),
            'average_rating': round(avg_rating, 1),
        }
        return Response(InstructorDashboardStatsSerializer(data).data)


# ─── Course CRUD ────────────────────────────────────────────────────

class InstructorCourseListView(generics.ListAPIView):
    serializer_class = InstructorCourseListSerializer
    permission_classes = [IsInstructor]
    pagination_class = None

    def get_queryset(self):
        return Course.objects.filter(
            instructor=self.request.user
        ).select_related('category').order_by('-created_at')


class InstructorCourseCreateView(generics.CreateAPIView):
    serializer_class = InstructorCourseCreateSerializer
    permission_classes = [IsInstructor]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = serializer.save()
        return Response(
            InstructorCourseListSerializer(course).data,
            status=status.HTTP_201_CREATED,
        )


class InstructorCourseUpdateView(generics.UpdateAPIView):
    serializer_class = InstructorCourseUpdateSerializer
    permission_classes = [IsInstructor, IsInstructorOwner]
    lookup_field = 'pk'

    def get_queryset(self):
        return Course.objects.filter(instructor=self.request.user)


class InstructorCourseDeleteView(generics.DestroyAPIView):
    permission_classes = [IsInstructor, IsInstructorOwner]
    lookup_field = 'pk'

    def get_queryset(self):
        return Course.objects.filter(instructor=self.request.user)


class InstructorCourseTogglePublishView(APIView):
    permission_classes = [IsInstructor]

    def post(self, request, pk):
        course = get_object_or_404(Course, pk=pk, instructor=request.user)
        course.is_published = not course.is_published
        course.save(update_fields=['is_published'])
        return Response({
            'id': str(course.id),
            'is_published': course.is_published,
            'message': f"Course {'published' if course.is_published else 'unpublished'} successfully.",
        })


# ─── Curriculum (Modules + Lessons) ────────────────────────────────

class InstructorCurriculumView(generics.RetrieveAPIView):
    serializer_class = InstructorCurriculumSerializer
    permission_classes = [IsInstructor, IsInstructorOwner]
    lookup_field = 'pk'

    def get_queryset(self):
        return Course.objects.filter(
            instructor=self.request.user
        ).prefetch_related('modules__lessons')


# ── Modules ─────────────────────────────────────────────────────────

class InstructorModuleCreateView(APIView):
    permission_classes = [IsInstructor]

    def post(self, request, course_pk):
        course = get_object_or_404(Course, pk=course_pk, instructor=request.user)
        max_order = course.modules.aggregate(m=Max('order'))['m'] or 0
        serializer = InstructorModuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        module = Module.objects.create(
            course=course,
            title=serializer.validated_data['title'],
            description=serializer.validated_data.get('description', ''),
            order=serializer.validated_data.get('order', max_order + 1),
        )
        return Response(
            InstructorModuleSerializer(module).data,
            status=status.HTTP_201_CREATED,
        )


class InstructorModuleUpdateView(APIView):
    permission_classes = [IsInstructor]

    def patch(self, request, pk):
        module = get_object_or_404(Module, pk=pk, course__instructor=request.user)
        for field in ('title', 'description', 'order'):
            if field in request.data:
                setattr(module, field, request.data[field])
        module.save()
        return Response(InstructorModuleSerializer(module).data)


class InstructorModuleDeleteView(APIView):
    permission_classes = [IsInstructor]

    def delete(self, request, pk):
        module = get_object_or_404(Module, pk=pk, course__instructor=request.user)
        module.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Lessons ─────────────────────────────────────────────────────────

class InstructorLessonCreateView(APIView):
    permission_classes = [IsInstructor]

    def post(self, request, module_pk):
        module = get_object_or_404(
            Module, pk=module_pk, course__instructor=request.user
        )
        max_order = module.lessons.aggregate(m=Max('order'))['m'] or 0
        serializer = InstructorLessonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        lesson = Lesson.objects.create(
            module=module,
            title=data['title'],
            lesson_type=data.get('lesson_type', 'VIDEO'),
            video_url=data.get('video_url', ''),
            duration_minutes=data.get('duration_minutes', 0),
            order=data.get('order', max_order + 1),
            is_preview=data.get('is_preview', False),
            content=data.get('content', ''),
        )
        return Response(
            InstructorLessonSerializer(lesson).data,
            status=status.HTTP_201_CREATED,
        )


class InstructorLessonUpdateView(APIView):
    permission_classes = [IsInstructor]

    def patch(self, request, pk):
        lesson = get_object_or_404(
            Lesson, pk=pk, module__course__instructor=request.user
        )
        allowed = ('title', 'lesson_type', 'video_url', 'duration_minutes',
                    'order', 'is_preview', 'content')
        for field in allowed:
            if field in request.data:
                setattr(lesson, field, request.data[field])
        lesson.save()
        return Response(InstructorLessonSerializer(lesson).data)


class InstructorLessonDeleteView(APIView):
    permission_classes = [IsInstructor]

    def delete(self, request, pk):
        lesson = get_object_or_404(
            Lesson, pk=pk, module__course__instructor=request.user
        )
        lesson.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Video Metadata (YouTube duration auto-detect) ─────────────────

class VideoMetadataView(APIView):
    permission_classes = [IsInstructor]

    def post(self, request):
        url = request.data.get('video_url', '').strip()
        if not url:
            return Response(
                {'error': 'video_url is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = get_youtube_duration(url)
        if 'error' in result:
            return Response(
                {'error': result['error']},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(result)


# ─── Enrollment endpoints (for students) ───────────────────────────

class EnrollmentCreateView(APIView):
    """POST /api/enrollments/ { course_id: uuid }"""

    def post(self, request):
        course_id = request.data.get('course_id')
        if not course_id:
            return Response(
                {'error': 'course_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        course = get_object_or_404(Course, pk=course_id, is_published=True)

        if request.user.role == 'INSTRUCTOR' and course.instructor == request.user:
            return Response(
                {'error': 'Instructors cannot enroll in their own courses.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        enrollment, created = Enrollment.objects.get_or_create(
            student=request.user, course=course,
            defaults={'is_active': True},
        )
        if not created and not enrollment.is_active:
            enrollment.is_active = True
            enrollment.save(update_fields=['is_active'])

        return Response({
            'enrolled': True,
            'enrollment_id': str(enrollment.id),
            'message': "You're enrolled! Start learning." if created else 'Already enrolled.',
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class EnrollmentCheckView(APIView):
    """GET /api/enrollments/check/<course_id>/"""

    def get(self, request, course_id):
        enrolled = Enrollment.objects.filter(
            student=request.user, course_id=course_id, is_active=True
        ).exists()
        return Response({'enrolled': enrolled})
