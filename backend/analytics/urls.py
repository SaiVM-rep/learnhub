from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.StudentDashboardAnalyticsView.as_view(), name='student-analytics-dashboard'),
]
