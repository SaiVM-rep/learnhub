import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    if (tokens.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');

      if (tokens.refresh) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: tokens.refresh,
          });
          const newTokens = response.data;
          localStorage.setItem('tokens', JSON.stringify(newTokens));
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('tokens');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  logout: (data) => api.post('/auth/logout/', data),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
  requestOTP: (email) => api.post('/auth/otp/request/', { email }),
  verifyOTP: (email, otp) => api.post('/auth/otp/verify/', { email, otp }),
};

// Course APIs
export const courseAPI = {
  getCategories: () => api.get('/courses/categories/'),
  getCourses: (params) => api.get('/courses/', { params }),
  getCourseDetail: (slug) => api.get(`/courses/${slug}/`),
  getMyEnrollments: () => api.get('/courses/enrollments/my/'),
};

// Admin Category APIs
export const adminCategoryAPI = {
  create: (data) => api.post('/courses/categories/create/', data),
  update: (id, data) => api.patch(`/courses/categories/${id}/`, data),
  delete: (id) => api.delete(`/courses/categories/${id}/delete/`),
};

// Instructor APIs
export const instructorAPI = {
  getDashboard: () => api.get('/instructor/dashboard/'),
  getCourses: () => api.get('/instructor/courses/'),
  createCourse: (data) => api.post('/instructor/courses/create/', data),
  updateCourse: (id, data) => api.patch(`/instructor/courses/${id}/`, data),
  deleteCourse: (id) => api.delete(`/instructor/courses/${id}/delete/`),
  togglePublish: (id) => api.post(`/instructor/courses/${id}/toggle-publish/`),
  getCurriculum: (id) => api.get(`/instructor/courses/${id}/curriculum/`),
  createModule: (courseId, data) => api.post(`/instructor/courses/${courseId}/sections/`, data),
  updateModule: (id, data) => api.patch(`/instructor/sections/${id}/`, data),
  deleteModule: (id) => api.delete(`/instructor/sections/${id}/delete/`),
  createLesson: (moduleId, data) => api.post(`/instructor/sections/${moduleId}/lessons/`, data),
  updateLesson: (id, data) => api.patch(`/instructor/lessons/${id}/`, data),
  deleteLesson: (id) => api.delete(`/instructor/lessons/${id}/delete/`),
  // YouTube duration auto-detect
  getVideoMetadata: (url) => api.post('/instructor/video-metadata/', { video_url: url }),
  // Quiz management
  createQuiz: (courseId, data) => api.post(`/instructor/courses/${courseId}/quiz/`, data),
  getQuizzes: (courseId) => api.get(`/instructor/courses/${courseId}/quizzes/`),
  getQuiz: (quizId) => api.get(`/instructor/quiz/${quizId}/`),
  updateQuiz: (quizId, data) => api.patch(`/instructor/quiz/${quizId}/update/`, data),
  deleteQuiz: (quizId) => api.delete(`/instructor/quiz/${quizId}/delete/`),
};

// Enrollment APIs
export const enrollmentAPI = {
  enroll: (courseId) => api.post('/enrollments/', { course_id: courseId }),
  checkEnrollment: (courseId) => api.get(`/enrollments/check/${courseId}/`),
};

// Progress APIs
export const progressAPI = {
  markLessonComplete: (lessonId) => api.post(`/courses/lessons/${lessonId}/complete/`),
  getCourseProgress: (courseId) => api.get(`/courses/${courseId}/progress/`),
};

// Quiz APIs (student)
export const quizAPI = {
  getQuizzes: (courseId) => api.get(`/courses/${courseId}/quizzes/`),
  startAttempt: (quizId) => api.post(`/courses/quiz/${quizId}/attempt/`),
  submitAttempt: (attemptId, answers) => api.post(`/courses/quiz/attempt/${attemptId}/submit/`, { answers }),
  getResult: (attemptId) => api.get(`/courses/quiz/attempt/${attemptId}/result/`),
};

// Analytics APIs
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard/'),
};

// Chatbot API
export const chatbotAPI = {
  sendMessage: (message, courseId = null) =>
    api.post('/chatbot/message/', { message, course_id: courseId }),
  getHistory: (courseId = null) =>
    api.get('/chatbot/history/', { params: courseId ? { course_id: courseId } : {} }),
};

export default api;
