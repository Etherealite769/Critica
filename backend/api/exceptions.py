# backend/api/exceptions.py
"""
DRF exception handler that always answers in JSON.

DRF's default handler returns None for non-API exceptions (e.g. a misconfigured
throttle raising ImproperlyConfigured), which makes Django render an HTML 500
page that the frontend can't parse. This keeps the response JSON so clients can
show a meaningful error.
"""
import logging

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def json_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        return response

    view = context.get('view')
    logger.exception('Unhandled API error in %s', type(view).__name__ if view else 'unknown view')
    detail = f'{type(exc).__name__}: {exc}' if settings.DEBUG else 'Internal server error.'
    return Response({'detail': detail}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
