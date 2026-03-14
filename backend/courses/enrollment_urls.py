from django.urls import path
from .instructor_views import EnrollmentCreateView, EnrollmentCheckView

urlpatterns = [
    path('', EnrollmentCreateView.as_view(), name='enrollment-create'),
    path('check/<uuid:course_id>/', EnrollmentCheckView.as_view(), name='enrollment-check'),
]
