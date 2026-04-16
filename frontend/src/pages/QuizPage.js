import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { quizAPI, courseAPI } from '../services/api';
import {
  Clock, CheckCircle, XCircle, ArrowLeft, Award, AlertCircle
} from 'lucide-react';

const QuizPage = () => {
  const { slug, quizId } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading'); // loading, ready, taking, submitted
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const startQuiz = async () => {
      try {
        const res = await quizAPI.startAttempt(quizId);
        setQuiz(res.data.quiz);
        setAttempt(res.data.attempt);
        setTimeLeft(res.data.quiz.duration_minutes * 60);
        setPhase('ready');
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load quiz');
        setPhase('ready');
      }
    };
    startQuiz();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [quizId]);

  const beginQuiz = () => {
    setPhase('taking');
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSelectOption = (questionId, optionId) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const answerList = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
      question_id: questionId,
      selected_option_id: selectedOptionId,
    }));

    try {
      const res = await quizAPI.submitAttempt(attempt.id, answerList);
      setResult(res.data);
      setPhase('submitted');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit quiz');
    }
    setSubmitting(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = quiz?.questions?.length || 0;

  if (error && !quiz) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
        <h2 style={{ marginBottom: 8 }}>Unable to Load Quiz</h2>
        <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>{error}</p>
        <Link to={`/courses/${slug}`} className="btn btn-primary">Back to Course</Link>
      </div>
    );
  }

  // Ready phase — quiz info before starting
  if (phase === 'ready' && quiz) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 20px' }}>
        <Link to={`/courses/${slug}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray-500)', textDecoration: 'none', marginBottom: 32, fontSize: '0.875rem' }}>
          <ArrowLeft size={16} /> Back to Course
        </Link>
        <div style={{ background: 'var(--white)', borderRadius: 16, padding: 40, textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
          <Award size={48} color="var(--primary)" style={{ marginBottom: 16 }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>{quiz.title}</h1>
          {quiz.description && (
            <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>{quiz.description}</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{quiz.question_count}</div>
              <div style={{ fontSize: '0.813rem', color: 'var(--gray-500)' }}>Questions</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{quiz.total_marks}</div>
              <div style={{ fontSize: '0.813rem', color: 'var(--gray-500)' }}>Total Marks</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{quiz.duration_minutes}m</div>
              <div style={{ fontSize: '0.813rem', color: 'var(--gray-500)' }}>Duration</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{quiz.passing_marks}</div>
              <div style={{ fontSize: '0.813rem', color: 'var(--gray-500)' }}>Pass Mark</div>
            </div>
          </div>
          <button onClick={beginQuiz} className="btn btn-primary" style={{ padding: '12px 48px', fontSize: '1rem' }}>
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  // Taking phase — answering questions
  if (phase === 'taking' && quiz) {
    return (
      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
        {/* Timer & Progress Bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10, background: 'var(--white)',
          padding: '16px 0', borderBottom: '1px solid var(--gray-200)', marginBottom: 24
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>{quiz.title}</h2>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px',
              background: timeLeft < 60 ? '#fef2f2' : 'var(--gray-50)',
              borderRadius: 100, fontWeight: 700, fontSize: '0.938rem',
              color: timeLeft < 60 ? '#ef4444' : 'var(--gray-700)'
            }}>
              <Clock size={16} /> {formatTime(timeLeft)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 6, background: 'var(--gray-100)', borderRadius: 100, overflow: 'hidden' }}>
              <div style={{
                width: `${(answeredCount / totalQuestions) * 100}%`,
                height: '100%', background: 'var(--primary)', borderRadius: 100,
                transition: 'width 0.3s ease'
              }} />
            </div>
            <span style={{ fontSize: '0.813rem', color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
              {answeredCount}/{totalQuestions}
            </span>
          </div>
        </div>

        {/* Questions */}
        {quiz.questions.map((question, idx) => (
          <div key={question.id} style={{
            background: 'var(--white)', borderRadius: 12, padding: 24, marginBottom: 16,
            border: answers[question.id] ? '2px solid var(--primary)' : '1px solid var(--gray-200)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%', background: answers[question.id] ? 'var(--primary)' : 'var(--gray-100)',
                color: answers[question.id] ? 'white' : 'var(--gray-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.813rem', fontWeight: 700, flexShrink: 0
              }}>
                {idx + 1}
              </span>
              <div style={{ fontWeight: 600, color: 'var(--gray-900)', lineHeight: 1.5 }}>
                {question.text}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 8, paddingLeft: 40 }}>
              {question.options.map((option) => (
                <label key={option.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                  border: answers[question.id] === option.id
                    ? '2px solid var(--primary)' : '1px solid var(--gray-200)',
                  background: answers[question.id] === option.id ? 'var(--primary-50)' : 'var(--white)',
                }}>
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    checked={answers[question.id] === option.id}
                    onChange={() => handleSelectOption(question.id, option.id)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span style={{ fontSize: '0.938rem', color: 'var(--gray-700)' }}>{option.text}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {/* Submit button */}
        <div style={{ textAlign: 'center', padding: '24px 0 60px' }}>
          <button
            onClick={handleSubmit}
            disabled={submitting || answeredCount === 0}
            className="btn btn-primary"
            style={{ padding: '14px 60px', fontSize: '1rem', opacity: answeredCount === 0 ? 0.5 : 1 }}
          >
            {submitting ? 'Submitting...' : `Submit Quiz (${answeredCount}/${totalQuestions} answered)`}
          </button>
        </div>
      </div>
    );
  }

  // Submitted phase — results
  if (phase === 'submitted' && result) {
    const passed = result.passed;
    return (
      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
        {/* Score Card */}
        <div style={{
          background: passed
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : 'linear-gradient(135deg, #ef4444, #dc2626)',
          borderRadius: 16, padding: 40, textAlign: 'center', color: 'white', marginBottom: 32
        }}>
          {passed
            ? <CheckCircle size={48} style={{ marginBottom: 12 }} />
            : <XCircle size={48} style={{ marginBottom: 12 }} />
          }
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 4px' }}>
            {result.score}/{result.total_marks}
          </h1>
          <p style={{ fontSize: '1.125rem', opacity: 0.9, margin: 0 }}>
            {passed ? 'Congratulations! You passed!' : `You need ${result.passing_marks} to pass`}
          </p>
        </div>

        {/* Detailed Results */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Answer Review</h2>
        {result.responses?.map((response, idx) => (
          <div key={response.id} style={{
            background: 'var(--white)', borderRadius: 12, padding: 20, marginBottom: 12,
            border: `2px solid ${response.is_correct ? '#10b981' : '#ef4444'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: 12, marginBottom: 12 }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: response.is_correct ? '#10b981' : '#ef4444',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.813rem', fontWeight: 700, flexShrink: 0
              }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--gray-900)', marginBottom: 8 }}>
                  {response.question_text}
                </div>
                {response.selected_option_text && (
                  <div style={{
                    fontSize: '0.875rem', padding: '6px 12px', borderRadius: 8, marginBottom: 4,
                    background: response.is_correct ? '#f0fdf4' : '#fef2f2',
                    color: response.is_correct ? '#15803d' : '#dc2626'
                  }}>
                    Your answer: {response.selected_option_text}
                    {response.is_correct
                      ? <CheckCircle size={14} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
                      : <XCircle size={14} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
                    }
                  </div>
                )}
                {!response.is_correct && response.correct_option && (
                  <div style={{
                    fontSize: '0.875rem', padding: '6px 12px', borderRadius: 8,
                    background: '#f0fdf4', color: '#15803d'
                  }}>
                    Correct answer: {response.correct_option}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Back button */}
        <div style={{ textAlign: 'center', padding: '24px 0 60px' }}>
          <Link to={`/courses/${slug}`} className="btn btn-primary" style={{ padding: '12px 40px' }}>
            Back to Course
          </Link>
        </div>
      </div>
    );
  }

  // Loading
  return (
    <div style={{ padding: '100px 0', textAlign: 'center' }}>
      <div className="skeleton" style={{ width: 200, height: 24, margin: '0 auto 16px' }} />
      <div className="skeleton" style={{ width: 400, height: 40, margin: '0 auto' }} />
    </div>
  );
};

export default QuizPage;
