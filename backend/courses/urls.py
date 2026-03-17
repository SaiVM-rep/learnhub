from django.urls import path
from . import views

urlpatterns = [
    path('categories/', views.CategoryListView.as_view(), name='category-list'),
    path('categories/create/', views.AdminCategoryCreateView.as_view(), name='category-create'),
    path('categories/<uuid:pk>/', views.AdminCategoryUpdateView.as_view(), name='category-update'),
    path('categories/<uuid:pk>/delete/', views.AdminCategoryDeleteView.as_view(), name='category-delete'),
    path('', views.CourseListView.as_view(), name='course-list'),
    path('enrollments/my/', views.MyEnrollmentsView.as_view(), name='my-enrollments'),
    path('<slug:slug>/', views.CourseDetailView.as_view(), name='course-detail'),
]
