# LearnHub AI - Project Reference

## Project Overview
AI-powered educational platform built with **Django 5 (REST)** backend and **React 18** frontend.
- **Database**: SQLite (db.sqlite3)
- **Auth**: JWT via SimpleJWT (access: 30min, refresh: 7 days, rotation + blacklist)
- **AI Chatbot**: Groq API with `llama-3.3-70b-versatile`
- **Custom User Model**: `core.User` with roles: STUDENT, INSTRUCTOR, ADMIN

## Directory Structure
```
backend/
  backend/settings.py        # Django config, JWT, CORS, DB
  core/                      # Auth, User model, sessions
    models.py                # User, UserSession
    views.py                 # Register, Login, Logout, Profile
    serializers.py           # RegisterSerializer, LoginSerializer, UserSerializer
    urls.py                  # /api/auth/*
  courses/                   # Course management
    models.py                # Category, Course, Module, Lesson, Enrollment, Review
    views.py                 # Public course views + Admin category CRUD
    instructor_views.py      # Instructor dashboard, course CRUD, curriculum
    serializers.py           # CategorySerializer, CourseList/Detail, Enrollment, Review
    instructor_serializers.py # Instructor-specific serializers
    permissions.py           # IsInstructor, IsAdmin, IsInstructorOwner
    urls.py                  # /api/courses/*
    instructor_urls.py       # /api/instructor/*
    enrollment_views.py      # Enroll + check enrollment
    enrollment_urls.py       # /api/enrollments/*
  chatbot/                   # AI chatbot
    models.py                # ChatSession, ChatMessage
    views.py                 # /api/chatbot/message/, /api/chatbot/history/
  assessments/               # Tests & quizzes (models only, views not implemented)
  analytics/                 # Student analytics (models only, views not implemented)
  payments/                  # Payment processing (models only, views not implemented)
  notifications/             # Notifications (models only, views not implemented)

frontend/src/
  App.js                     # Routes, AuthProvider, Navbar/Footer layout
  context/AuthContext.js     # Auth state, login/register/logout methods
  services/api.js            # Axios instance, JWT interceptors, all API methods
  pages/
    HomePage.js              # Landing page with features + featured courses
    LoginPage.js             # Login form
    RegisterPage.js          # Registration with role selection
    CoursesPage.js           # Course listing with search/filter/sort
    CourseDetailPage.js      # Course detail, curriculum, enrollment, video player
    DashboardPage.js         # Student dashboard with charts
    InstructorDashboardPage.js # Instructor stats + course management
    NewCoursePage.js         # Create course form
    CourseBuilderPage.js     # Curriculum editor (modules + lessons)
  components/
    layout/Navbar.js         # Navigation bar
    layout/Footer.js         # Footer
    chat/LearningChatbot.js  # Floating AI chatbot widget
```

## API Endpoints

### Auth (`/api/auth/`)
| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| POST | `/register/` | AllowAny | Register user |
| POST | `/login/` | AllowAny | Login, returns JWT |
| POST | `/logout/` | Auth | Blacklist refresh token |
| POST | `/refresh/` | AllowAny | Refresh access token |
| GET/PATCH | `/profile/` | Auth | View/update profile |

### Courses (`/api/courses/`)
| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| GET | `/categories/` | AllowAny | List categories (with color) |
| POST | `/categories/create/` | IsAdmin | Create category |
| PATCH | `/categories/<uuid>/` | IsAdmin | Update category |
| DELETE | `/categories/<uuid>/delete/` | IsAdmin | Delete category |
| GET | `/` | AllowAny | List published courses (search, category, difficulty, sort) |
| GET | `/<slug>/` | AllowAny | Course detail with modules/lessons |
| GET | `/enrollments/my/` | Auth | Student's enrollments |

### Instructor (`/api/instructor/`)
| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| GET | `/dashboard/` | IsInstructor | Stats |
| GET | `/courses/` | IsInstructor | List own courses |
| POST | `/courses/create/` | IsInstructor | Create course (auto-slug) |
| PATCH | `/courses/<uuid>/` | IsInstructor+Owner | Update course |
| DELETE | `/courses/<uuid>/delete/` | IsInstructor+Owner | Delete course |
| POST | `/courses/<uuid>/toggle-publish/` | IsInstructor+Owner | Toggle publish |
| GET | `/courses/<uuid>/curriculum/` | IsInstructor+Owner | Full curriculum |
| POST | `/courses/<uuid>/sections/` | IsInstructor+Owner | Create module |
| PATCH | `/sections/<uuid>/` | IsInstructor+Owner | Update module |
| DELETE | `/sections/<uuid>/delete/` | IsInstructor+Owner | Delete module |
| POST | `/sections/<uuid>/lessons/` | IsInstructor+Owner | Create lesson |
| PATCH | `/lessons/<uuid>/` | IsInstructor+Owner | Update lesson |
| DELETE | `/lessons/<uuid>/delete/` | IsInstructor+Owner | Delete lesson |

