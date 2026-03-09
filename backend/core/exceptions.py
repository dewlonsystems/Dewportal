import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError


logger = logging.getLogger('core')


def core_exception_handler(exc, context):
    """
    Custom exception handler for DRF.
    
    Provides consistent error response format across all API endpoints.
    Logs all exceptions for debugging and audit purposes.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    # Get request and view from context
    request = context.get('request')
    view = context.get('view')

    # Log the exception
    logger.error(
        f"Exception in {view.__class__.__name__ if view else 'Unknown'} | "
        f"Path: {request.path if request else 'Unknown'} | "
        f"Exception: {type(exc).__name__}: {str(exc)}",
        exc_info=True
    )

    # If response is None, handle uncaught exceptions
    if response is None:
        if isinstance(exc, DjangoValidationError):
            response = Response(
                {
                    'error': 'Validation failed',
                    'details': exc.messages if hasattr(exc, 'messages') else str(exc)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        elif isinstance(exc, IntegrityError):
            response = Response(
                {
                    'error': 'Database integrity error',
                    'details': 'The operation could not be completed due to a database constraint.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        elif isinstance(exc, PermissionError):
            response = Response(
                {
                    'error': 'Permission denied',
                    'details': 'You do not have permission to perform this action.'
                },
                status=status.HTTP_403_FORBIDDEN
            )
        else:
            response = Response(
                {
                    'error': 'Internal server error',
                    'details': 'An unexpected error occurred. Please try again later.'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # Standardize error response format
    if response is not None and response.status_code >= 400:
        # Ensure consistent error structure
        if 'error' not in response.data:
            error_data = {
                'error': response.data.get('detail', 'An error occurred'),
            }
            # Include validation errors if present
            if isinstance(response.data, dict):
                for key, value in response.data.items():
                    if key != 'detail':
                        error_data[key] = value
            response.data = error_data

    return response