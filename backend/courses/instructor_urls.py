from django.urls import path
from .instructor_views import (
    InstructorDashboardView,
    InstructorCourseListView,
    InstructorCourseCreateView,
    InstructorCourseUpdateView,
    InstructorCourseDeleteView,
    InstructorCourseTogglePublishView,
    InstructorCurriculumView,
    InstructorModuleCreateView,
    InstructorModuleUpdateView,
    InstructorModuleDeleteView,
    InstructorLessonCreateView,
    InstructorLessonUpdateView,
    InstructorLessonDeleteView,
    EnrollmentCreateView,
    EnrollmentCheckView,
    VideoMetadataView,
)
from assessments.urls import instructor_urlpatterns as quiz_instructor_urls

urlpatterns = [
    # Dashboard
    path('dashboard/', InstructorDashboardView.as_view(), name='instructor-dashboard'),

    # Course CRUD
    path('courses/', InstructorCourseListView.as_view(), name='instructor-course-list'),
    path('courses/create/', InstructorCourseCreateView.as_view(), name='instructor-course-create'),
    path('courses/<uuid:pk>/', InstructorCourseUpdateView.as_view(), name='instructor-course-update'),
    path('courses/<uuid:pk>/delete/', InstructorCourseDeleteView.as_view(), name='instructor-course-delete'),
    path('courses/<uuid:pk>/toggle-publish/', InstructorCourseTogglePublishView.as_view(), name='instructor-course-toggle-publish'),

    # Curriculum
    path('courses/<uuid:pk>/curriculum/', InstructorCurriculumView.as_view(), name='instructor-curriculum'),

    # Modules
    path('courses/<uuid:course_pk>/sections/', InstructorModuleCreateView.as_view(), name='instructor-module-create'),
    path('sections/<uuid:pk>/', InstructorModuleUpdateView.as_view(), name='instructor-module-update'),
    path('sections/<uuid:pk>/delete/', InstructorModuleDeleteView.as_view(), name='instructor-module-delete'),

    # Lessons
    path('sections/<uuid:module_pk>/lessons/', InstructorLessonCreateView.as_view(), name='instructor-lesson-create'),
    path('lessons/<uuid:pk>/', InstructorLessonUpdateView.as_view(), name='instructor-lesson-update'),
    path('lessons/<uuid:pk>/delete/', InstructorLessonDeleteView.as_view(), name='instructor-lesson-delete'),

    # YouTube duration auto-detect
    path('video-metadata/', VideoMetadataView.as_view(), name='instructor-video-metadata'),
] + quiz_instructor_urls

# Enrollment endpoints (separate — not under /instructor/ prefix)
enrollment_urlpatterns = [
    path('', EnrollmentCreateView.as_view(), name='enrollment-create'),
    path('check/<uuid:course_id>/', EnrollmentCheckView.as_view(), name='enrollment-check'),
]
