"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_asgi_application()


# Before any request is served: make sure the SQLite telemetry_logs table exists (idempotent; a fresh deploy
# that never ran `manage.py migrate` would otherwise fail every telemetry write with "no such table").
try:
    from api.scaffold.telemetry_db import ensure_telemetry_table
    ensure_telemetry_table()
except Exception:  # never block startup; the logger retries the table check on its own
    import logging
    logging.getLogger(__name__).exception("Telemetry table check failed at startup")
