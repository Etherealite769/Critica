import os
import sys

from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        from django.conf import settings
        if getattr(settings, 'TESTING', False):
            return
        # Only when actually serving: gunicorn, or the reloaded child of runserver
        serving = (
            'gunicorn' in os.path.basename(sys.argv[0])
            or ('runserver' in sys.argv and os.environ.get('RUN_MAIN') == 'true')
        )
        if serving:
            from .email_transport import check_email_transport_async
            check_email_transport_async()
