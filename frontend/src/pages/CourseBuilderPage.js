import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { instructorAPI, courseAPI as publicCourseAPI } from '../services/api';
import {
  Save, Plus, Trash2, ChevronDown, ChevronUp, Play,
  FileText, GripVertical, ArrowLeft, Video, X, ClipboardList, Edit2
} from 'lucide-react';

const CourseBuilderPage = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});
  const [categories, setCategories] = useState([]);

  const [meta, setMeta] = useState({
    title: '', short_description: '', category: '', difficulty: 'BEGINNER',
    price: '', duration_hours: '',
  });

  const [saveMsg, setSaveMsg] = useState(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSection, setAddingSection] = useState(false);

  const [lessonModal, setLessonModal] = useState(null);
  const [lessonForm, setLessonForm] = useState({
    title: '', video_url: '', duration_minutes: '', is_preview: false, lesson_type: 'VIDEO', content: '',
  });
  const [fetchingDuration, setFetchingDuration] = useState(false);
  const [durationMsg, setDurationMsg] = useState(null);

  // Quiz state
  const [quizzes, setQuizzes] = useState([]);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDuration, setQuizDuration] = useState(15);
  const [quizQuestions, setQuizQuestions] = useState(
    Array.from({ length: 10 }, () => ({
      text: '',
      topic_tag: '',
      difficulty: 'MEDIUM',
      options: [
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
      ],
    }))
  );
  const [quizSaving, setQuizSaving] = useState(false);
  const [quizMsg, setQuizMsg] = useState(null);

  const fetchCurriculum = async () => {
    try {
      const [currRes, catRes, quizRes] = await Promise.all([
        instructorAPI.getCurriculum(courseId),
        publicCourseAPI.getCategories(),
        instructorAPI.getQuizzes(courseId),
      ]);
      setCourse(currRes.data);
      setCategories(catRes.data);
      setQuizzes(quizRes.data || []);
      setMeta({
        title: currRes.data.title || '',
        short_description: currRes.data.short_description || '',
        category: currRes.data.category?.id || currRes.data.category || '',
        difficulty: currRes.data.difficulty || 'BEGINNER',
        price: currRes.data.price || '',
        duration_hours: currRes.data.duration_hours || '',
      });
      if (currRes.data.modules?.length > 0) {
        setExpandedModules({ [currRes.data.modules[0].id]: true });
      }
    } catch (err) {
      console.error('Failed to load curriculum:', err);
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCurriculum(); }, [courseId]);

  const handleSaveMeta = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await instructorAPI.updateCourse(courseId, { ...meta, category: meta.category || null });
      await fetchCurriculum();
      setSaveMsg({ type: 'success', text: 'Course details saved successfully!' });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveMsg({ type: 'error', text: 'Failed to save changes. Please try again.' });
    }
    setSaving(false);
  };

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    try {
      await instructorAPI.createModule(courseId, { title: newSectionTitle.trim() });
      setNewSectionTitle('');
      setAddingSection(false);
      await fetchCurriculum();
    } catch (err) {
      console.error('Add section failed:', err);
    }
  };

  const handleDeleteSection = async (moduleId, title) => {
    if (!window.confirm(`Delete section "${title}" and all its lessons?`)) return;
    try {
      await instructorAPI.deleteModule(moduleId);
      await fetchCurriculum();
    } catch (err) {
      console.error('Delete section failed:', err);
    }
  };

  const handleMoveSection = async (moduleId, direction) => {
    const modules = course.modules;
    const idx = modules.findIndex(m => m.id === moduleId);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= modules.length) return;
    try {
      await Promise.all([
        instructorAPI.updateModule(modules[idx].id, { order: modules[targetIdx].order }),
        instructorAPI.updateModule(modules[targetIdx].id, { order: modules[idx].order }),
      ]);
      await fetchCurriculum();
    } catch (err) {
      console.error('Move failed:', err);
    }
  };

  const handleAddLesson = async () => {
    if (!lessonForm.title.trim() || !lessonModal) return;
    try {
      await instructorAPI.createLesson(lessonModal.moduleId, {
        ...lessonForm,
        duration_minutes: parseInt(lessonForm.duration_minutes) || 0,
      });
      setLessonModal(null);
      setLessonForm({ title: '', video_url: '', duration_minutes: '', is_preview: false, lesson_type: 'VIDEO', content: '' });
      await fetchCurriculum();
    } catch (err) {
      console.error('Add lesson failed:', err);
    }
  };

  const handleDeleteLesson = async (lessonId, title) => {
    if (!window.confirm(`Delete lesson "${title}"?`)) return;
    try {
      await instructorAPI.deleteLesson(lessonId);
      await fetchCurriculum();
    } catch (err) {
      console.error('Delete lesson failed:', err);
    }
  };

  // Quiz management
  const resetQuizForm = () => {
    setQuizTitle('');
    setQuizDuration(15);
    setQuizQuestions(
      Array.from({ length: 10 }, () => ({
        text: '', topic_tag: '', difficulty: 'MEDIUM',
        options: [
          { text: '', is_correct: true },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
        ],
      }))
    );
    setEditingQuiz(null);
    setShowQuizForm(false);
    setQuizMsg(null);
  };

  const handleEditQuiz = (quiz) => {
    setEditingQuiz(quiz.id);
    setQuizTitle(quiz.title);
    setQuizDuration(quiz.duration_minutes);
    const qs = quiz.questions.map(q => ({
      text: q.text,
      topic_tag: q.topic_tag || '',
      difficulty: q.difficulty || 'MEDIUM',
      options: q.options.map(o => ({ text: o.text, is_correct: o.is_correct })),
    }));
    while (qs.length < 10) {
      qs.push({
        text: '', topic_tag: '', difficulty: 'MEDIUM',
        options: [
          { text: '', is_correct: true },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
        ],
      });
    }
    setQuizQuestions(qs);
    setShowQuizForm(true);
  };

  const handleSaveQuiz = async () => {
    const filledQuestions = quizQuestions.filter(q => q.text.trim());
    if (filledQuestions.length !== 10) {
      setQuizMsg({ type: 'error', text: 'All 10 questions are required' });
      return;
    }
    for (let i = 0; i < filledQuestions.length; i++) {
      const opts = filledQuestions[i].options.filter(o => o.text.trim());
      if (opts.length < 2) {
        setQuizMsg({ type: 'error', text: `Question ${i + 1} needs at least 2 options` });
        return;
      }
      if (!opts.some(o => o.is_correct)) {
        setQuizMsg({ type: 'error', text: `Question ${i + 1} needs a correct answer` });
        return;
      }
    }

    setQuizSaving(true);
    setQuizMsg(null);
    const payload = {
      title: quizTitle || 'Course Quiz',
      duration_minutes: parseInt(quizDuration) || 15,
      questions: filledQuestions.map(q => ({
        text: q.text,
        topic_tag: q.topic_tag,
        difficulty: q.difficulty,
        options: q.options.filter(o => o.text.trim()),
      })),
    };

    try {
      if (editingQuiz) {
        await instructorAPI.updateQuiz(editingQuiz, payload);
        setQuizMsg({ type: 'success', text: 'Quiz updated successfully!' });
      } else {
        await instructorAPI.createQuiz(courseId, payload);
        setQuizMsg({ type: 'success', text: 'Quiz created successfully!' });
      }
      const quizRes = await instructorAPI.getQuizzes(courseId);
      setQuizzes(quizRes.data || []);
      setTimeout(() => { resetQuizForm(); }, 1500);
    } catch (err) {
      setQuizMsg({ type: 'error', text: err.response?.data?.error || 'Failed to save quiz' });
    }
    setQuizSaving(false);
  };

  const handleDeleteQuiz = async (quizId, title) => {
    if (!window.confirm(`Delete quiz "${title}"? This will also delete all student attempts.`)) return;
    try {
      await instructorAPI.deleteQuiz(quizId);
      const quizRes = await instructorAPI.getQuizzes(courseId);
      setQuizzes(quizRes.data || []);
    } catch (err) {
      console.error('Delete quiz failed:', err);
    }
  };

  const updateQuestion = (idx, field, value) => {
    setQuizQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx, oIdx, field, value) => {
    setQuizQuestions(prev => prev.map((q, qi) => {
      if (qi !== qIdx) return q;
      const newOptions = q.options.map((o, oi) => {
        if (field === 'is_correct') {
          return { ...o, is_correct: oi === oIdx };
        }
        return oi === oIdx ? { ...o, [field]: value } : o;
      });
      return { ...q, options: newOptions };
    }));
  };

  const isYouTubeUrl = (url) => {
    return /youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\//.test(url);
  };

  const handleVideoUrlBlur = async (url) => {
    if (!url || !isYouTubeUrl(url) || lessonForm.lesson_type !== 'VIDEO') return;
    setFetchingDuration(true);
    setDurationMsg(null);
    try {
      const res = await instructorAPI.getVideoMetadata(url);
      setLessonForm(prev => ({ ...prev, duration_minutes: res.data.duration_minutes }));
      setDurationMsg({ type: 'success', text: `Auto-detected: ${res.data.duration_minutes} min` });
    } catch {
      setDurationMsg({ type: 'warn', text: 'Could not auto-detect duration' });
    }
    setFetchingDuration(false);
  };

  const toggleModule = (id) => {
    setExpandedModules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div style={{ padding: '100px 0', textAlign: 'center' }}>
        <div className="skeleton" style={{ width: 300, height: 32, margin: '0 auto 16px' }} />
        <div className="skeleton" style={{ width: 200, height: 20, margin: '0 auto' }} />
      </div>
    );
  }

  if (!course) return <div style={{ padding: 100, textAlign: 'center', color: 'var(--gray-500)' }}>Course not found.</div>;

  return (
    <div className="dashboard-page">
      <div className="container" style={{ maxWidth: 960 }}>

        <Link to="/instructor/dashboard" className="new-course-back">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {/* Course Meta Editor */}
        <div className="dashboard-card" style={{ marginBottom: 24 }}>
          <div className="dashboard-card-header">
            <span className="dashboard-card-title">Course Details</span>
          </div>
          <div className="dashboard-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Title</label>
                <input className="form-input" value={meta.title}
                  onChange={e => setMeta({ ...meta, title: e.target.value })} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Short Description</label>
                <textarea className="form-input" style={{ minHeight: 60, resize: 'vertical' }} value={meta.short_description}
                  onChange={e => setMeta({ ...meta, short_description: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={meta.category}
                  onChange={e => setMeta({ ...meta, category: e.target.value })}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Level</label>
                <select className="form-input" value={meta.difficulty}
                  onChange={e => setMeta({ ...meta, difficulty: e.target.value })}>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Price (₹)</label>
                <input className="form-input" type="number" value={meta.price}
                  onChange={e => setMeta({ ...meta, price: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Total Hours</label>
                <input className="form-input" type="number" value={meta.duration_hours}
                  onChange={e => setMeta({ ...meta, duration_hours: e.target.value })} />
              </div>
            </div>
            <button onClick={handleSaveMeta} disabled={saving}
              className="btn btn-primary" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saveMsg && (
              <div style={{
                marginTop: 10, padding: '8px 14px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 500,
                background: saveMsg.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
                color: saveMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
              }}>
                {saveMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* Curriculum Builder */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span className="dashboard-card-title">Curriculum</span>
            <button onClick={() => setAddingSection(true)}
              className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.813rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Add Section
            </button>
          </div>
          <div className="dashboard-card-body">

            {/* Add section inline */}
            {addingSection && (
              <div className="builder-add-section">
                <input className="form-input" style={{ flex: 1 }} placeholder="Section title, e.g. 'Module 1: AWS Fundamentals'"
                  value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddSection()}
                  autoFocus />
                <button onClick={handleAddSection} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.813rem' }}>Add</button>
                <button onClick={() => { setAddingSection(false); setNewSectionTitle(''); }}
                  className="btn btn-ghost" style={{ padding: '8px' }}>
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Empty state */}
            {course.modules?.length === 0 && !addingSection && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
                No sections yet. Click "Add Section" to start building your curriculum.
              </div>
            )}

            {/* Modules */}
            {course.modules?.map((module, idx) => (
              <div key={module.id} className="builder-module">
                {/* Section header */}
                <div className="builder-module-header" onClick={() => toggleModule(module.id)}>
                  <GripVertical size={14} color="var(--gray-300)" />
                  <div style={{ flex: 1 }}>
                    <div className="builder-module-title">{module.title}</div>
                    <div className="builder-module-meta">
                      {module.lesson_count || module.lessons?.length || 0} lessons
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleMoveSection(module.id, 'up')} disabled={idx === 0}
                      className="builder-small-btn"><ChevronUp size={12} /></button>
                    <button onClick={() => handleMoveSection(module.id, 'down')} disabled={idx === course.modules.length - 1}
                      className="builder-small-btn"><ChevronDown size={12} /></button>
                    <button onClick={() => handleDeleteSection(module.id, module.title)}
                      className="builder-small-btn delete"><Trash2 size={12} /></button>
                  </div>
                  {expandedModules[module.id] ? <ChevronUp size={16} color="var(--gray-400)" /> : <ChevronDown size={16} color="var(--gray-400)" />}
                </div>

                {/* Lessons */}
                {expandedModules[module.id] && (
                  <div className="builder-lessons">
                    {module.lessons?.map(lesson => (
                      <div key={lesson.id} className="builder-lesson">
                        {lesson.lesson_type === 'VIDEO' ? (
                          <Play size={14} color="var(--primary)" />
                        ) : (
                          <FileText size={14} color="var(--gray-400)" />
                        )}
                        <div style={{ flex: 1 }}>
                          <span className="builder-lesson-title">{lesson.title}</span>
                          {lesson.is_preview && (
                            <span className="builder-preview-badge">Preview</span>
                          )}
                        </div>
                        {lesson.video_url && (
                          <a href={lesson.video_url} target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--primary)' }}>
                            <Video size={12} />
                          </a>
                        )}
                        <span className="builder-lesson-duration">{lesson.duration_minutes}m</span>
                        <button onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                          className="builder-small-btn delete"><Trash2 size={12} /></button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setLessonModal({ moduleId: module.id });
                        setLessonForm({ title: '', video_url: '', duration_minutes: '', is_preview: false, lesson_type: 'VIDEO', content: '' });
                      }}
                      className="builder-add-lesson-btn">
                      <Plus size={12} /> Add Lesson
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quiz Management */}
        <div className="dashboard-card" style={{ marginTop: 24 }}>
          <div className="dashboard-card-header">
            <span className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={18} /> Course Quizzes ({quizzes.length}/5)
            </span>
            {!showQuizForm && quizzes.length < 5 && (
              <button onClick={() => { resetQuizForm(); setShowQuizForm(true); }}
                className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.813rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={14} /> Add Quiz
              </button>
            )}
          </div>
          <div className="dashboard-card-body">
            {/* Existing quizzes list */}
            {!showQuizForm && quizzes.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)' }}>
                No quizzes yet. Add a 10-question MCQ quiz for your students.
              </div>
            )}
            {!showQuizForm && quizzes.map((quiz) => (
              <div key={quiz.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderRadius: 10, marginBottom: 8,
                background: 'var(--gray-50)', border: '1px solid var(--gray-200)'
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{quiz.title}</div>
                  <div style={{ fontSize: '0.813rem', color: 'var(--gray-500)' }}>
                    {quiz.question_count} questions &middot; {quiz.total_marks} marks &middot; {quiz.duration_minutes} min
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => handleEditQuiz(quiz)}
                    className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Edit2 size={12} /> Edit
                  </button>
                  <button onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                    className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}

            {/* Quiz creation/edit form */}
            {showQuizForm && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div className="form-group">
                    <label className="form-label">Quiz Title</label>
                    <input className="form-input" placeholder="e.g. Module 1 Assessment"
                      value={quizTitle} onChange={e => setQuizTitle(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration (min)</label>
                    <input className="form-input" type="number" value={quizDuration}
                      onChange={e => setQuizDuration(e.target.value)} />
                  </div>
                </div>

                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 12 }}>
                  Questions (10 MCQs, 1 mark each)
                </div>

                {quizQuestions.map((q, qIdx) => (
                  <div key={qIdx} style={{
                    padding: 16, marginBottom: 12, borderRadius: 10,
                    border: '1px solid var(--gray-200)', background: 'var(--gray-50)'
                  }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'start' }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: '50%', background: q.text.trim() ? 'var(--primary)' : 'var(--gray-200)',
                        color: q.text.trim() ? 'white' : 'var(--gray-500)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, marginTop: 4
                      }}>
                        {qIdx + 1}
                      </span>
                      <input className="form-input" style={{ flex: 1 }}
                        placeholder={`Question ${qIdx + 1}`}
                        value={q.text}
                        onChange={e => updateQuestion(qIdx, 'text', e.target.value)} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingLeft: 36 }}>
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="radio" name={`q-${qIdx}-correct`}
                            checked={opt.is_correct}
                            onChange={() => updateOption(qIdx, oIdx, 'is_correct', true)}
                            style={{ accentColor: 'var(--primary)' }}
                            title="Mark as correct answer" />
                          <input className="form-input" style={{ flex: 1, fontSize: '0.813rem' }}
                            placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                            value={opt.text}
                            onChange={e => updateOption(qIdx, oIdx, 'text', e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {quizMsg && (
                  <div style={{
                    marginBottom: 12, padding: '8px 14px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 500,
                    background: quizMsg.type === 'success' ? 'var(--success-light)' : '#fef2f2',
                    color: quizMsg.type === 'success' ? 'var(--success)' : '#ef4444',
                  }}>
                    {quizMsg.text}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={resetQuizForm} className="btn btn-ghost">Cancel</button>
                  <button onClick={handleSaveQuiz} disabled={quizSaving}
                    className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Save size={14} /> {quizSaving ? 'Saving...' : editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lesson Modal */}
      {lessonModal && (
        <div className="builder-modal-overlay" onClick={() => setLessonModal(null)}>
          <div className="builder-modal" onClick={e => e.stopPropagation()}>
            <h3 className="builder-modal-title">Add Lesson</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Lesson Title *</label>
                <input className="form-input" placeholder="e.g. Introduction to EC2"
                  value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} autoFocus />
              </div>
              {/* Type selector always visible */}
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={lessonForm.lesson_type}
                  onChange={e => setLessonForm({ ...lessonForm, lesson_type: e.target.value })}>
                  <option value="VIDEO">Video</option>
                  <option value="TEXT">Text</option>
                  <option value="QUIZ">Quiz</option>
                </select>
              </div>

              {/* VIDEO: URL + duration */}
              {lessonForm.lesson_type === 'VIDEO' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Video URL (YouTube / Vimeo / Direct)</label>
                    <input
                      className="form-input"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={lessonForm.video_url}
                      onChange={e => {
                        setLessonForm({ ...lessonForm, video_url: e.target.value });
                        setDurationMsg(null);
                      }}
                      onBlur={e => handleVideoUrlBlur(e.target.value)}
                    />
                    {isYouTubeUrl(lessonForm.video_url) && (
                      <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--gray-400)' }}>
                        YouTube URL detected — duration will auto-fill on tab out
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Duration (minutes)
                      {fetchingDuration && (
                        <span style={{ fontSize: '0.688rem', color: 'var(--primary)', fontWeight: 500 }}>
                          Fetching...
                        </span>
                      )}
                    </label>
                    <input className="form-input" type="number" placeholder="15"
                      value={lessonForm.duration_minutes}
                      onChange={e => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })} />
                    {durationMsg && (
                      <div style={{ fontSize: '0.75rem', marginTop: 4, color: durationMsg.type === 'success' ? 'var(--success)' : '#f59e0b' }}>
                        {durationMsg.text}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* TEXT: content editor + duration */}
              {lessonForm.lesson_type === 'TEXT' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Content</label>
                    <textarea
                      className="form-input"
                      placeholder="Write the lesson content here. Students will be able to read this when they open the lesson."
                      value={lessonForm.content}
                      onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })}
                      style={{ minHeight: 180, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
                    />
                    <div style={{ fontSize: '0.75rem', marginTop: 4, color: 'var(--gray-400)' }}>
                      {lessonForm.content.length} characters
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estimated Read Time (minutes)</label>
                    <input className="form-input" type="number" placeholder="5"
                      value={lessonForm.duration_minutes}
                      onChange={e => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })} />
                  </div>
                </>
              )}
              <label className="builder-checkbox-label">
                <input type="checkbox" checked={lessonForm.is_preview}
                  onChange={e => setLessonForm({ ...lessonForm, is_preview: e.target.checked })}
                  style={{ accentColor: 'var(--primary)' }} />
                Free Preview (visible to non-enrolled students)
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setLessonModal(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleAddLesson} className="btn btn-primary"
                disabled={!lessonForm.title.trim()}>
                Add Lesson
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseBuilderPage;
