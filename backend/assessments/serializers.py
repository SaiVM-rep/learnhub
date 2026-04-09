from rest_framework import serializers
from .models import Test, Question, MCQOption, TestAttempt, Response


class MCQOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MCQOption
        fields = ['id', 'text', 'is_correct']


class StudentMCQOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MCQOption
        fields = ['id', 'text']


class QuestionSerializer(serializers.ModelSerializer):
    options = MCQOptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type', 'marks', 'difficulty', 'topic_tag', 'order', 'options']


class StudentQuestionSerializer(serializers.ModelSerializer):
    options = StudentMCQOptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'question_type', 'marks', 'order', 'options']


class TestSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Test
        fields = [
            'id', 'course', 'title', 'description', 'duration_minutes',
            'total_marks', 'passing_marks', 'is_active', 'questions',
            'question_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_question_count(self, obj):
        return obj.questions.count()


class StudentTestSerializer(serializers.ModelSerializer):
    questions = StudentQuestionSerializer(many=True, read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = Test
        fields = [
            'id', 'title', 'description', 'duration_minutes',
            'total_marks', 'passing_marks', 'questions', 'question_count'
        ]

    def get_question_count(self, obj):
        return obj.questions.count()


class StudentTestListSerializer(serializers.ModelSerializer):
    question_count = serializers.SerializerMethodField()
    has_attempted = serializers.SerializerMethodField()
    best_score = serializers.SerializerMethodField()

    class Meta:
        model = Test
        fields = [
            'id', 'title', 'description', 'duration_minutes',
            'total_marks', 'passing_marks', 'question_count',
            'has_attempted', 'best_score'
        ]

    def get_question_count(self, obj):
        return obj.questions.count()

    def get_has_attempted(self, obj):
        student = self.context.get('student')
        if student:
            return TestAttempt.objects.filter(
                test=obj, student=student, is_submitted=True
            ).exists()
        return False

    def get_best_score(self, obj):
        student = self.context.get('student')
        if student:
            attempt = TestAttempt.objects.filter(
                test=obj, student=student, is_submitted=True
            ).order_by('-score').first()
            return attempt.score if attempt else None
        return None


class TestAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestAttempt
        fields = ['id', 'test', 'started_at', 'submitted_at', 'score', 'total_marks', 'is_submitted']


class ResponseSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)
    selected_option_text = serializers.SerializerMethodField()
    correct_option = serializers.SerializerMethodField()

    class Meta:
        model = Response
        fields = [
            'id', 'question_text', 'selected_option_text',
            'correct_option', 'is_correct', 'marks_awarded'
        ]

    def get_selected_option_text(self, obj):
        return obj.selected_option.text if obj.selected_option else None

    def get_correct_option(self, obj):
        correct = obj.question.options.filter(is_correct=True).first()
        return correct.text if correct else None


class AttemptResultSerializer(serializers.ModelSerializer):
    responses = ResponseSerializer(many=True, read_only=True)
    test_title = serializers.CharField(source='test.title', read_only=True)
    passing_marks = serializers.IntegerField(source='test.passing_marks', read_only=True)
    passed = serializers.SerializerMethodField()

    class Meta:
        model = TestAttempt
        fields = [
            'id', 'test_title', 'started_at', 'submitted_at',
            'score', 'total_marks', 'passing_marks', 'passed',
            'is_submitted', 'responses'
        ]

    def get_passed(self, obj):
        if obj.score is not None:
            return obj.score >= obj.test.passing_marks
        return False
