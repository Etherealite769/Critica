# Critica

A full-stack project built with **Next.js** for the frontend and **Django REST Framework** for the backend.

## Overview

- **Frontend:** Next.js app running on `http://localhost:3000`
- **Backend:** Django API running on `http://localhost:8000`
- **Database:** SQLite (local development)

## Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://docs.npmjs.com/) 9 or later
- [Python](https://www.python.org/) 3.11 or later

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Capstone-Critica
```

### 2. Start the backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install django djangorestframework django-cors-headers
python manage.py migrate
python manage.py runserver
```

The Django server will be available at `http://localhost:8000`.

### 3. Start the frontend

Open a new terminal window and run:

```bash
cd frontend
npm install
npm run dev
```

The Next.js app will be available at `http://localhost:3000`.

## Project Structure

```text
Capstone-Critica/
├── backend/
│   ├── api/
│   ├── config/
│   └── manage.py
├── frontend/
│   ├── src/app
│   ├── package.json
│   └── next.config.ts
└── README.md
```

## Development Notes

- The frontend expects the backend to be running on `http://localhost:8000`.
- Django CORS is configured for local development at `http://localhost:3000`.
- If you change backend models, run:

```bash
python manage.py makemigrations
python manage.py migrate
```

## Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)

## Troubleshooting

- If `npm install` fails, make sure Node.js is installed and your shell has access to `npm`.
- If the backend cannot connect to the frontend, verify that Django CORS settings include `http://localhost:3000`.
- If `python manage.py runserver` fails, confirm the virtual environment is activated and dependencies are installed.
