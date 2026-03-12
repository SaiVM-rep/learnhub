# Agile Project: Core Architecture & Setup Guide

This document provides an overview of the web application's core components, essential files, and detailed instructions for running the application and logging in as different user types.

## 1. Core Components & Folder Structure

The application follows a modern decoupled architecture:
- **Backend:** A Django REST Framework API providing data, authentication, and business logic.
- **Frontend:** A React.js single-page application (SPA) providing the user interface.
- **Database:** SQLite (default for development), stored in `backend/db.sqlite3`.

### Backend Components (`/backend`)
*   **`backend/settings.py`**: The central configuration file for the Django project. It defines installed apps, database connections, CORS settings, and JWT authentication rules.
*   **`backend/urls.py`**: The main URL router that connects incoming API requests to the appropriate application modules.
*   **`manage.py`**: The Django command-line utility used to run the server, execute database migrations, and create superusers.
*   **`core/`**: likely handles fundamental functionalities like custom User models (authentication).
*   **`courses/`, `payments/`, `assessments/`, `analytics/`**: Feature-specific Django applications handling their respective domains via REST APIs.

### Frontend Components (`/frontend`)
*   **`package.json`**: Defines frontend dependencies (React, React Router, Axios) and scripts (`npm start`, `npm build`).
*   **`src/App.js`**: The main React component that handles application routing. It defines protected routes (like `/dashboard`) and public routes (like `/login`, `/register`).
*   **`src/context/AuthContext.js`**: Manages the global authentication state (login status, user tokens) across the React application.
*   **`src/pages/`**: Contains the main view components like `HomePage.js`, `LoginPage.js`, and `DashboardPage.js`.

---

## 2. How to Run the Website (Development Mode)

Running the application requires starting both the backend server and the frontend development server simultaneously in two separate terminals.

### Step 1: Start the Backend (Django)
1. Open a terminal in VS Code or your preferred command line tool.
2. Navigate to the backend directory:
   ```bash
   cd c:\Users\saivi\OneDrive\Desktop\Agile_project\backend
   ```
3. Run the Django development server:
   ```bash
   python manage.py runserver
   ```
   *(The backend API will now be accessible at `http://127.0.0.1:8000`)*

### Step 2: Start the Frontend (React)
1. Open a **second, completely separate terminal** window.
2. Navigate to the frontend directory:
   ```bash
   cd c:\Users\saivi\OneDrive\Desktop\Agile_project\frontend
   ```
3. Start the React development server:
   ```bash
   npm start
   ```
   *(The React app will automatically open in your default browser at `http://localhost:3000`)*

---

## 3. Login Instructions

The application uses a custom user model configured in Django (`core.User`) and JWT (JSON Web Tokens) for authentication.

### For Students (Regular Users)
1. Ensure both the frontend and backend are running as described above.
2. Navigate to the frontend login page in your browser: `http://localhost:3000/login`.
3. Enter your student email/username and password.
4. If you do not have an account, click the **Register** button (or navigate to `http://localhost:3000/register`) to create a new student account.
5. Upon successful login, you will be redirected to the secure **Dashboard** (`/dashboard`).

### For Staff / Administrators
Staff and Administrators have extra privileges, including access to the Django backend management panel where database entries can be edited.

1. **Creating a Staff Account (If none exists):**
   Open a terminal, navigate to the `backend` folder, and run:
   ```bash
   python manage.py createsuperuser
   ```
   Follow the prompts to enter an email, username, and password.

2. **Accessing the Application (as a user):**
   You can log into the main React frontend (`http://localhost:3000/login`) using your Staff credentials just like a normal user to view the web app.

3. **Accessing the Admin Portal (Database Management):**
   To manage the website's backend data (users, courses, payments):
   - Navigate to `http://127.0.0.1:8000/admin` in your web browser.
   - Use your Staff/Superuser credentials to log in.
   - Here, you can view the SQLite tables, manage user permissions, and oversee the `core_user` tables directly.
