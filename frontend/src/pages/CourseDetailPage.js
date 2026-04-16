import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { courseAPI, enrollmentAPI, progressAPI, quizAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen, Clock, Users, Star, BarChart3, Award, Play,
  FileText, ChevronDown, ChevronUp, CheckCircle, Lock, Edit, ClipboardList
} from 'lucide-react';
import LearningChatbot from '../components/chat/LearningChatbot';

const CourseDetailPage = () => {
  const { slug } = useParams();
  const { user, isAuthenticated, isInstructor } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState({});
  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [videoModal, setVideoModal] = useState(null);
  const [textModal, setTextModal] = useState(null);
  const [lessonProgress, setLessonProgress] = useState({});
  const [courseProgress, setCourseProgress] = useState(0);
  const [quizzes, setQuizzes] = useState([]);
  const [markingComplete, setMarkingComplete] = useState(null);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await courseAPI.getCourseDetail(slug);
        setCourse(response.data);
        if (isAuthenticated && response.data?.id) {
          try {
            const enrollRes = await enrollmentAPI.checkEnrollment(response.data.id);
            setEnrolled(enrollRes.data.enrolled);

            const courseOwner = response.data.instructor?.id === user?.id;

            if (enrollRes.data.enrolled) {
              // Fetch progress for enrolled students
              try {
                const progressRes = await progressAPI.getCourseProgress(response.data.id);
                setLessonProgress(progressRes.data.lessons || {});
                setCourseProgress(progressRes.data.progress || 0);
              } catch { }
            }

            // Fetch quizzes for enrolled students AND course owner
            if (enrollRes.data.enrolled || courseOwner) {
              try {
                const quizzesRes = await quizAPI.getQuizzes(response.data.id);
                setQuizzes(quizzesRes.data || []);
              } catch { }
            }
          } catch {
            setEnrolled(response.data.is_enrolled || false);
          }
        }
      } catch {
        setCourse(null);
      }
      setLoading(false);
    };
    fetchCourse();
  }, [slug, isAuthenticated]);

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const totalLessons = course?.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
  const totalDuration = course?.modules?.reduce(
    (sum, m) => sum + (m.lessons?.reduce((s, l) => s + (l.duration_minutes || 0), 0) || 0), 0
  ) || 0;

  const isOwner = isInstructor && course?.instructor?.id === user?.id;

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmEnroll = async () => {
    setEnrolling(true);
    setShowConfirmModal(false);
    try {
      await enrollmentAPI.enroll(course.id);
      setEnrolled(true);
      // Fetch progress and quizzes after enrollment
      try {
        const [progressRes, quizzesRes] = await Promise.all([
          progressAPI.getCourseProgress(course.id),
          quizAPI.getQuizzes(course.id),
        ]);
        setLessonProgress(progressRes.data.lessons || {});
        setCourseProgress(progressRes.data.progress || 0);
        setQuizzes(quizzesRes.data || []);
      } catch { }
    } catch (err) {
      console.error('Enrollment failed:', err);
    }
    setEnrolling(false);
  };

  const handleMarkComplete = async (lessonId, e) => {
    if (e) e.stopPropagation();
    setMarkingComplete(lessonId);
    try {
      const res = await progressAPI.markLessonComplete(lessonId);
      setLessonProgress(prev => ({
        ...prev,
        [lessonId]: { is_completed: true, completed_at: new Date().toISOString() }
      }));
      setCourseProgress(res.data.progress);
    } catch (err) {
      console.error('Failed to mark complete:', err);
    }
    setMarkingComplete(null);
  };

  const isLessonCompleted = (lessonId) => {
    return lessonProgress[lessonId]?.is_completed === true;
  };

  const handleWatchLesson = (lesson) => {
    if (enrolled || lesson.is_preview || isOwner) {
      if (lesson.lesson_type === 'TEXT') {
        setTextModal(lesson);
      } else if (lesson.video_url) {
        setVideoModal(lesson);
      } else {
        window.alert('No video URL configured for this lesson.');
      }
    }
  };

  const getEmbedUrl = (url) => {
    if (!url) return '';
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
  };

  if (loading) {
    return (
      <div style={{ padding: '100px 0', textAlign: 'center' }}>
        <div className="skeleton" style={{ width: 200, height: 24, margin: '0 auto 16px' }} />
        <div className="skeleton" style={{ width: 400, height: 40, margin: '0 auto 16px' }} />
        <div className="skeleton" style={{ width: 300, height: 16, margin: '0 auto' }} />
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: 100, textAlign: 'center' }}>
        <h2>Course not found</h2>
        <Link to="/courses" className="btn btn-primary" style={{ marginTop: 16 }}>Browse Courses</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="course-detail-hero">
        <div className="container">
          <div>
            <div className="course-detail-breadcrumb">
              <Link to="/courses">Courses</Link> / <span>{course.category?.name || 'General'}</span>
            </div>
            <div className="course-detail-category">{course.category?.name || 'General'}</div>
            <h1 className="course-detail-title">{course.title}</h1>
            <p className="course-detail-description">{course.short_description || course.description?.substring(0, 200)}</p>
            <div className="course-detail-meta">
              <span className="course-detail-meta-item">
                <Star size={16} color="#f59e0b" fill="#f59e0b" /> {course.average_rating ? Number(course.average_rating).toFixed(1) : 'No ratings'} ({course.review_count || 0} reviews)
              </span>
              <span className="course-detail-meta-item">
                <Users size={16} /> {(course.enrollment_count || 0).toLocaleString()} students
              </span>
              <span className="course-detail-meta-item">
                <Clock size={16} /> {course.duration_hours || Math.round(totalDuration / 60)} hours
              </span>
              <span className="course-detail-meta-item">
                <BarChart3 size={16} /> {course.difficulty}
              </span>
            </div>
          </div>

          {/* Sidebar Card */}
          <div className="course-detail-sidebar">
            <div className="course-detail-sidebar-image">
              <div className="course-card-placeholder" style={{ background: course.category?.color || 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 0 }}>
                <BookOpen size={64} color="rgba(255,255,255,0.4)" />
              </div>
            </div>
            <div className="course-detail-sidebar-body">
              <div className="course-detail-price-section">
                <div className="course-detail-price">
                  <span className="currency">&#8377;</span>{Number(course.price || 0).toLocaleString()}
                </div>
              </div>

              {isOwner ? (
                <Link to={`/instructor/courses/${course.id}/curriculum`}
                  className="btn btn-primary course-detail-enroll-btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Edit size={18} /> Edit Course
                </Link>
              ) : enrolled ? (
                <button className="btn btn-primary course-detail-enroll-btn"
                  onClick={() => document.getElementById('course-curriculum')?.scrollIntoView({ behavior: 'smooth' })}
                  style={{ background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <CheckCircle size={18} /> Go to Course
                </button>
              ) : (
                <button
                  onClick={handleEnroll}
                  className="btn btn-primary course-detail-enroll-btn"
                  disabled={enrolling}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {enrolling ? 'Enrolling...' : 'Enroll Now'}
                </button>
              )}

              {/* Progress bar for enrolled students */}
              {enrolled && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.813rem', color: 'var(--gray-600)', marginBottom: 6 }}>
                    <span>Progress</span>
                    <span style={{ fontWeight: 600 }}>{Math.round(courseProgress)}%</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 100, overflow: 'hidden' }}>
                    <div style={{
                      width: `${courseProgress}%`,
                      height: '100%',
                      background: courseProgress >= 100 ? 'var(--success)' : 'linear-gradient(90deg, var(--primary), var(--primary-light))',
                      borderRadius: 100,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              )}

              <div className="course-detail-features">
                <div className="course-detail-feature">
                  <Play size={16} color="var(--primary)" /> {totalLessons} lessons
                </div>
                <div className="course-detail-feature">
                  <Clock size={16} color="var(--primary)" /> {course.duration_hours || Math.round(totalDuration / 60)} hours of content
                </div>
                <div className="course-detail-feature">
                  <Award size={16} color="var(--primary)" /> Certificate of completion
                </div>
                <div className="course-detail-feature">
                  <BarChart3 size={16} color="var(--primary)" /> AI-powered progress tracking
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="course-detail-body">
        <div className="container">
          {/* About */}
          <div className="course-detail-section">
            <h2>About This Course</h2>
            <p style={{ color: 'var(--gray-600)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {course.description}
            </p>
          </div>

          {/* Instructor */}
          <div className="course-detail-section">
            <h2>Instructor</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.25rem', fontWeight: 700 }}>
                {(course.instructor?.first_name || 'I')[0]}{(course.instructor?.last_name || '')[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.063rem', color: 'var(--gray-900)' }}>
                  {course.instructor?.full_name || `${course.instructor?.first_name} ${course.instructor?.last_name}`}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--gray-500)' }}>Senior Instructor</div>
              </div>
            </div>
          </div>

          {/* Curriculum */}
          <div id="course-curriculum" className="course-detail-section">
            <h2>Course Curriculum</h2>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: 20 }}>
              {course.modules?.length || 0} modules &middot; {totalLessons} lessons &middot; {course.duration_hours || Math.round(totalDuration / 60)}h total
            </p>
            {course.modules?.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)', background: 'var(--gray-50)', borderRadius: 12 }}>
                Curriculum is being prepared. Check back soon!
              </div>
            )}
            {course.modules?.map((module) => {
              const moduleLessons = module.lessons || [];
              const completedInModule = moduleLessons.filter(l => isLessonCompleted(l.id)).length;
              return (
                <div key={module.id} className="course-module">
                  <div className="course-module-header" onClick={() => toggleModule(module.id)}>
                    <div>
                      <div className="course-module-title">{module.title}</div>
                      <div className="course-module-meta">
                        {moduleLessons.length} lessons
                        {enrolled && completedInModule > 0 && (
                          <span style={{ marginLeft: 8, color: 'var(--success)', fontWeight: 600 }}>
                            ({completedInModule}/{moduleLessons.length} done)
                          </span>
                        )}
                      </div>
                    </div>
                    {expandedModules[module.id] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                  {expandedModules[module.id] && (
                    <div className="course-module-lessons">
                      {moduleLessons.map((lesson) => {
                        const completed = isLessonCompleted(lesson.id);
                        return (
                          <div key={lesson.id} className="course-lesson"
                            onClick={() => handleWatchLesson(lesson)}
                            style={{ cursor: (enrolled || lesson.is_preview || isOwner) ? 'pointer' : 'default' }}>
                            <div className="course-lesson-info">
                              {completed ? (
                                <CheckCircle size={14} color="#10b981" fill="#10b981" />
                              ) : lesson.lesson_type === 'VIDEO' ? (
                                <Play size={14} color="var(--primary)" />
                              ) : lesson.lesson_type === 'TEXT' ? (
                                <FileText size={14} color="var(--primary)" />
                              ) : (
                                <FileText size={14} color="var(--gray-400)" />
                              )}
                              <span style={{ textDecoration: completed ? 'none' : 'none', color: completed ? 'var(--gray-500)' : 'inherit' }}>
                                {lesson.title}
                              </span>
                              {lesson.is_preview && (
                                <span style={{ fontSize: '0.688rem', padding: '2px 8px', background: 'var(--primary-50)', color: 'var(--primary)', borderRadius: 100, fontWeight: 600 }}>
                                  Preview
                                </span>
                              )}
                            </div>
                            <span className="course-lesson-duration" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {enrolled && !completed && (
                                <button
                                  onClick={(e) => handleMarkComplete(lesson.id, e)}
                                  disabled={markingComplete === lesson.id}
                                  style={{
                                    fontSize: '0.688rem', padding: '3px 10px',
                                    background: 'var(--primary-50)', color: 'var(--primary)',
                                    border: '1px solid var(--primary)', borderRadius: 100,
                                    cursor: 'pointer', fontWeight: 600,
                                    opacity: markingComplete === lesson.id ? 0.5 : 1
                                  }}
                                >
                                  {markingComplete === lesson.id ? '...' : 'Mark Done'}
                                </button>
                              )}
                              {enrolled || lesson.is_preview || isOwner ? (
                                <span style={{ color: completed ? 'var(--success)' : 'var(--primary)' }}>{lesson.duration_minutes}m</span>
                              ) : (
                                <><Lock size={12} /> {lesson.duration_minutes}m</>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quizzes Section */}
          {(enrolled || isOwner) && quizzes.length > 0 && (
            <div className="course-detail-section">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={22} /> Course Quizzes
              </h2>
              <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
                {quizzes.map((quiz) => (
                  <div key={quiz.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 20px', background: 'var(--gray-50)', borderRadius: 12,
                    border: '1px solid var(--gray-200)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--gray-900)', marginBottom: 4 }}>{quiz.title}</div>
                      <div style={{ fontSize: '0.813rem', color: 'var(--gray-500)' }}>
                        {quiz.question_count} questions &middot; {quiz.total_marks} marks &middot; {quiz.duration_minutes} min
                      </div>
                      {quiz.has_attempted && quiz.best_score !== null && (
                        <div style={{
                          fontSize: '0.813rem', marginTop: 4, fontWeight: 600,
                          color: quiz.best_score >= quiz.passing_marks ? 'var(--success)' : '#ef4444'
                        }}>
                          Best Score: {quiz.best_score}/{quiz.total_marks}
                          {quiz.best_score >= quiz.passing_marks ? ' — Passed' : ' — Not Passed'}
                        </div>
                      )}
                    </div>
                    <Link
                      to={`/courses/${slug}/quiz/${quiz.id}`}
                      className="btn btn-primary"
                      style={{ fontSize: '0.813rem', padding: '8px 20px' }}
                    >
                      {quiz.has_attempted ? 'Retake Quiz' : 'Take Quiz'}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <LearningChatbot courseId={course.slug} />

      {/* Enrollment Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowConfirmModal(false)}>
          <div style={{
            background: 'var(--white)', borderRadius: 16, padding: 32, maxWidth: 400, width: '90%',
            textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            <BookOpen size={40} color="var(--primary)" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 8 }}>
              Enroll in this course?
            </h3>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: 4 }}>
              {course.title}
            </p>
            <p style={{ color: 'var(--gray-900)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 20 }}>
              ₹{Number(course.price || 0).toLocaleString()}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowConfirmModal(false)}
                className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={confirmEnroll}
                className="btn btn-primary" style={{ flex: 1 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {videoModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setVideoModal(null)}>
          <div style={{
            width: '90%', maxWidth: 800, background: '#000', borderRadius: 12, overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#111' }}>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>{videoModal.title}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {enrolled && !isLessonCompleted(videoModal.id) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMarkComplete(videoModal.id); }}
                    disabled={markingComplete === videoModal.id}
                    style={{
                      fontSize: '0.75rem', padding: '6px 14px',
                      background: '#10b981', color: 'white',
                      border: 'none', borderRadius: 100,
                      cursor: 'pointer', fontWeight: 600
                    }}
                  >
                    {markingComplete === videoModal.id ? 'Marking...' : 'Mark as Complete'}
                  </button>
                )}
                {enrolled && isLessonCompleted(videoModal.id) && (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={14} /> Completed
                  </span>
                )}
                <button onClick={() => setVideoModal(null)}
                  style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
              </div>
            </div>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={getEmbedUrl(videoModal.video_url)}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={videoModal.title}
              />
            </div>
          </div>
        </div>
      )}

      {/* Text Lesson Reader Modal */}
      {textModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px',
        }} onClick={() => setTextModal(null)}>
          <div style={{
            width: '100%', maxWidth: 760, background: 'var(--bg-primary)',
            borderRadius: 16, overflow: 'hidden', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 24px', background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--gray-200)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={18} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>
                  {textModal.title}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {enrolled && !isLessonCompleted(textModal.id) && (
                  <button
                    onClick={() => handleMarkComplete(textModal.id)}
                    disabled={markingComplete === textModal.id}
                    style={{
                      fontSize: '0.75rem', padding: '6px 14px',
                      background: '#10b981', color: 'white',
                      border: 'none', borderRadius: 100,
                      cursor: 'pointer', fontWeight: 600
                    }}
                  >
                    {markingComplete === textModal.id ? 'Marking...' : 'Mark as Complete'}
                  </button>
                )}
                {enrolled && isLessonCompleted(textModal.id) && (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={14} /> Completed
                  </span>
                )}
                <button onClick={() => setTextModal(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>✕</button>
              </div>
            </div>
            {/* Content */}
            <div style={{
              padding: '32px', overflowY: 'auto', flex: 1,
              color: 'var(--gray-700)', lineHeight: 1.9, fontSize: '1rem',
            }}>
              {textModal.content ? (
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {textModal.content}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px 0' }}>
                  No content available for this lesson yet.
                </div>
              )}
            </div>
            {/* Footer */}
            {textModal.duration_minutes > 0 && (
              <div style={{
                padding: '12px 24px', borderTop: '1px solid var(--gray-200)',
                fontSize: '0.813rem', color: 'var(--gray-400)',
                background: 'var(--bg-secondary)',
              }}>
                Estimated read time: {textModal.duration_minutes} min
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetailPage;
