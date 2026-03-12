from groq import Groq
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import ChatSession, ChatMessage

try:
    from courses.models import Course
    COURSES_AVAILABLE = True
except ImportError:
    COURSES_AVAILABLE = False


class ChatbotMessageView(APIView):
    """POST /api/chatbot/message/
    Body: { message: str, course_id: str (optional slug) }
    Returns: { reply: str, session_id: str }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message_content = request.data.get('message', '').strip()
        course_id = request.data.get('course_id', None)

        if not message_content:
            return Response(
                {'error': 'Message cannot be empty.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Resolve course if provided
        course = None
        session_filter = {'user': request.user}
        if course_id and COURSES_AVAILABLE:
            try:
                course = Course.objects.get(slug=course_id)
                session_filter['course'] = course
            except Course.DoesNotExist:
                pass

        # Get most recent session or create a new one
        session = ChatSession.objects.filter(
            **session_filter
        ).order_by('-updated_at').first()

        if not session:
            create_kwargs = {'user': request.user}
            if course:
                create_kwargs['course'] = course
            session = ChatSession.objects.create(**create_kwargs)

        # Persist user message
        ChatMessage.objects.create(
            session=session,
            role='USER',
            content=message_content
        )

        # Build conversation history for Groq (last 20 messages)
        history = list(
            ChatMessage.objects.filter(session=session)
            .order_by('created_at')[:20]
        )

        groq_messages = []
        
        # Build system instruction
        system_instruction = (
            'You are a helpful and encouraging AI learning assistant for an '
            'online education platform. Your role is to help students '
            'understand course material, answer their questions clearly, '
            'explain complex concepts in simple terms, and guide them through '
            'their learning journey. Be concise, friendly, and accurate. '
            'If you are unsure, say so honestly.'
        )
        if course:
            desc_snippet = (course.description or '')[:400]
            system_instruction += (
                f' The student is currently studying: "{course.title}". '
                f'Course description: {desc_snippet}'
            )

        groq_messages.append({'role': 'system', 'content': system_instruction})

        for msg in history[:-1]:  # all messages except the latest user message
            role = 'user' if msg.role == 'USER' else 'assistant'
            groq_messages.append({
                'role': role,
                'content': msg.content
            })
            
        # Append the current user message
        groq_messages.append({
            'role': 'user',
            'content': message_content
        })

        # Injecting Groq API Key explicitly as requested
        api_key = getattr(settings, 'GROQ_API_KEY', None)
        if not api_key:
            return Response(
                {'error': 'AI service is not configured. Please contact support.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Call Groq API
        try:
            client = Groq(api_key=api_key)

            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=groq_messages,
                temperature=0.7,
                max_tokens=1024,
            )
            ai_reply = completion.choices[0].message.content
        except Exception as exc:
            return Response(
                {'error': f'AI service error: {str(exc)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Persist AI reply
        ChatMessage.objects.create(
            session=session,
            role='BOT',
            content=ai_reply
        )

        # Touch the session updated_at
        session.save()

        return Response(
            {'reply': ai_reply, 'session_id': str(session.id)},
            status=status.HTTP_200_OK
        )



class ChatbotHistoryView(APIView):
    """GET /api/chatbot/history/?course_id=<slug>
    Returns: { messages: [...], session_id: str | null }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        course_id = request.query_params.get('course_id', None)

        session_filter = {'user': request.user}
        if course_id and COURSES_AVAILABLE:
            try:
                course = Course.objects.get(slug=course_id)
                session_filter['course'] = course
            except Course.DoesNotExist:
                pass

        session = ChatSession.objects.filter(
            **session_filter
        ).order_by('-updated_at').first()

        if not session:
            return Response({'messages': [], 'session_id': None})

        messages = ChatMessage.objects.filter(
            session=session
        ).order_by('created_at')

        data = [
            {
                'id': str(m.id),
                'role': m.role,
                'content': m.content,
                'created_at': m.created_at.isoformat()
            }
            for m in messages
        ]

        return Response({'messages': data, 'session_id': str(session.id)})
