import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { instructorAPI } from '../services/api';
import {
  BookOpen, Users, DollarSign, Star, Plus,
  Eye, EyeOff, Trash2, Layers, BarChart3, TrendingUp
} from 'lucide-react';

const InstructorDashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, coursesRes] = await Promise.all([
        instructorAPI.getDashboard(),
        instructorAPI.getCourses(),
      ]);
      setStats(statsRes.data);
      setCourses(coursesRes.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleTogglePublish = async (courseId) => {
    try {
      const res = await instructorAPI.togglePublish(courseId);
      setCourses(prev =>
        prev.map(c => c.id === courseId ? { ...c, is_published: res.data.is_published } : c)
      );
      fetchData();
    } catch (err) {
      console.error('Toggle publish failed:', err);
    }
  };

  const handleDelete = async (courseId, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await instructorAPI.deleteCourse(courseId);
      setCourses(prev => prev.filter(c => c.id !== courseId));
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '100px 0', textAlign: 'center' }}>
        <div className="skeleton" style={{ width: 300, height: 32, margin: '0 auto 16px' }} />
        <div className="skeleton" style={{ width: 200, height: 20, margin: '0 auto' }} />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="container">

        {/* Welcome Header */}
        <div className="dashboard-header">
          <div className="instructor-welcome">
            <div className="instructor-avatar">
              {(user?.first_name || 'I')[0]}{(user?.last_name || '')[0]}
            </div>
            <div>
              <h1>Welcome back, {user?.first_name} {user?.last_name}</h1>
              <span className="instructor-badge">Instructor Mode</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="dashboard-stats">
          {[
            { label: 'Total Courses', value: stats?.total_courses || 0, icon: <BookOpen size={22} />, cls: 'purple' },
            { label: 'Total Students', value: stats?.total_students || 0, icon: <Users size={22} />, cls: 'green' },
            { label: 'Total Revenue', value: `₹${(stats?.total_revenue || 0).toLocaleString()}`, icon: <DollarSign size={22} />, cls: 'amber' },
            { label: 'Avg Rating', value: stats?.average_rating || '0.0', icon: <Star size={22} />, cls: 'rose' },
          ].map((card, i) => (
            <div key={i} className="stat-card">
              <div className="stat-card-header">
                <div className={`stat-card-icon ${card.cls}`}>{card.icon}</div>
                <TrendingUp size={16} color="var(--success)" />
              </div>
              <div className="stat-card-value">{card.value}</div>
              <div className="stat-card-label">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="instructor-actions">
          <Link to="/instructor/courses/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> Add New Course
          </Link>
          <Link to="/courses" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={18} /> View Public Courses
          </Link>
        </div>

        {/* My Courses Table */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span className="dashboard-card-title">My Courses</span>
          </div>

          {courses.length === 0 ? (
            <div className="dashboard-card-body" style={{ textAlign: 'center', padding: 48 }}>
              <BookOpen size={48} style={{ marginBottom: 16, color: 'var(--gray-300)' }} />
              <p style={{ color: 'var(--gray-500)', marginBottom: 12 }}>No courses yet. Create your first course!</p>
              <Link to="/instructor/courses/new" className="btn btn-primary">
                <Plus size={16} style={{ marginRight: 6 }} /> Create Course
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="instructor-table">
                <thead>
                  <tr>
                    {['Course', 'Category', 'Students', 'Revenue', 'Status', 'Actions'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {courses.map(course => (
                    <tr key={course.id}>
                      <td>
                        <Link to={`/courses/${course.slug}`} className="instructor-course-cell" style={{ textDecoration: 'none' }}>
                          <div className="instructor-course-thumb">
                            <BookOpen size={16} color="rgba(255,255,255,0.7)" />
                          </div>
                          <div>
                            <div className="instructor-course-title">{course.title}</div>
                            <div className="instructor-course-meta">
                              {course.total_lessons || 0} lessons &middot; ₹{Number(course.price).toLocaleString()}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="instructor-table-text">{course.category_name || '—'}</td>
                      <td className="instructor-table-bold">{course.enrollment_count || 0}</td>
                      <td className="instructor-table-revenue">₹{(course.revenue || 0).toLocaleString()}</td>
                      <td>
                        <span className={`instructor-status ${course.is_published ? 'published' : 'draft'}`}>
                          {course.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td>
                        <div className="instructor-actions-cell">
                          <Link
                            to={`/instructor/courses/${course.id}/curriculum`}
                            title="Manage Sections & Videos"
                            className="instructor-action-btn curriculum"
                          >
                            <Layers size={14} />
                          </Link>
                          <button
                            onClick={() => handleTogglePublish(course.id)}
                            title={course.is_published ? 'Unpublish' : 'Publish'}
                            className={`instructor-action-btn ${course.is_published ? 'unpublish' : 'publish'}`}
                          >
                            {course.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={() => handleDelete(course.id, course.title)}
                            title="Delete"
                            className="instructor-action-btn delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboardPage;
