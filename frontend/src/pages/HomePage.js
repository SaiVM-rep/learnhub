import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Brain, Shield, Video, BarChart3, MessageCircle,
  ArrowRight, Play, Star, Users, Award, Zap
} from 'lucide-react';

const SAMPLE_COURSES = [
  {
    id: 1, title: 'Full-Stack Web Development with React & Django',
    slug: 'fullstack-react-django',
    short_description: 'Build production-ready web apps with React and Django from scratch.',
    instructor_name: 'John Smith', category_name: 'Web Development',
    price: 2999, difficulty: 'INTERMEDIATE', is_featured: true,
    duration_hours: 48, enrollment_count: 1240, average_rating: 4.8,
    category_color: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  },
  {
    id: 2, title: 'Python for Data Science & Analytics',
    slug: 'python-data-science',
    short_description: 'Master data analysis with Python, Pandas, and visualization libraries.',
    instructor_name: 'Sarah Jones', category_name: 'Data Science',
    price: 1999, difficulty: 'BEGINNER', is_featured: true,
    duration_hours: 36, enrollment_count: 2100, average_rating: 4.9,
    category_color: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
  },
  {
    id: 3, title: 'Deep Learning & Neural Networks Masterclass',
    slug: 'deep-learning-masterclass',
    short_description: 'Build AI applications with TensorFlow and PyTorch.',
    instructor_name: 'John Smith', category_name: 'Machine Learning',
    price: 3999, difficulty: 'ADVANCED', is_featured: true,
    duration_hours: 60, enrollment_count: 890, average_rating: 4.7,
    category_color: 'linear-gradient(135deg, #f59e0b, #f97316)',
  },
];

const FEATURES = [
  { icon: <Brain size={24} />, color: 'purple', title: 'AI-Powered Analytics', description: 'ML models analyze your performance, identify weak areas, and predict outcomes to optimize your learning path.' },
  { icon: <Video size={24} />, color: 'blue', title: 'Secure Video Streaming', description: 'Watch lectures with dynamic watermarking and time-limited signed URLs for content protection.' },
  { icon: <Shield size={24} />, color: 'green', title: 'Secure Assessment', description: 'Take proctored tests with tab-switch detection, auto-submission timers, and anti-cheating measures.' },
  { icon: <BarChart3 size={24} />, color: 'amber', title: 'Progress Dashboard', description: 'Interactive charts showing topic scores, weak areas, trends, and personalized recommendations.' },
  { icon: <MessageCircle size={24} />, color: 'teal', title: 'AI Chatbot Support', description: 'NLP chatbot trained on lecture transcripts answers your questions with source citations.' },
  { icon: <Zap size={24} />, color: 'red', title: 'Adaptive Learning', description: 'Reinforcement learning adjusts question difficulty based on your performance for optimal challenge.' },
];

const HomePage = () => {
  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1>
                Learn Smarter with <span>AI-Powered</span> Education
              </h1>
              <p>
                Experience personalized learning that adapts to you. Our platform uses
                machine learning to analyze your performance, recommend content, and
                optimize your learning path in real time.
              </p>
              <div className="hero-actions">
                <Link to="/register" className="hero-btn-primary">
                  Start Learning Free <ArrowRight size={18} />
                </Link>
                <Link to="/courses" className="hero-btn-secondary">
                  <Play size={18} /> Browse Courses
                </Link>
              </div>
              <div className="hero-stats">
                <div className="hero-stat">
                  <div className="hero-stat-number">50+</div>
                  <div className="hero-stat-label">Expert Courses</div>
                </div>
                <div className="hero-stat">
                  <div className="hero-stat-number">10K+</div>
                  <div className="hero-stat-label">Active Students</div>
                </div>
                <div className="hero-stat">
                  <div className="hero-stat-number">95%</div>
                  <div className="hero-stat-label">Success Rate</div>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-card">
                <div className="hero-card-header">
                  <div className="hero-card-icon">
                    <BarChart3 size={24} />
                  </div>
                  <div>
                    <div className="hero-card-title">Your Progress</div>
                    <div className="hero-card-subtitle">AI-Analyzed Performance</div>
                  </div>
                </div>
                <div className="hero-progress-list">
                  {[
                    { label: 'React Basics', value: 92, color: '#10b981' },
                    { label: 'Python ML', value: 78, color: '#6366f1' },
                    { label: 'Data Structures', value: 65, color: '#f59e0b' },
                    { label: 'System Design', value: 45, color: '#0ea5e9' },
                  ].map((item) => (
                    <div key={item.label} className="hero-progress-item">
                      <span className="hero-progress-label">{item.label}</span>
                      <div className="hero-progress-bar-bg">
                        <div
                          className="hero-progress-bar-fill"
                          style={{ width: `${item.value}%`, background: item.color }}
                        />
                      </div>
                      <span className="hero-progress-value">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">
              <Zap size={14} /> Platform Features
            </div>
            <h2>Everything You Need to Excel</h2>
            <p>Our platform combines cutting-edge AI with proven pedagogical methods to deliver a superior learning experience.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className={`feature-icon ${feature.color}`}>{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="courses-section">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">
              <Award size={14} /> Featured Courses
            </div>
            <h2>Start Your Learning Journey</h2>
            <p>Handpicked courses designed by industry experts to accelerate your career growth.</p>
          </div>
          <div className="courses-grid">
            {SAMPLE_COURSES.map((course) => (
              <Link to={`/courses/${course.slug}`} key={course.id} className="course-card">
                <div className="course-card-image">
                  <div className="course-card-placeholder" style={{ background: course.category_color }}>
                    <BookOpen size={48} color="rgba(255,255,255,0.5)" />
                  </div>
                  <span className={`course-card-badge badge-${course.difficulty.toLowerCase()}`}>
                    {course.difficulty}
                  </span>
                  {course.is_featured && (
                    <span className="course-card-featured">Featured</span>
                  )}
                </div>
                <div className="course-card-body">
                  <div className="course-card-category">{course.category_name}</div>
                  <h3 className="course-card-title">{course.title}</h3>
                  <p className="course-card-description">{course.short_description}</p>
                  <div className="course-card-meta">
                    <span className="course-card-meta-item">
                      <Star size={14} color="#f59e0b" fill="#f59e0b" /> {course.average_rating}
                    </span>
                    <span className="course-card-meta-item">
                      <Users size={14} /> {course.enrollment_count.toLocaleString()}
                    </span>
                    <span className="course-card-meta-item">
                      {course.duration_hours}h
                    </span>
                  </div>
                  <div className="course-card-footer">
                    <div className="course-card-instructor">
                      <div className="course-card-instructor-avatar">
                        {course.instructor_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="course-card-instructor-name">{course.instructor_name}</span>
                    </div>
                    <div className="course-card-price">
                      <span className="currency">&#8377;</span>{course.price.toLocaleString()}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link to="/courses" className="btn btn-primary btn-lg">
              View All Courses <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
