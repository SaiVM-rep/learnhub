from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import ChatSession, ChatMessage

User = get_user_model()


@override_settings(GROQ_API_KEY='test-key')
class ChatbotMessageViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        self.url = '/api/chatbot/message/'

    def test_unauthenticated_returns_401(self):
        unauth = APIClient()
        res = unauth.post(self.url, {'message': 'Hello'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empty_message_returns_400(self):
        res = self.client.post(self.url, {'message': ''}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_message_field_returns_400(self):
        res = self.client.post(self.url, {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('chatbot.views.Groq')
    def test_valid_message_returns_200_and_creates_db_records(self, mock_groq):
        # Mock: Groq client
        mock_client = MagicMock()
        mock_groq.return_value = mock_client
        mock_completion = MagicMock()
        mock_completion.choices[0].message.content = 'This is a test AI reply from Gemini.'
        mock_client.chat.completions.create.return_value = mock_completion

        res = self.client.post(
            self.url, {'message': 'What is a Django model?'}, format='json'
        )

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['reply'], 'This is a test AI reply from Gemini.')
        self.assertIn('session_id', res.data)

        # Verify database records
        sessions = ChatSession.objects.filter(user=self.user)
        self.assertEqual(sessions.count(), 1)

        msgs = ChatMessage.objects.filter(session=sessions.first()).order_by('created_at')
        self.assertEqual(msgs.count(), 2)
        self.assertEqual(msgs[0].role, 'USER')
        self.assertEqual(msgs[0].content, 'What is a Django model?')
        self.assertEqual(msgs[1].role, 'BOT')
        self.assertEqual(msgs[1].content, 'This is a test AI reply from Gemini.')

    @patch('chatbot.views.Groq')
    def test_second_message_reuses_existing_session(self, mock_groq):
        mock_client = MagicMock()
        mock_groq.return_value = mock_client
        mock_completion = MagicMock()
        mock_completion.choices[0].message.content = 'Reply.'
        mock_client.chat.completions.create.return_value = mock_completion

        self.client.post(self.url, {'message': 'First'}, format='json')
        self.client.post(self.url, {'message': 'Second'}, format='json')

        self.assertEqual(ChatSession.objects.filter(user=self.user).count(), 1)
        self.assertEqual(ChatMessage.objects.count(), 4)  # 2 user + 2 bot


@override_settings(GROQ_API_KEY='test-key')
class ChatbotHistoryViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='histuser', email='hist@example.com', password='pass123'
        )
        self.client.force_authenticate(user=self.user)
        self.history_url = '/api/chatbot/history/'
        self.message_url = '/api/chatbot/message/'

    def test_empty_history_for_new_user(self):
        res = self.client.get(self.history_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['messages'], [])
        self.assertIsNone(res.data['session_id'])

    @patch('chatbot.views.Groq')
    def test_history_returns_messages_after_chat(self, mock_groq):
        mock_client = MagicMock()
        mock_groq.return_value = mock_client
        mock_completion = MagicMock()
        mock_completion.choices[0].message.content = 'AI says hi.'
        mock_client.chat.completions.create.return_value = mock_completion

        self.client.post(self.message_url, {'message': 'Hi'}, format='json')

        res = self.client.get(self.history_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['messages']), 2)
        self.assertEqual(res.data['messages'][0]['role'], 'USER')
        self.assertEqual(res.data['messages'][1]['role'], 'BOT')
        self.assertIsNotNone(res.data['session_id'])
