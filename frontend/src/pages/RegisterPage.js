import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Phone, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    password: '', confirm_password: '', role: 'STUDENT',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validate = () => {
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.password) {
      return 'Please fill in all required fields.';
    }
    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (formData.password !== formData.confirm_password) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const result = await register({
      ...formData,
      username: formData.email.split('@')[0],
    });

    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: '480px' }}>
        <div className="auth-card">
          <div className="auth-header">
            <h1>Create Account</h1>
            <p>Join thousands of learners on LearnHub</p>
          </div>

          {error && (
            <div className="auth-alert error">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {success && (
            <div className="auth-alert success">
              <CheckCircle size={16} /> Registration successful! Redirecting to login...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">First Name *</label>
                <div className="form-input-wrapper">
                  <span className="form-input-icon"><User size={18} /></span>
                  <input
                    type="text" name="first_name" className="form-input"
                    placeholder="John" value={formData.first_name}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Last Name *</label>
                <input
                  type="text" name="last_name" className="form-input"
                  placeholder="Doe" value={formData.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <div className="form-input-wrapper">
                <span className="form-input-icon"><Mail size={18} /></span>
                <input
                  type="email" name="email" className="form-input"
                  placeholder="you@example.com" value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div className="form-input-wrapper">
                <span className="form-input-icon"><Phone size={18} /></span>
                <input
                  type="tel" name="phone" className="form-input"
                  placeholder="+91 9876543210" value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">I want to join as</label>
              <select
                name="role" className="form-select"
                value={formData.role} onChange={handleChange}
              >
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <div className="form-input-wrapper">
                <span className="form-input-icon"><Lock size={18} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password" className="form-input"
                  placeholder="Min 8 characters" value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button" className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <div className="form-input-wrapper">
                <span className="form-input-icon"><Lock size={18} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirm_password" className="form-input"
                  placeholder="Repeat your password" value={formData.confirm_password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button
              type="submit" className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={loading || success}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
