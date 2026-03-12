from django.urls import path
from . import views

urlpatterns = [
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/refresh/', views.token_refresh_view, name='token-refresh'),
    path('auth/profile/', views.UserProfileView.as_view(), name='profile'),
]
