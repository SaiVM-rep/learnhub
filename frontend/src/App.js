import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import DashboardPage from './pages/DashboardPage';
import InstructorDashboardPage from './pages/InstructorDashboardPage';
import CourseBuilderPage from './pages/CourseBuilderPage';
import NewCoursePage from './pages/NewCoursePage';
import QuizPage from './pages/QuizPage';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const InstructorRoute = ({ children }) => {
  const { isAuthenticated, isInstructor } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!isInstructor) return <Navigate to="/dashboard" />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { isAuthenticated, isInstructor } = useAuth();
  if (!isAuthenticated) return children;
  return isInstructor ? <Navigate to="/instructor/dashboard" /> : <Navigate to="/dashboard" />;
};

function AppContent() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:slug" element={<CourseDetailPage />} />
          <Route path="/courses/:slug/quiz/:quizId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/instructor/dashboard" element={<InstructorRoute><InstructorDashboardPage /></InstructorRoute>} />
          <Route path="/instructor/courses/new" element={<InstructorRoute><NewCoursePage /></InstructorRoute>} />
          <Route path="/instructor/courses/:courseId/curriculum" element={<InstructorRoute><CourseBuilderPage /></InstructorRoute>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