### Enrollments (`/api/enrollments/`)
| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| POST | `/` | Auth | Enroll (body: course_id) |
| GET | `/check/<uuid>/` | Auth | Check enrollment status |

### Chatbot (`/api/chatbot/`)
| Method | Path | Permission | Purpose |
|--------|------|-----------|---------|
| POST | `/message/` | Auth | Send message (body: message, course_id) |
| GET | `/history/` | Auth | Chat history (query: course_id) |

## Key Models

### Category
`id(UUID), name(unique), slug(unique), description, icon, color(CSS gradient)`

### Course
`id(UUID), title, slug(unique), description, short_description, instructor(FK User), category(FK), price, thumbnail, duration_hours, difficulty(BEGINNER/INTERMEDIATE/ADVANCED), is_active, is_published, is_featured`
- Properties: `enrollment_count, average_rating, total_lessons, total_duration_minutes, revenue`

### Module
`id(UUID), course(FK), title, description, order`

### Lesson
`id(UUID), module(FK), title, content, lesson_type(VIDEO/TEXT/QUIZ), video_url, duration_minutes, order, is_preview`

### Enrollment
`id(UUID), student(FK), course(FK), enrolled_at, valid_until, progress, is_active, completed_at` (unique: student+course)

### User
`id(UUID), email(unique), username, first_name, last_name, role(STUDENT/INSTRUCTOR/ADMIN), phone, avatar, is_active`

## Frontend Routes
| Path | Component | Protection |
|------|-----------|-----------|
| `/` | HomePage | Public |
| `/login` | LoginPage | GuestRoute |
| `/register` | RegisterPage | GuestRoute |
| `/courses` | CoursesPage | Public |
| `/courses/:slug` | CourseDetailPage | Public |
| `/dashboard` | DashboardPage | ProtectedRoute |
| `/instructor/dashboard` | InstructorDashboardPage | InstructorRoute |
| `/instructor/courses/new` | NewCoursePage | InstructorRoute |
| `/instructor/courses/:id/curriculum` | CourseBuilderPage | InstructorRoute |

## Category Colors (Stored in DB)
| Category | Gradient |
|----------|----------|
| Web Development | `linear-gradient(135deg, #6366f1, #8b5cf6)` (purple) |
| Data Science | `linear-gradient(135deg, #0ea5e9, #06b6d4)` (cyan) |
| Machine Learning | `linear-gradient(135deg, #f59e0b, #f97316)` (amber) |
| Mobile Development | `linear-gradient(135deg, #10b981, #14b8a6)` (green) |
| Cloud Computing | `linear-gradient(135deg, #ef4444, #f97316)` (red-orange) |
| Cybersecurity | `linear-gradient(135deg, #8b5cf6, #ec4899)` (purple-pink) |

## Test Accounts (from seed_data)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@learnhub.com | admin123 |
| Instructor | john.smith@learnhub.com | instructor123 |
| Instructor | sarah.jones@learnhub.com | instructor123 |
| Student | student@learnhub.com | student123 |

## Important Conventions
- **API keys**: Never hardcode. Use `.env` + `settings.py` pattern. GROQ_API_KEY is in .env
- **UUIDs**: All model primary keys are UUID4
- **Slugs**: Courses use slug for URLs, auto-generated from title
- **Pagination**: 12 items per page (REST framework default)
- **CORS**: localhost:3000 allowed in dev
- **Frontend state**: Auth stored in localStorage (tokens + user object)

## Changelog

### Session 1 - Initial Setup
- Full Django backend with core, courses, chatbot, assessments, analytics, payments, notifications apps
- React frontend with pages, components, routing, auth context
- JWT authentication with refresh token rotation
- Course CRUD for instructors with curriculum builder
- AI chatbot with Groq API integration
- Student dashboard with Recharts visualizations

### Session 2 - UI Fixes & Features
1. **Course edit save button** - Fixed save functionality for course editing
2. **Logout redirect** - Logout button now redirects to login page
3. **Student "Go to Course" button** - Now navigates to course curriculum
4. **Analytics dark mode hover** - Fixed hover styles to match dark theme

### Session 3 - Category Colors & Admin Management
1. **Category color field** - Added `color` field to Category model (CSS gradient string)
2. **Migration** - `0003_add_category_color.py` adds color to categories table
3. **Admin category CRUD API** - Added `POST /categories/create/`, `PATCH /categories/<id>/`, `DELETE /categories/<id>/delete/` (IsAdmin permission)
4. **IsAdmin permission** - New permission class in `permissions.py`
5. **Course cards use category color** - CoursesPage, HomePage, CourseDetailPage all read `category_color` from API instead of using index-based gradient cycling
6. **Django admin** - CategoryAdmin now shows and allows editing color field
7. **Seed data** - Categories now include color values
8. **Frontend API service** - Added `adminCategoryAPI` with create/update/delete methods

### Chatbot System Prompt
- Casual, friendly "AI study buddy" persona
- Responds in 1-2 short sentences max
- Uses Groq API: llama-3.3-70b-versatile, temp=0.8, max_tokens=150
- Keeps last 20 messages for context
