import jwt
import hmac
from django.conf import settings
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.core.exceptions import ImproperlyConfigured


class M2MAuthenticationMiddleware(MiddlewareMixin):
    """
    Machine-to-Machine authentication middleware.
    
    Validates that requests from Next.js server contain:
    1. Valid SYSTEM_API_KEY in X-System-API-Key header
    2. Valid JWT signed with Next.js private RSA key in X-M2M-Authorization header
    
    This middleware protects all /api/v1/ endpoints from direct external access.
    Only the Next.js server can make authenticated requests to Django.
    
    NOTE: Uses X-M2M-Authorization header to avoid conflict with SimpleJWT's
    Authorization: Bearer header used for user session tokens.
    """

    async_capable = True
    sync_capable = True

    def __init__(self, get_response):
        self.get_response = get_response
        self._api_key = settings.SYSTEM_API_KEY
        self._public_key = None

        # Load RSA public key at startup (thread-safe, no lazy loading)
        self._load_public_key()

        # Initialize parent class for async support
        super().__init__(get_response)

    def _load_public_key(self):
        """
        Load the RSA public key from environment variable.
        Called once during middleware initialization.
        """
        public_key_pem = getattr(settings, 'RSA_PUBLIC_KEY', None)

        if not public_key_pem:
            raise ImproperlyConfigured(
                'RSA_PUBLIC_KEY environment variable is not set'
            )

        # Normalize escaped newlines in case .env stores them as \n
        normalized = public_key_pem.replace('\\n', '\n')

        if '-----BEGIN PUBLIC KEY-----' not in normalized:
            raise ImproperlyConfigured(
                'RSA_PUBLIC_KEY does not appear to be a valid PEM public key'
            )

        # Store as bytes for PyJWT
        self._public_key = normalized.encode('utf-8')

    def process_request(self, request):
        """
        Validate M2M authentication for all API requests.
        """
        # Skip authentication for these paths
        excluded_paths = [
            '/api/health/',
            '/admin/',
            '/static/',
            
            # 👇 Payment webhook callbacks (exempt from M2M auth)
            '/api/v1/payments/callbacks/mpesa/',
            '/api/v1/payments/webhooks/paystack/',
        ]

        if any(request.path.startswith(path) for path in excluded_paths):
            return None

        # Only protect /api/v1/ endpoints
        if not request.path.startswith('/api/v1/'):
            return None

        # 1. Validate SYSTEM_API_KEY
        api_key = request.headers.get('X-System-API-Key')
        if not api_key:
            return JsonResponse(
                {'error': 'Missing system API key'},
                status=401
            )

        if not hmac.compare_digest(api_key, self._api_key):
            return JsonResponse(
                {'error': 'Invalid system API key'},
                status=401
            )

        # 2. Validate JWT signature from Next.js
        # Use dedicated X-M2M-Authorization header to avoid conflict with SimpleJWT
        auth_header = request.headers.get('X-M2M-Authorization', '')
        if not auth_header.startswith('Bearer '):
            return JsonResponse(
                {'error': 'Missing or invalid M2M authorization header'},
                status=401
            )

        token = auth_header.split(' ')[1]

        try:
            payload = jwt.decode(
                token,
                self._public_key,
                algorithms=['RS256'],
                audience='dewportal-django',
                options={
                    'verify_exp': True,
                    'verify_iat': True,
                    'require': ['exp', 'iat', 'iss']
                }
            )

            # Validate issuer
            if payload.get('iss') != 'nextjs-server':
                return JsonResponse(
                    {'error': 'Invalid token issuer'},
                    status=401
                )

            # Attach payload to request for downstream use
            request.m2m_payload = payload

        except jwt.ExpiredSignatureError:
            return JsonResponse(
                {'error': 'M2M token has expired'},
                status=401
            )
        except jwt.InvalidTokenError as e:
            return JsonResponse(
                {'error': f'Invalid M2M token: {str(e)}'},
                status=401
            )
        except Exception as e:
            return JsonResponse(
                {'error': 'M2M authentication failed'},
                status=401
            )

        return None


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Logs all incoming requests for audit purposes.
    Captures method, path, user, timestamp, and response status.
    """

    async_capable = True
    sync_capable = True

    def __init__(self, get_response):
        self.get_response = get_response
        self.logger = None
        super().__init__(get_response)

    def process_request(self, request):
        """
        Log request details before processing.
        """
        request._start_time = None
        return None

    def process_response(self, request, response):
        """
        Log response details after processing.
        """
        if self.logger is None:
            import logging
            self.logger = logging.getLogger('audit')

        duration = 0
        if hasattr(request, '_start_time') and request._start_time:
            from django.utils import timezone
            duration = (timezone.now() - request._start_time).total_seconds()

        user_id = request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None
        user_email = request.user.email if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous'

        self.logger.info(
            f"Request: {request.method} {request.path} | "
            f"User: {user_email} ({user_id}) | "
            f"Status: {response.status_code} | "
            f"Duration: {duration:.3f}s"
        )

        return response