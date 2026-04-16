import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, LogOut, Menu, Moon, Sun } from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, isInstructor, logout } = useAuth();
  const location = useLocation();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const getInitials = (user) => {
    if (!user) return '?';
    return `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || user.email[0].toUpperCase();
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="navbar-brand">
          <div className="brand-icon">
            <BookOpen size={20} />
          </div>
          LearnHub
        </Link>

        <div className="navbar-links">
          <Link to="/" className={isActive('/')}>Home</Link>
          <Link to="/courses" className={isActive('/courses')}>Courses</Link>
          {isAuthenticated && !isInstructor && (
            <Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link>
          )}
          {isInstructor && (
            <>
              <Link to="/instructor/dashboard" className={location.pathname.startsWith('/instructor') ? 'active' : ''}>
                Dashboard
              </Link>
            </>
          )}
        </div>

        <div className="navbar-actions">
          {isAuthenticated ? (
            <>
              <Link to={isInstructor ? '/instructor/dashboard' : '/dashboard'} className="navbar-user">
                <div className="navbar-avatar">{getInitials(user)}</div>
                <div className="navbar-user-info">
                  <span className="navbar-user-name">{user?.first_name} {user?.last_name}</span>
                  <span className="navbar-user-role" style={isInstructor ? { color: '#6C63FF', fontWeight: 600 } : {}}>{isInstructor ? 'Instructor' : user?.role}</span>
                </div>
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={logout}>
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Sign In</Link>
              <Link to="/register" className="btn btn-primary">Get Started</Link>
            </>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => setDark(d => !d)} title={dark ? 'Light mode' : 'Dark mode'}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="navbar-mobile-toggle">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
