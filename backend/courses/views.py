from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.utils import timezone
from .models import Category, Course, Enrollment, Lesson, LessonProgress
from .serializers import (
    CategorySerializer, CourseListSerializer, CourseDetailSerializer,
    EnrollmentSerializer
)
from .permissions import IsAdmin


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class CourseListView(generics.ListAPIView):
    serializer_class = CourseListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Course.objects.filter(is_active=True, is_published=True).select_related('instructor', 'category')

        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        category = self.request.query_params.get('category', '')
        if category:
            queryset = queryset.filter(category__slug=category)

        difficulty = self.request.query_params.get('difficulty', '')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty.upper())

        instructor = self.request.query_params.get('instructor', '')
        if instructor:
            queryset = queryset.filter(instructor__id=instructor)

        featured = self.request.query_params.get('featured', '')
        if featured == 'true':
            queryset = queryset.filter(is_featured=True)

        sort = self.request.query_params.get('sort', '-created_at')
        if sort in ['price', '-price', 'title', '-title', 'created_at', '-created_at']:
            queryset = queryset.order_by(sort)

        return queryset


class CourseDetailView(generics.RetrieveAPIView):
    queryset = Course.objects.filter(is_active=True).select_related('instructor', 'category').prefetch_related('modules__lessons')
    serializer_class = CourseDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'


class MyEnrollmentsView(generics.ListAPIView):
    serializer_class = EnrollmentSerializer

    def get_queryset(self):
        return Enrollment.objects.filter(
            student=self.request.user, is_active=True
        ).select_related('course__instructor', 'course__category')


class AdminCategoryCreateView(generics.CreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [IsAdmin]


class AdminCategoryUpdateView(generics.UpdateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdmin]
    lookup_field = 'pk'


class AdminCategoryDeleteView(generics.DestroyAPIView):
    queryset = Category.objects.all()
    permission_classes = [IsAdmin]
    lookup_field = 'pk'


class LessonCompleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, lesson_id):
        try:
            lesson = Lesson.objects.select_related('module__course').get(id=lesson_id)
        except Lesson.DoesNotExist:
            return Response({'error': 'Lesson not found'}, status=status.HTTP_404_NOT_FOUND)

        course = lesson.module.course
        enrollment = Enrollment.objects.filter(
            student=request.user, course=course, is_active=True
        ).first()

        if not enrollment:
            return Response({'error': 'Not enrolled in this course'}, status=status.HTTP_403_FORBIDDEN)

        progress_obj, created = LessonProgress.objects.update_or_create(
            student=request.user,
            lesson=lesson,
            defaults={'is_completed': True, 'completed_at': timezone.now()}
        )

        total_lessons = Lesson.objects.filter(module__course=course).count()
        completed_lessons = LessonProgress.objects.filter(
            student=request.user,
            lesson__module__course=course,
            is_completed=True
        ).count()

        enrollment.progress = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
        if enrollment.progress >= 100:
            enrollment.completed_at = timezone.now()
        enrollment.save(update_fields=['progress', 'completed_at'])

        return Response({
            'completed': True,
            'progress': round(enrollment.progress, 1),
            'completed_lessons': completed_lessons,
            'total_lessons': total_lessons
        })


class CourseProgressView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)

        enrollment = Enrollment.objects.filter(
            student=request.user, course=course, is_active=True
        ).first()

        if not enrollment:
            return Response({'error': 'Not enrolled in this course'}, status=status.HTTP_403_FORBIDDEN)

        lessons = Lesson.objects.filter(module__course=course).values_list('id', flat=True)
        progress_records = LessonProgress.objects.filter(
            student=request.user, lesson_id__in=lessons
        ).values('lesson_id', 'is_completed', 'completed_at')

        progress_map = {
            str(p['lesson_id']): {
                'is_completed': p['is_completed'],
                'completed_at': p['completed_at']
            }
            for p in progress_records
        }

        total_lessons = len(lessons)
        completed_lessons = sum(1 for p in progress_records if p['is_completed'])

        return Response({
            'total_lessons': total_lessons,
            'completed_lessons': completed_lessons,
            'progress': round(enrollment.progress, 1),
            'lessons': progress_map
        })
