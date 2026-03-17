import uuid
from django.db import models
from django.conf import settings


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(
        max_length=100, blank=True,
        default='linear-gradient(135deg, #6366f1, #8b5cf6)',
        help_text='CSS gradient for course cards, e.g. linear-gradient(135deg, #6366f1, #8b5cf6)'
    )

    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField()
    short_description = models.CharField(max_length=500, blank=True)
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='courses_teaching', limit_choices_to={'role': 'INSTRUCTOR'}
    )
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='courses')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    thumbnail = models.ImageField(upload_to='course_thumbnails/', blank=True, null=True)
    duration_hours = models.PositiveIntegerField(default=0)
    difficulty = models.CharField(max_length=20, choices=[
        ('BEGINNER', 'Beginner'),
        ('INTERMEDIATE', 'Intermediate'),
        ('ADVANCED', 'Advanced'),
    ], default='BEGINNER')
    is_active = models.BooleanField(default=True)
    is_published = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'courses'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def enrollment_count(self):
        return self.enrollments.filter(is_active=True).count()

    @property
    def average_rating(self):
        avg = self.reviews.aggregate(models.Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else 0

    @property
    def total_lessons(self):
        return Lesson.objects.filter(module__course=self).count()

    @property
    def total_duration_minutes(self):
        return Lesson.objects.filter(module__course=self).aggregate(
            total=models.Sum('duration_minutes')
        )['total'] or 0

    @property
    def revenue(self):
        return float(self.price) * self.enrollment_count


class Module(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'modules'
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Lesson(models.Model):
    LESSON_TYPES = [
        ('VIDEO', 'Video'),
        ('TEXT', 'Text'),
        ('QUIZ', 'Quiz'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)
    lesson_type = models.CharField(max_length=20, choices=LESSON_TYPES, default='VIDEO')
    video_url = models.URLField(blank=True)
    duration_minutes = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=0)
    is_preview = models.BooleanField(default=False)

    class Meta:
        db_table = 'lessons'
        ordering = ['order']

    def __str__(self):
        return f"{self.module.title} - {self.title}"


class Enrollment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollments'
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    progress = models.FloatField(default=0.0)
    is_active = models.BooleanField(default=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'enrollments'
        unique_together = ['student', 'course']

    def __str__(self):
        return f"{self.student.email} enrolled in {self.course.title}"


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='reviews')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reviews'
        unique_together = ['course', 'student']
