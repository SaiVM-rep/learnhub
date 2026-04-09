from rest_framework import serializers
from .models import Category, Course, Module, Lesson, Enrollment, Review, LessonProgress
from core.serializers import UserSerializer


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'color']


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ['id', 'title', 'lesson_type', 'duration_minutes', 'order', 'is_preview', 'video_url', 'content']


class ModuleSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    lesson_count = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ['id', 'title', 'description', 'order', 'lessons', 'lesson_count']

    def get_lesson_count(self, obj):
        return obj.lessons.count()


class CourseListSerializer(serializers.ModelSerializer):
    instructor_name = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    category_color = serializers.SerializerMethodField()
    enrollment_count = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'short_description', 'instructor',
            'instructor_name', 'category', 'category_name', 'category_color',
            'price', 'thumbnail', 'duration_hours', 'difficulty', 'is_featured',
            'enrollment_count', 'average_rating', 'created_at'
        ]

    def get_instructor_name(self, obj):
        return obj.instructor.get_full_name()

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_category_color(self, obj):
        return obj.category.color if obj.category else None


class CourseDetailSerializer(serializers.ModelSerializer):
    instructor = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    modules = ModuleSerializer(many=True, read_only=True)
    enrollment_count = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()
    is_enrolled = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'description', 'short_description',
            'instructor', 'category', 'price', 'thumbnail',
            'duration_hours', 'difficulty', 'is_featured', 'is_active',
            'enrollment_count', 'average_rating', 'review_count',
            'is_enrolled', 'modules', 'created_at'
        ]

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Enrollment.objects.filter(student=request.user, course=obj, is_active=True).exists()
        return False

    def get_review_count(self, obj):
        return obj.reviews.count()


class EnrollmentSerializer(serializers.ModelSerializer):
    course = CourseListSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = ['id', 'course', 'enrolled_at', 'valid_until', 'progress', 'is_active', 'completed_at']


class ReviewSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'course', 'rating', 'comment', 'student_name', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_student_name(self, obj):
        return obj.student.get_full_name()


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = ['id', 'lesson', 'is_completed', 'completed_at', 'watched_duration']
        read_only_fields = ['id', 'completed_at']
