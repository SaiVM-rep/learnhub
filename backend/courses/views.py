from rest_framework import generics, permissions
from django.db.models import Q
from .models import Category, Course, Enrollment
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
