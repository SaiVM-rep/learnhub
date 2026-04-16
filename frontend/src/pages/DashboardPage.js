import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseAPI, analyticsAPI } from '../services/api';
import {
  BookOpen, Award, Clock, TrendingUp, Star, Play,
  CheckCircle, BarChart3, ClipboardList, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const DashboardPage = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [enrollRes, analyticsRes] = await Promise.all([
          courseAPI.getMyEnrollments(),
          analyticsAPI.getDashboard(),
        ]);
        setEnrollments(enrollRes.data?.results || enrollRes.data || []);
        setAnalytics(analyticsRes.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const stats = analytics?.stats || {};
  const lessonStatus = analytics?.lesson_status || {};
  const quizScores = analytics?.quiz_scores || [];
  const recentActivity = analytics?.recent_activity || [];

  // Chart data
  const performanceData = quizScores.map(q => ({
    topic: q.quiz_title?.length > 15 ? q.quiz_title.substring(0, 15) + '...' : q.quiz_title,
    score: q.score,
  }));

  // Radar: aggregate quiz scores by course
  const courseScoreMap = {};
  quizScores.forEach(q => {
    if (!courseScoreMap[q.course_title]) {
      courseScoreMap[q.course_title] = { total: 0, count: 0 };
    }
    courseScoreMap[q.course_title].total += q.score;
    courseScoreMap[q.course_title].count += 1;
  });
  const radarData = Object.entries(courseScoreMap).map(([course, data]) => ({
    subject: course.length > 12 ? course.substring(0, 12) + '...' : course,
    A: Math.round(data.total / data.count),
    fullMark: 100,
  }));

  const pieData = [
    { name: 'Completed', value: lessonStatus.completed || 0, color: '#10b981' },
    { name: 'In Progress', value: lessonStatus.in_progress || 0, color: '#6366f1' },
  ];
  const hasPieData = pieData.some(d => d.value > 0);

  const formatTimeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="container">
          <div className="dashboard-header">
            <div className="skeleton" style={{ width: 300, height: 32, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 200, height: 16 }} />
          </div>
          <div className="dashboard-stats">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="stat-card">
                <div className="skeleton" style={{ width: '100%', height: 80 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="container">
        {/* Header */}
        <div className="dashboard-header">
          <h1>Welcome back, {user?.first_name || 'Student'}!</h1>
          <p>Here's your learning progress and performance</p>
        </div>

        {/* Stats Cards */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon purple"><BookOpen size={22} /></div>
              <TrendingUp size={16} color="var(--success)" />
            </div>
            <div className="stat-card-value">{stats.enrolled_courses || 0}</div>
            <div className="stat-card-label">Enrolled Courses</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon green"><CheckCircle size={22} /></div>
              <TrendingUp size={16} color="var(--success)" />
            </div>
            <div className="stat-card-value">{stats.completed_lessons || 0}</div>
            <div className="stat-card-label">Lessons Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon amber"><Award size={22} /></div>
            </div>
            <div className="stat-card-value">{stats.average_score || 0}%</div>
            <div className="stat-card-label">Average Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon blue"><Clock size={22} /></div>
            </div>
            <div className="stat-card-value">
              {stats.total_learning_minutes
                ? (stats.total_learning_minutes >= 60
                  ? `${Math.round(stats.total_learning_minutes / 60)}h`
                  : `${stats.total_learning_minutes}m`)
                : '0h'}
            </div>
            <div className="stat-card-label">Learning Time</div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="dashboard-grid">
          {/* Left Column */}
          <div>
            {/* My Courses */}
            <div className="dashboard-card" style={{ marginBottom: 24 }}>
              <div className="dashboard-card-header">
                <span className="dashboard-card-title">My Courses</span>
                <Link to="/courses" className="btn btn-ghost btn-sm">Browse More</Link>
              </div>
              <div className="dashboard-card-body">
                {enrollments.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)' }}>
                    <BookOpen size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                    <div>No courses enrolled yet.</div>
                    <Link to="/courses" className="btn btn-primary" style={{ marginTop: 12 }}>Browse Courses</Link>
                  </div>
                ) : (
                  enrollments.map((enrollment) => (
                    <Link
                      key={enrollment.id}
                      to={`/courses/${enrollment.course?.slug || ''}`}
                      className="enrollment-item"
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="enrollment-thumb">
                        <div
                          className="enrollment-thumb-placeholder"
                          style={{ background: enrollment.course?.category_color || 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                        >
                          <BookOpen size={20} color="rgba(255,255,255,0.6)" />
                        </div>
                      </div>
                      <div className="enrollment-info">
                        <div className="enrollment-title">{enrollment.course?.title}</div>
                        <div className="enrollment-instructor">
                          {enrollment.course?.instructor_name ||
                            `${enrollment.course?.instructor?.first_name || ''} ${enrollment.course?.instructor?.last_name || ''}`}
                        </div>
                        <div className="enrollment-progress-bar">
                          <div
                            className="enrollment-progress-fill"
                            style={{
                              width: `${Math.round(enrollment.progress || 0)}%`,
                              background: enrollment.progress >= 100 ? 'var(--success)' : undefined
                            }}
                          />
                        </div>
                        <div className="enrollment-progress-text">{Math.round(enrollment.progress || 0)}% complete</div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Performance Chart */}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <span className="dashboard-card-title">Quiz Performance</span>
                <div className="section-badge" style={{ margin: 0 }}>
                  <BarChart3 size={12} /> Scores
                </div>
              </div>
              <div className="dashboard-card-body">
                {performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={performanceData} barRadius={[6, 6, 0, 0]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
                      <XAxis dataKey="topic" tick={{ fontSize: 11, fill: 'var(--gray-500)' }} />
                      <YAxis tick={{ fontSize: 12, fill: 'var(--gray-500)' }} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid var(--gray-200)', background: 'var(--white)', color: 'var(--gray-800)', boxShadow: '0 4px 6px rgba(0,0,0,0.07)' }}
                        labelStyle={{ color: 'var(--gray-800)' }}
                        itemStyle={{ color: 'var(--gray-700)' }}
                        formatter={(value) => [`${value}%`, 'Score']}
                      />
                      <Bar dataKey="score" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
                    <ClipboardList size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                    <div>Take quizzes to see your performance here</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Skill Radar */}
            <div className="dashboard-card" style={{ marginBottom: 24 }}>
              <div className="dashboard-card-header">
                <span className="dashboard-card-title">Course Scores</span>
              </div>
              <div className="dashboard-card-body" style={{ padding: '12px' }}>
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--gray-200)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--gray-500)' }} />
                      <PolarRadiusAxis tick={false} axisLine={false} />
                      <Radar dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                    Complete quizzes to see your course radar
                  </div>
                )}
              </div>
            </div>

            {/* Course Progress Pie */}
            <div className="dashboard-card" style={{ marginBottom: 24 }}>
              <div className="dashboard-card-header">
                <span className="dashboard-card-title">Lesson Status</span>
              </div>
              <div className="dashboard-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {hasPieData ? (
                  <>
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div>
                      {pieData.map((item) => (
                        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.813rem' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }} />
                          <span style={{ color: 'var(--gray-600)' }}>{item.name}</span>
                          <span style={{ fontWeight: 700, color: 'var(--gray-800)', marginLeft: 'auto' }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray-400)', width: '100%', fontSize: '0.875rem' }}>
                    Enroll in courses to track lesson progress
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <span className="dashboard-card-title">Recent Activity</span>
              </div>
              <div className="dashboard-card-body" style={{ padding: '16px 24px' }}>
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="activity-item">
                      <div
                        className="activity-icon"
                        style={{
                          background: activity.type === 'lesson_complete' ? '#d1fae5' : '#fef3c7',
                          color: activity.type === 'lesson_complete' ? '#10b981' : '#f59e0b'
                        }}
                      >
                        {activity.type === 'lesson_complete'
                          ? <CheckCircle size={16} />
                          : <Star size={16} />
                        }
                      </div>
                      <div className="activity-content">
                        <div className="activity-text">{activity.text}</div>
                        <div className="activity-time">{formatTimeAgo(activity.timestamp)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                    <AlertCircle size={20} style={{ marginBottom: 6, opacity: 0.4 }} />
                    <div>Complete lessons or take quizzes to see activity</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
