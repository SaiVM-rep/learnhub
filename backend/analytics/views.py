from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Avg, Sum, Q
from itertools import chain
from operator import attrgetter

from courses.models import Enrollment, Lesson, LessonProgress
from assessments.models import TestAttempt, Test


class StudentDashboardAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # Active enrollments
        enrollments = Enrollment.objects.filter(
            student=user, is_active=True
        ).select_related('course__instructor', 'course__category')

        enrolled_courses = enrollments.count()

        # Completed lessons
        completed_lessons_qs = LessonProgress.objects.filter(
            student=user, is_completed=True
        )
        completed_lessons = completed_lessons_qs.count()

        # Average quiz score (percentage)
        submitted_attempts = TestAttempt.objects.filter(
            student=user, is_submitted=True
        )
        avg_score_data = submitted_attempts.aggregate(
            avg_score=Avg('score'),
            avg_total=Avg('total_marks')
        )
        if avg_score_data['avg_score'] is not None and avg_score_data['avg_total']:
            average_score = round(
                (avg_score_data['avg_score'] / avg_score_data['avg_total']) * 100, 1
            )
        else:
            average_score = 0

        # Total learning time (from completed lessons)
        total_learning_minutes = completed_lessons_qs.select_related('lesson').aggregate(
            total=Sum('lesson__duration_minutes')
        )['total'] or 0

        # Lesson status breakdown
        enrolled_course_ids = list(enrollments.values_list('course_id', flat=True))

        completed_count = LessonProgress.objects.filter(
            student=user,
            lesson__module__course_id__in=enrolled_course_ids,
            is_completed=True
        ).count()

        # In Progress: uncompleted lessons in courses where student has started (progress > 0 and < 100)
        in_progress_course_ids = list(
            enrollments.filter(progress__gt=0, progress__lt=100).values_list('course_id', flat=True)
        )
        if in_progress_course_ids:
            total_in_progress_course_lessons = Lesson.objects.filter(
                module__course_id__in=in_progress_course_ids
            ).count()
            completed_in_in_progress = LessonProgress.objects.filter(
                student=user,
                lesson__module__course_id__in=in_progress_course_ids,
                is_completed=True
            ).count()
            in_progress_count = total_in_progress_course_lessons - completed_in_in_progress
        else:
            in_progress_count = 0

        # Not Started: lessons in courses where progress == 0
        not_started_course_ids = list(
            enrollments.filter(progress=0).values_list('course_id', flat=True)
        )
        not_started_count = Lesson.objects.filter(
            module__course_id__in=not_started_course_ids
        ).count() if not_started_course_ids else 0

        # Per-course progress
        course_progress = []
        for enrollment in enrollments:
            course = enrollment.course
            total = Lesson.objects.filter(module__course=course).count()
            done = LessonProgress.objects.filter(
                student=user, lesson__module__course=course, is_completed=True
            ).count()
            course_progress.append({
                'course_id': str(course.id),
                'course_title': course.title,
                'course_slug': course.slug,
                'instructor_name': course.instructor.get_full_name(),
                'category_color': course.category.color if course.category else None,
                'progress': round(enrollment.progress, 1),
                'total_lessons': total,
                'completed_lessons': done,
            })

        # Quiz scores — best score per quiz
        quiz_scores = []
        for enrollment in enrollments:
            course = enrollment.course
            tests = Test.objects.filter(course=course, is_active=True)
            for test in tests:
                best_attempt = TestAttempt.objects.filter(
                    student=user, test=test, is_submitted=True
                ).order_by('-score').first()
                if best_attempt:
                    score_pct = round(
                        (best_attempt.score / best_attempt.total_marks) * 100, 1
                    ) if best_attempt.total_marks > 0 else 0
                    quiz_scores.append({
                        'quiz_title': test.title,
                        'course_title': course.title,
                        'score': score_pct,
                        'total_marks': best_attempt.total_marks,
                        'marks_obtained': best_attempt.score,
                    })

        # Recent activity (last 10 items)
        recent_completions = LessonProgress.objects.filter(
            student=user, is_completed=True, completed_at__isnull=False
        ).select_related('lesson__module__course').order_by('-completed_at')[:10]

        recent_attempts = TestAttempt.objects.filter(
            student=user, is_submitted=True, submitted_at__isnull=False
        ).select_related('test__course').order_by('-submitted_at')[:10]

        activity_items = []
        for lp in recent_completions:
            activity_items.append({
                'type': 'lesson_complete',
                'text': f'Completed "{lp.lesson.title}" in {lp.lesson.module.course.title}',
                'timestamp': lp.completed_at.isoformat(),
            })
        for ta in recent_attempts:
            activity_items.append({
                'type': 'quiz_submit',
                'text': f'Scored {ta.score}/{ta.total_marks} on "{ta.test.title}" in {ta.test.course.title}',
                'timestamp': ta.submitted_at.isoformat(),
            })

        activity_items.sort(key=lambda x: x['timestamp'], reverse=True)
        activity_items = activity_items[:10]

        return Response({
            'stats': {
                'enrolled_courses': enrolled_courses,
                'completed_lessons': completed_lessons,
                'average_score': average_score,
                'total_learning_minutes': total_learning_minutes,
            },
            'lesson_status': {
                'completed': completed_count,
                'in_progress': in_progress_count,
                'not_started': max(not_started_count, 0),
            },
            'course_progress': course_progress,
            'quiz_scores': quiz_scores,
            'recent_activity': activity_items,
        })
