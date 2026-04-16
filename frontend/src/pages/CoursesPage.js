import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { courseAPI } from '../services/api';
import { BookOpen, Search, Star, Users, Clock } from 'lucide-react';

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #6366f1, #8b5cf6)';

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton skeleton-image" />
    <div className="skeleton-body">
      <div className="skeleton skeleton-line short" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line medium" />
      <div className="skeleton skeleton-line short" style={{ marginTop: 20 }} />
    </div>
  </div>
);

const CoursesPage = () => {
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sort, setSort] = useState('-created_at');

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      if (difficulty) params.difficulty = difficulty;
      if (sort) params.sort = sort;

      const response = await courseAPI.getCourses(params);
      setCourses(response.data.results || response.data || []);
    } catch (error) {
      // Use sample data as fallback
      setCourses(SAMPLE_COURSES);
    }
    setLoading(false);
  }, [search, category, difficulty, sort]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await courseAPI.getCategories();
        setCategories(response.data || []);
      } catch {
        setCategories([
          { slug: 'web-development', name: 'Web Development' },
          { slug: 'data-science', name: 'Data Science' },
          { slug: 'machine-learning', name: 'Machine Learning' },
          { slug: 'mobile-development', name: 'Mobile Development' },
          { slug: 'cloud-computing', name: 'Cloud Computing' },
          { slug: 'cybersecurity', name: 'Cybersecurity' },
        ]);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(fetchCourses, 300);
    return () => clearTimeout(debounce);
  }, [fetchCourses]);

  return (
    <div className="courses-page">
      <div className="container">
        <div className="courses-page-header">
          <h1>Explore Courses</h1>
          <p>Discover courses designed to accelerate your learning with AI-powered personalization</p>
        </div>

        <div className="courses-filters">
          <div className="form-input-wrapper courses-search">
            <span className="form-input-icon"><Search size={18} /></span>
            <input
              type="text" className="form-input" placeholder="Search courses..."
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select" value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ maxWidth: '200px' }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>{cat.name}</option>
            ))}
          </select>
          <select
            className="form-select" value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            style={{ maxWidth: '180px' }}
          >
            <option value="">All Levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
          <select
            className="form-select" value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{ maxWidth: '180px' }}
          >
            <option value="-created_at">Newest</option>
            <option value="price">Price: Low to High</option>
            <option value="-price">Price: High to Low</option>
            <option value="title">A - Z</option>
          </select>
        </div>

        <div className="courses-count">
          {loading ? 'Loading...' : `${courses.length} courses found`}
        </div>

        {loading ? (
          <div className="courses-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Search size={32} /></div>
            <h3>No courses found</h3>
            <p>Try adjusting your filters or search terms</p>
            <button className="btn btn-primary" onClick={() => { setSearch(''); setCategory(''); setDifficulty(''); }}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map((course, index) => (
              <Link to={`/courses/${course.slug}`} key={course.id || index} className="course-card">
                <div className="course-card-image">
                  {course.thumbnail ? (
                    <img src={course.thumbnail} alt={course.title} />
                  ) : (
                    <div className="course-card-placeholder" style={{ background: course.category_color || DEFAULT_GRADIENT }}>
                      <BookOpen size={48} color="rgba(255,255,255,0.5)" />
                    </div>
                  )}
                  <span className={`course-card-badge badge-${(course.difficulty || 'beginner').toLowerCase()}`}>
                    {course.difficulty}
                  </span>
                  {course.is_featured && <span className="course-card-featured">Featured</span>}
                </div>
                <div className="course-card-body">
                  <div className="course-card-category">{course.category_name || 'General'}</div>
                  <h3 className="course-card-title">{course.title}</h3>
                  <p className="course-card-description">{course.short_description}</p>
                  <div className="course-card-meta">
                    <span className="course-card-meta-item">
                      <Star size={14} color="#f59e0b" fill="#f59e0b" /> {course.average_rating ? Number(course.average_rating).toFixed(1) : '—'}
                    </span>
                    <span className="course-card-meta-item">
                      <Users size={14} /> {(course.enrollment_count || 0).toLocaleString()}
                    </span>
                    <span className="course-card-meta-item">
                      <Clock size={14} /> {course.duration_hours || 0}h
                    </span>
                  </div>
                  <div className="course-card-footer">
                    <div className="course-card-instructor">
                      <div className="course-card-instructor-avatar">
                        {(course.instructor_name || 'IN').split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="course-card-instructor-name">{course.instructor_name || 'Instructor'}</span>
                    </div>
                    <div className="course-card-price">
                      <span className="currency">&#8377;</span>{Number(course.price || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SAMPLE_COURSES = [
  { id: 1, title: 'Full-Stack Web Development with React & Django', slug: 'fullstack-react-django', short_description: 'Build production-ready web apps with React and Django from scratch.', instructor_name: 'John Smith', category_name: 'Web Development', category_color: 'linear-gradient(135deg, #6366f1, #8b5cf6)', price: 2999, difficulty: 'INTERMEDIATE', is_featured: true, duration_hours: 48, enrollment_count: 1240, average_rating: 4.8 },
  { id: 2, title: 'Python for Data Science & Analytics', slug: 'python-data-science', short_description: 'Master data analysis with Python, Pandas, and visualization libraries.', instructor_name: 'Sarah Jones', category_name: 'Data Science', category_color: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', price: 1999, difficulty: 'BEGINNER', is_featured: true, duration_hours: 36, enrollment_count: 2100, average_rating: 4.9 },
  { id: 3, title: 'Deep Learning & Neural Networks Masterclass', slug: 'deep-learning-masterclass', short_description: 'Build AI applications with TensorFlow and PyTorch.', instructor_name: 'John Smith', category_name: 'Machine Learning', category_color: 'linear-gradient(135deg, #f59e0b, #f97316)', price: 3999, difficulty: 'ADVANCED', is_featured: true, duration_hours: 60, enrollment_count: 890, average_rating: 4.7 },
  { id: 4, title: 'React Native Mobile App Development', slug: 'react-native-mobile', short_description: 'Create cross-platform mobile apps with React Native.', instructor_name: 'Sarah Jones', category_name: 'Mobile Development', category_color: 'linear-gradient(135deg, #10b981, #14b8a6)', price: 2499, difficulty: 'INTERMEDIATE', duration_hours: 40, enrollment_count: 650, average_rating: 4.6 },
  { id: 5, title: 'AWS Cloud Architecture & DevOps', slug: 'aws-cloud-devops', short_description: 'Design and deploy scalable cloud solutions on AWS.', instructor_name: 'John Smith', category_name: 'Cloud Computing', category_color: 'linear-gradient(135deg, #ef4444, #f97316)', price: 3499, difficulty: 'ADVANCED', duration_hours: 52, enrollment_count: 780, average_rating: 4.8 },
  { id: 6, title: 'Ethical Hacking & Cybersecurity Fundamentals', slug: 'ethical-hacking-cybersecurity', short_description: 'Master penetration testing and security fundamentals.', instructor_name: 'Sarah Jones', category_name: 'Cybersecurity', category_color: 'linear-gradient(135deg, #8b5cf6, #ec4899)', price: 2799, difficulty: 'INTERMEDIATE', duration_hours: 44, enrollment_count: 920, average_rating: 4.7 },
];

export default CoursesPage;
