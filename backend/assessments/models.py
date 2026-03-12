import uuid
from django.db import models
from django.conf import settings


class Test(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='tests')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField(default=30)
    total_marks = models.PositiveIntegerField(default=100)
    passing_marks = models.PositiveIntegerField(default=40)
    is_active = models.BooleanField(default=True)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tests'

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Question(models.Model):
    QUESTION_TYPES = [
        ('MCQ', 'Multiple Choice'),
        ('DESCRIPTIVE', 'Descriptive'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='MCQ')
    marks = models.PositiveIntegerField(default=1)
    difficulty = models.CharField(max_length=20, choices=[
        ('EASY', 'Easy'), ('MEDIUM', 'Medium'), ('HARD', 'Hard')
    ], default='MEDIUM')
    topic_tag = models.CharField(max_length=100, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'questions'
        ordering = ['order']


class MCQOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)

    class Meta:
        db_table = 'mcq_options'


class TestAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='test_attempts')
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    score = models.FloatField(null=True, blank=True)
    total_marks = models.PositiveIntegerField(default=0)
    is_submitted = models.BooleanField(default=False)

    class Meta:
        db_table = 'test_attempts'


class Response(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE, related_name='responses')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.ForeignKey(MCQOption, on_delete=models.SET_NULL, null=True, blank=True)
    text_response = models.TextField(blank=True)
    is_correct = models.BooleanField(null=True)
    marks_awarded = models.FloatField(default=0)
    ai_evaluation = models.TextField(blank=True)

    class Meta:
        db_table = 'responses'
