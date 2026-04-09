from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from django.db import transaction

from .models import Test, Question, MCQOption, TestAttempt, Response as QuizResponse
from .serializers import (
    TestSerializer, StudentTestSerializer, StudentTestListSerializer,
    TestAttemptSerializer, AttemptResultSerializer
)
from courses.models import Course, Enrollment
from courses.permissions import IsInstructor

MAX_QUIZZES_PER_COURSE = 5


# ──────────────────────────────────────────────
# INSTRUCTOR VIEWS
# ──────────────────────────────────────────────

class InstructorQuizCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsInstructor]

    def post(self, request, course_pk):
        try:
            course = Course.objects.get(id=course_pk, instructor=request.user)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found or not owned by you'}, status=status.HTTP_404_NOT_FOUND)

        existing_count = Test.objects.filter(course=course).count()
        if existing_count >= MAX_QUIZZES_PER_COURSE:
            return Response(
                {'error': f'Maximum {MAX_QUIZZES_PER_COURSE} quizzes per course reached'},
                status=status.HTTP_400_BAD_REQUEST
            )

        data = request.data
        questions_data = data.get('questions', [])

        if len(questions_data) != 10:
            return Response({'error': 'Exactly 10 questions are required'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            test = Test.objects.create(
                course=course,
                title=data.get('title', 'Course Quiz'),
                description=data.get('description', ''),
                duration_minutes=data.get('duration_minutes', 15),
                total_marks=10,
                passing_marks=4,
                is_active=True
            )

            for i, q_data in enumerate(questions_data):
                options_data = q_data.get('options', [])
                if len(options_data) < 2:
                    raise ValueError(f'Question {i+1} must have at least 2 options')

                question = Question.objects.create(
                    test=test,
                    text=q_data.get('text', ''),
                    question_type='MCQ',
                    marks=1,
                    difficulty=q_data.get('difficulty', 'MEDIUM'),
                    topic_tag=q_data.get('topic_tag', ''),
                    order=i
                )

                for opt_data in options_data:
                    MCQOption.objects.create(
                        question=question,
                        text=opt_data.get('text', ''),
                        is_correct=opt_data.get('is_correct', False)
                    )

        serializer = TestSerializer(test)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class InstructorQuizListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsInstructor]

    def get(self, request, course_pk):
        try:
            course = Course.objects.get(id=course_pk, instructor=request.user)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found or not owned by you'}, status=status.HTTP_404_NOT_FOUND)

        quizzes = Test.objects.filter(course=course).prefetch_related('questions__options')
        serializer = TestSerializer(quizzes, many=True)
        return Response(serializer.data)


class InstructorQuizDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsInstructor]

    def get(self, request, pk):
        try:
            test = Test.objects.prefetch_related('questions__options').get(
                id=pk, course__instructor=request.user
            )
        except Test.DoesNotExist:
            return Response({'error': 'Quiz not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TestSerializer(test)
        return Response(serializer.data)


class InstructorQuizUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsInstructor]

    def patch(self, request, pk):
        try:
            test = Test.objects.get(id=pk, course__instructor=request.user)
        except Test.DoesNotExist:
            return Response({'error': 'Quiz not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        questions_data = data.get('questions', None)

        with transaction.atomic():
            test.title = data.get('title', test.title)
            test.description = data.get('description', test.description)
            test.duration_minutes = data.get('duration_minutes', test.duration_minutes)
            test.save()

            if questions_data is not None:
                if len(questions_data) != 10:
                    return Response({'error': 'Exactly 10 questions are required'}, status=status.HTTP_400_BAD_REQUEST)

                test.questions.all().delete()

                for i, q_data in enumerate(questions_data):
                    options_data = q_data.get('options', [])
                    question = Question.objects.create(
                        test=test,
                        text=q_data.get('text', ''),
                        question_type='MCQ',
                        marks=1,
                        difficulty=q_data.get('difficulty', 'MEDIUM'),
                        topic_tag=q_data.get('topic_tag', ''),
                        order=i
                    )
                    for opt_data in options_data:
                        MCQOption.objects.create(
                            question=question,
                            text=opt_data.get('text', ''),
                            is_correct=opt_data.get('is_correct', False)
                        )

        serializer = TestSerializer(Test.objects.prefetch_related('questions__options').get(id=pk))
        return Response(serializer.data)


class InstructorQuizDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsInstructor]

    def delete(self, request, pk):
        try:
            test = Test.objects.get(id=pk, course__instructor=request.user)
        except Test.DoesNotExist:
            return Response({'error': 'Quiz not found'}, status=status.HTTP_404_NOT_FOUND)

        test.delete()
        return Response({'deleted': True}, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────
# STUDENT VIEWS
# ──────────────────────────────────────────────

class StudentQuizListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)

        # Allow course instructor to view their own quizzes without enrollment
        is_owner = course.instructor == request.user
        if not is_owner:
            enrolled = Enrollment.objects.filter(
                student=request.user, course=course, is_active=True
            ).exists()
            if not enrolled:
                return Response({'error': 'Not enrolled in this course'}, status=status.HTTP_403_FORBIDDEN)

        quizzes = Test.objects.filter(course=course, is_active=True).prefetch_related('questions__options')
        serializer = StudentTestListSerializer(
            quizzes, many=True, context={'student': request.user}
        )
        return Response(serializer.data)


class StartQuizAttemptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, quiz_id):
        try:
            test = Test.objects.get(id=quiz_id, is_active=True)
        except Test.DoesNotExist:
            return Response({'error': 'Quiz not found'}, status=status.HTTP_404_NOT_FOUND)

        enrolled = Enrollment.objects.filter(
            student=request.user, course=test.course, is_active=True
        ).exists()
        if not enrolled:
            return Response({'error': 'Not enrolled in this course'}, status=status.HTTP_403_FORBIDDEN)

        # Return existing unsubmitted attempt if any
        existing = TestAttempt.objects.filter(
            test=test, student=request.user, is_submitted=False
        ).first()
        if existing:
            quiz_data = StudentTestSerializer(test).data
            return Response({
                'attempt': TestAttemptSerializer(existing).data,
                'quiz': quiz_data
            })

        attempt = TestAttempt.objects.create(
            test=test,
            student=request.user,
            total_marks=test.total_marks
        )
        quiz_data = StudentTestSerializer(test).data
        return Response({
            'attempt': TestAttemptSerializer(attempt).data,
            'quiz': quiz_data
        }, status=status.HTTP_201_CREATED)


class SubmitQuizView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, attempt_id):
        try:
            attempt = TestAttempt.objects.select_related('test').get(
                id=attempt_id, student=request.user
            )
        except TestAttempt.DoesNotExist:
            return Response({'error': 'Attempt not found'}, status=status.HTTP_404_NOT_FOUND)

        if attempt.is_submitted:
            return Response({'error': 'This attempt has already been submitted'}, status=status.HTTP_400_BAD_REQUEST)

        answers = request.data.get('answers', [])
        total_score = 0

        with transaction.atomic():
            for answer in answers:
                question_id = answer.get('question_id')
                selected_option_id = answer.get('selected_option_id')

                try:
                    question = Question.objects.get(id=question_id, test=attempt.test)
                except Question.DoesNotExist:
                    continue

                selected_option = None
                is_correct = False
                marks = 0

                if selected_option_id:
                    try:
                        selected_option = MCQOption.objects.get(
                            id=selected_option_id, question=question
                        )
                        is_correct = selected_option.is_correct
                        marks = question.marks if is_correct else 0
                    except MCQOption.DoesNotExist:
                        pass

                QuizResponse.objects.create(
                    attempt=attempt,
                    question=question,
                    selected_option=selected_option,
                    is_correct=is_correct,
                    marks_awarded=marks
                )
                total_score += marks

            attempt.score = total_score
            attempt.total_marks = attempt.test.total_marks
            attempt.is_submitted = True
            attempt.submitted_at = timezone.now()
            attempt.save()

        result = TestAttempt.objects.prefetch_related(
            'responses__question__options', 'responses__selected_option'
        ).select_related('test').get(id=attempt_id)

        serializer = AttemptResultSerializer(result)
        return Response(serializer.data)


class QuizResultView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, attempt_id):
        try:
            attempt = TestAttempt.objects.prefetch_related(
                'responses__question__options', 'responses__selected_option'
            ).select_related('test').get(
                id=attempt_id, student=request.user, is_submitted=True
            )
        except TestAttempt.DoesNotExist:
            return Response({'error': 'Result not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AttemptResultSerializer(attempt)
        return Response(serializer.data)
