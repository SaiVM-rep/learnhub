from django.urls import path
from .views import ChatbotMessageView, ChatbotHistoryView

urlpatterns = [
    path('message/', ChatbotMessageView.as_view(), name='chatbot-message'),
    path('history/', ChatbotHistoryView.as_view(), name='chatbot-history'),
]
