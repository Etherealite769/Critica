# Capstone Critica - Setup Guide

## Overview
This project includes Django backend API with JWT authentication and Next.js frontend with login/registration pages.

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
pip install -r requirement.txt
```

### 2. Run Database Migrations
```bash
python manage.py migrate
```

This creates the database tables, including the custom User model.

### 3. Create a Superuser (Optional)
```bash
python manage.py createsuperuser
```

### 4. Start the Backend Server
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`

### API Endpoints
- **POST** `/api/auth/register/` - Register a new user
- **POST** `/api/auth/login/` - Login user
- **GET** `/api/` - Health check

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

### Registration
1. Go to `http://localhost:3000/auth`
2. Fill in the "Sign Up" form with:
   - First Name
   - Last Name
   - Email
   - Password (must match confirmation)
3. Click "Submit Enrollment Form"
4. On success, you'll be redirected to the dashboard

### Login
1. Go to `http://localhost:3000/auth`
2. Click the "Sign In" tab
3. Enter your email and password
4. Click "Proceed to Access"
5. On success, you'll be redirected to the dashboard

### Dashboard
After login, you'll see your account information on the dashboard.

## Features Implemented

### Backend
- ✅ Custom User model with email uniqueness
- ✅ User registration with validation
- ✅ User login with JWT tokens
- ✅ Token refresh mechanism
- ✅ Password confirmation validation
- ✅ Email uniqueness validation

### Frontend
- ✅ Authentication page with Sign Up/Sign In tabs
- ✅ Form validation and error handling
- ✅ Token storage in localStorage
- ✅ Protected dashboard page
- ✅ Logout functionality
- ✅ Responsive design matching provided UI mockups

## Design
The authentication forms are styled based on the provided mockup images:
- Registration form: "NEW STUDENT ENROLLMENT FORM"
- Login form: "OFFICIAL STUDENT AUTHENTICATION DOCUMENT"

## Troubleshooting

### CORS Issues
If you encounter CORS errors, ensure both the backend and frontend are running and that `CORS_ALLOWED_ORIGINS` in `backend/config/settings.py` includes `http://localhost:3000`.

### Database Issues
If you get database errors, delete `db.sqlite3` and run migrations again:
```bash
rm backend/db.sqlite3
cd backend
python manage.py migrate
```

### Port Conflicts
- Backend runs on port 8000 by default
- Frontend runs on port 3000 by default

If ports are in use, specify different ones:
```bash
# Backend on different port
python manage.py runserver 8001

# Frontend on different port
npm run dev -- -p 3001
```
