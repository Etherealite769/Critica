# Backend - Django REST Framework

Django backend with REST Framework and CORS support for the Capstone-Critica project.

## Setup

1. Create and activate virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install django djangorestframework django-cors-headers
```

3. Run migrations:
```bash
python manage.py migrate
```

4. Create superuser (optional):
```bash
python manage.py createsuperuser
```

## Running the Server

Start the development server:
```bash
python manage.py runserver
```

The server will run on `http://localhost:8000`

## API Endpoints

- API Root: `http://localhost:8000/api/`
- Admin: `http://localhost:8000/admin/`

## Configuration

CORS is configured to allow requests from:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

## Project Structure

- `config/` - Main Django project settings
- `api/` - API application with views and URLs
- `manage.py` - Django management script
