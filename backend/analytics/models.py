import uuid
from django.db import models
from django.conf import settings


class StudentAnalytics(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='analytics')
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='student_analytics')
    overall_score = models.FloatField(default=0.0)
    weak_areas = models.JSONField(default=list)
    strong_areas = models.JSONField(default=list)
    predicted_grade = models.CharField(max_length=5, blank=True)
    topic_scores = models.JSONField(default=dict)
    trend_data = models.JSONField(default=list)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_analytics'
        unique_together = ['student', 'course']


class Recommendation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recommendations')
    recommended_course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, null=True, blank=True)
    recommended_topic = models.CharField(max_length=255, blank=True)
    reason = models.TextField(blank=True)
    priority = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'recommendations'
        ordering = ['-priority']
