import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { chatbotAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * LearningChatbot — floating AI chat widget.
 *
 * Architecture adapted from Wolox/react-chat-widget (MIT):
 *   Launcher (FAB toggle) + Conversation (header, messages, sender)
 *
 * Uses Google Gemini 1.5 Flash via our Django backend.
 */

/* ───────────────── Typing Indicator ───────────────── */
const TypingIndicator = () => (
  <div style={s.botMsgRow}>
    <div style={s.botMsgAvatar}>
      <Bot size={14} color="white" />
    </div>
    <div style={s.botBubble}>
      <div style={s.typingWrap}>
        <span className="cb-dot" style={{ ...s.typingDot, animationDelay: '0s' }} />
        <span className="cb-dot" style={{ ...s.typingDot, animationDelay: '0.2s' }} />
        <span className="cb-dot" style={{ ...s.typingDot, animationDelay: '0.4s' }} />
      </div>
    </div>
  </div>
);

/* ───────────────── Single Message Bubble ───────────────── */
const ChatBubble = ({ msg }) => {
  const isUser = msg.role === 'USER';
  return (
    <div style={isUser ? s.userMsgRow : s.botMsgRow}>
      {!isUser && (
        <div style={s.botMsgAvatar}>
          <Bot size={14} color="white" />
        </div>
      )}
      <div style={isUser ? s.userBubble : s.botBubble}>
        {msg.content}
      </div>
      {isUser && (
        <div style={s.userMsgAvatar}>
          <User size={14} color="white" />
        </div>
      )}
    </div>
  );
};

/* ───────────────── Main Component ───────────────── */
const LearningChatbot = ({ courseId = null }) => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  /* ── auto-scroll ── */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isLoading, scrollToBottom]);

  /* ── load history on first open ── */
  useEffect(() => {
    if (isOpen && isAuthenticated && !historyLoaded) {
      loadHistory();
    }
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadHistory = async () => {
    try {
      const res = await chatbotAPI.getHistory(courseId);
      const mapped = (res.data.messages || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      }));
      if (mapped.length > 0) {
        setMessages(mapped);
      } else {
        setMessages([welcomeMsg()]);
      }
    } catch {
      setMessages([welcomeMsg()]);
    }
    setHistoryLoaded(true);
  };

  const welcomeMsg = () => ({
    id: 'welcome',
    role: 'BOT',
    content:
      "Hi! I'm your AI learning assistant powered by Gemini. " +
      'Ask me anything about this course — I\'m here to help you learn!',
  });

  /* ── send message ── */
  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    const userMsg = { id: `u-${Date.now()}`, role: 'USER', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await chatbotAPI.sendMessage(trimmed, courseId);
      const botMsg = {
        id: `b-${Date.now()}`,
        role: 'BOT',
        content: res.data.reply,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errText =
        err.response?.data?.error || 'Something went wrong. Please try again.';
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: 'BOT', content: `⚠️ ${errText}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── unauthenticated state ── */
  if (!isAuthenticated) {
    return (
      <div style={s.fab} title="Login to use the AI assistant">
        <button
          style={{ ...s.fabButton, background: 'var(--gray-400)', cursor: 'not-allowed' }}
          disabled
        >
          <MessageCircle size={24} color="white" />
        </button>
      </div>
    );
  }

  /* ── render ── */
  return (
    <>
      {/* Injected keyframe animations */}
      <style>{`
        @keyframes cbTypingBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes cbSpin {
          to { transform: rotate(360deg); }
        }
        .cb-dot { animation: cbTypingBounce 1.4s ease-in-out infinite; }
        .cb-input:focus {
          outline: none;
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .cb-send:hover:not(:disabled) {
          background: var(--primary-dark) !important;
          transform: scale(1.05);
        }
        .cb-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .cb-fab:hover {
          transform: scale(1.08);
          box-shadow: 0 8px 24px rgba(99,102,241,0.45) !important;
        }
        .cb-messages::-webkit-scrollbar { width: 5px; }
        .cb-messages::-webkit-scrollbar-track { background: transparent; }
        .cb-messages::-webkit-scrollbar-thumb {
          background: var(--gray-300); border-radius: 10px;
        }
      `}</style>

      {/* ── Launcher FAB (Wolox pattern: icon swap on toggle) ── */}
      <div style={s.fab}>
        <button
          className="cb-fab"
          style={s.fabButton}
          onClick={() => setIsOpen((prev) => !prev)}
          title={isOpen ? 'Close AI Assistant' : 'Open AI Learning Assistant'}
        >
          {isOpen ? (
            <X size={24} color="white" />
          ) : (
            <MessageCircle size={24} color="white" />
          )}
        </button>
      </div>

      {/* ── Chat Window (Wolox pattern: Conversation container) ── */}
      {isOpen && (
        <div style={s.chatWindow}>
          {/* Header */}
          <div style={s.chatHeader}>
            <div style={s.chatHeaderLeft}>
              <div style={s.headerAvatar}>
                <Sparkles size={18} color="white" />
              </div>
              <div>
                <div style={s.headerTitle}>AI Learning Assistant</div>
                <div style={s.headerSub}>Powered by Gemini</div>
              </div>
            </div>
            <button
              style={s.closeBtn}
              onClick={() => setIsOpen(false)}
              title="Close"
            >
              <X size={16} color="rgba(255,255,255,0.8)" />
            </button>
          </div>

          {/* Messages (Wolox pattern: Messages component with scroll ref) */}
          <div className="cb-messages" style={s.messagesContainer}>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Sender (Wolox pattern: input + submit button) */}
          <div style={s.inputArea}>
            <textarea
              ref={inputRef}
              className="cb-input"
              style={s.input}
              placeholder="Ask me anything about this course..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />
            <button
              className="cb-send"
              style={s.sendBtn}
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              title="Send message"
            >
              {isLoading ? (
                <Loader2
                  size={18}
                  color="white"
                  style={{ animation: 'cbSpin 1s linear infinite' }}
                />
              ) : (
                <Send size={18} color="white" />
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════════
   Styles — all inline, uses project CSS custom props
   ═══════════════════════════════════════════════════ */
const s = {
  /* ── FAB ── */
  fab: {
    position: 'fixed',
    bottom: 28,
    right: 28,
    zIndex: 1000,
  },
  fabButton: {
    width: 58,
    height: 58,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },

  /* ── Chat window ── */
  chatWindow: {
    position: 'fixed',
    bottom: 100,
    right: 28,
    width: 380,
    maxHeight: 540,
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 999,
    border: '1px solid var(--gray-200)',
  },

  /* ── Header ── */
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
    flexShrink: 0,
  },
  chatHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontWeight: 700,
    fontSize: '0.938rem',
    lineHeight: 1.2,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: '0.75rem',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: '50%',
    width: 30,
    height: 30,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },

  /* ── Messages area ── */
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    background: 'var(--gray-50)',
    minHeight: 280,
    maxHeight: 360,
  },

  /* ── Message rows ── */
  botMsgRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
  },
  userMsgRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 8,
  },
  botMsgAvatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userMsgAvatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'var(--gray-400)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  /* ── Bubbles ── */
  botBubble: {
    background: 'var(--white)',
    border: '1px solid var(--gray-200)',
    borderRadius: '4px 14px 14px 14px',
    padding: '10px 14px',
    fontSize: '0.875rem',
    color: 'var(--gray-800)',
    lineHeight: 1.6,
    maxWidth: '78%',
    wordBreak: 'break-word',
    boxShadow: 'var(--shadow-sm)',
  },
  userBubble: {
    background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
    borderRadius: '14px 14px 4px 14px',
    padding: '10px 14px',
    fontSize: '0.875rem',
    color: 'white',
    lineHeight: 1.6,
    maxWidth: '78%',
    wordBreak: 'break-word',
  },

  /* ── Typing indicator ── */
  typingWrap: {
    display: 'flex',
    gap: 5,
    alignItems: 'center',
    padding: '4px 6px',
  },
  typingDot: {
    display: 'inline-block',
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--gray-400)',
  },

  /* ── Sender / input area ── */
  inputArea: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    padding: '12px 14px',
    borderTop: '1px solid var(--gray-200)',
    background: 'var(--white)',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    border: '1.5px solid var(--gray-300)',
    borderRadius: 'var(--radius)',
    padding: '10px 12px',
    fontSize: '0.875rem',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    color: 'var(--gray-800)',
    background: 'var(--gray-50)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 'var(--radius)',
    background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.2s, transform 0.15s',
  },
};

export default LearningChatbot;
