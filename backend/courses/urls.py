from django.urls import path
from . import views

urlpatterns = [
    path('categories/', views.CategoryListView.as_view(), name='category-list'),
    path('', views.CourseListView.as_view(), name='course-list'),
    path('<slug:slug>/', views.CourseDetailView.as_view(), name='course-detail'),
    path('enrollments/my/', views.MyEnrollmentsView.as_view(), name='my-enrollments'),
]
