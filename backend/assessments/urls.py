from django.urls import path
from . import views

# Student-facing quiz URLs (included in courses/urls.py)
student_urlpatterns = [
    path('<uuid:course_id>/quizzes/', views.StudentQuizListView.as_view(), name='student-quiz-list'),
    path('quiz/<uuid:quiz_id>/attempt/', views.StartQuizAttemptView.as_view(), name='start-quiz-attempt'),
    path('quiz/attempt/<uuid:attempt_id>/submit/', views.SubmitQuizView.as_view(), name='submit-quiz'),
    path('quiz/attempt/<uuid:attempt_id>/result/', views.QuizResultView.as_view(), name='quiz-result'),
]

# Instructor-facing quiz URLs (included in courses/instructor_urls.py)
instructor_urlpatterns = [
    path('courses/<uuid:course_pk>/quiz/', views.InstructorQuizCreateView.as_view(), name='instructor-quiz-create'),
    path('courses/<uuid:course_pk>/quizzes/', views.InstructorQuizListView.as_view(), name='instructor-quiz-list'),
    path('quiz/<uuid:pk>/', views.InstructorQuizDetailView.as_view(), name='instructor-quiz-detail'),
    path('quiz/<uuid:pk>/update/', views.InstructorQuizUpdateView.as_view(), name='instructor-quiz-update'),
    path('quiz/<uuid:pk>/delete/', views.InstructorQuizDeleteView.as_view(), name='instructor-quiz-delete'),
]
