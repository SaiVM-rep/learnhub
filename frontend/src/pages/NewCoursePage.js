import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { instructorAPI, courseAPI as publicCourseAPI } from '../services/api';
import { ArrowLeft, BookOpen } from 'lucide-react';

const NewCoursePage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    short_description: '',
    description: '',
    category: '',
    difficulty: 'BEGINNER',
    price: '',
    duration_hours: '',
  });

  useEffect(() => {
    publicCourseAPI.getCategories().then(res => setCategories(res.data)).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Course title is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await instructorAPI.createCourse({
        ...form,
        category: form.category || null,
        price: parseFloat(form.price) || 0,
        duration_hours: parseInt(form.duration_hours) || 0,
      });
      const newCourse = res.data;
      navigate(`/instructor/courses/${newCourse.id}/curriculum`);
    } catch (err) {
      const msg = err.response?.data;
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Failed to create course.');
    }
    setSaving(false);
  };

  return (
    <div className="dashboard-page">
      <div className="container" style={{ maxWidth: 640 }}>

        <Link to="/instructor/dashboard" className="new-course-back">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div className="dashboard-card">
          <div className="dashboard-card-body" style={{ padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div className="new-course-icon">
                <BookOpen size={20} color="white" />
              </div>
              <div>
                <h1 className="new-course-title">Create New Course</h1>
                <p className="new-course-subtitle">
                  Fill in the details below. You can add curriculum after creating.
                </p>
              </div>
            </div>

            {error && (
              <div className="new-course-error">{error}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="new-course-fields">
                <div className="form-group">
                  <label className="form-label">Course Title *</label>
                  <input className="form-input" name="title" value={form.title}
                    onChange={handleChange} placeholder="e.g. AWS Cloud Architecture & DevOps" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Short Description</label>
                  <input className="form-input" name="short_description" value={form.short_description}
                    onChange={handleChange} placeholder="One-line summary of your course" />
                </div>
                <div className="form-group">
                  <label className="form-label">Full Description</label>
                  <textarea className="form-input" style={{ minHeight: 100, resize: 'vertical' }} name="description"
                    value={form.description} onChange={handleChange}
                    placeholder="Detailed course description..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-input" name="category" value={form.category} onChange={handleChange}>
                      <option value="">Select category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Level</label>
                    <select className="form-input" name="difficulty" value={form.difficulty} onChange={handleChange}>
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price (₹)</label>
                    <input className="form-input" type="number" name="price" value={form.price}
                      onChange={handleChange} placeholder="2999" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Hours</label>
                    <input className="form-input" type="number" name="duration_hours" value={form.duration_hours}
                      onChange={handleChange} placeholder="48" />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: 24 }} disabled={saving}>
                {saving ? 'Creating...' : 'Create Course as Draft'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewCoursePage;
