from rest_framework import serializers
from .models import Course, Module, Lesson, Category, Enrollment
from django.utils.text import slugify


class InstructorLessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = [
            'id', 'title', 'lesson_type', 'video_url',
            'duration_minutes', 'order', 'is_preview', 'content',
        ]
        read_only_fields = ['id']


class InstructorModuleSerializer(serializers.ModelSerializer):
    lessons = InstructorLessonSerializer(many=True, read_only=True)
    lesson_count = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ['id', 'title', 'description', 'order', 'lessons', 'lesson_count']
        read_only_fields = ['id']

    def get_lesson_count(self, obj):
        return obj.lessons.count()


class InstructorCourseListSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    enrollment_count = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()
    total_lessons = serializers.ReadOnlyField()
    revenue = serializers.ReadOnlyField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'short_description', 'category',
            'category_name', 'price', 'thumbnail', 'duration_hours',
            'difficulty', 'is_published', 'is_featured', 'enrollment_count',
            'average_rating', 'total_lessons', 'revenue', 'created_at',
        ]

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None


class InstructorCourseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            'title', 'description', 'short_description', 'category',
            'price', 'thumbnail', 'duration_hours', 'difficulty',
        ]

    def create(self, validated_data):
        user = self.context['request'].user
        title = validated_data['title']
        base_slug = slugify(title)
        slug = base_slug
        counter = 1
        while Course.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        validated_data['slug'] = slug
        validated_data['instructor'] = user
        validated_data['is_published'] = False
        return super().create(validated_data)


class InstructorCourseUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = [
            'title', 'description', 'short_description', 'category',
            'price', 'thumbnail', 'duration_hours', 'difficulty',
            'is_published', 'is_featured',
        ]


class InstructorCurriculumSerializer(serializers.ModelSerializer):
    """Full course detail with nested modules and lessons for the curriculum editor."""
    modules = InstructorModuleSerializer(many=True, read_only=True)
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'slug', 'description', 'short_description',
            'category', 'category_name', 'price', 'thumbnail',
            'duration_hours', 'difficulty', 'is_published', 'modules',
        ]

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None


class InstructorDashboardStatsSerializer(serializers.Serializer):
    total_courses = serializers.IntegerField()
    published_courses = serializers.IntegerField()
    draft_courses = serializers.IntegerField()
    total_students = serializers.IntegerField()
    total_revenue = serializers.FloatField()
    average_rating = serializers.FloatField()
