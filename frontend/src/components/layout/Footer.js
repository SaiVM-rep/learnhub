import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3>LearnHub</h3>
            <p>
              AI-powered adaptive learning platform that personalizes your education
              journey. Learn at your own pace with intelligent recommendations and
              real-time analytics.
            </p>
          </div>
          <div className="footer-column">
            <h4>Platform</h4>
            <ul>
              <li><Link to="/courses">Browse Courses</Link></li>
              <li><Link to="/dashboard">Dashboard</Link></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Resources</h4>
            <ul>
              <li><a href="#help">Help Center</a></li>
              <li><a href="#blog">Blog</a></li>
              <li><a href="#community">Community</a></li>
              <li><a href="#docs">Documentation</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Company</h4>
            <ul>
              <li><a href="#about">About Us</a></li>
              <li><a href="#careers">Careers</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; 2026 LearnHub. Team Debuggers - All rights reserved.</span>
          <span>Built with AI-Powered Adaptive Learning</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
