import requests
import hashlib
import hmac
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger('payments')


class PaystackService:
    """
    Paystack API Service (Production).
    
    Implements payment initialization and verification.
    Uses production endpoints and credentials.
    
    API Documentation: https://paystack.com/docs/api/
    API Version: 2024-01-01 (Latest)
    """

    # Production URLs
    BASE_URL = 'https://api.paystack.co'
    INITIALIZE_URL = f'{BASE_URL}/transaction/initialize'
    VERIFY_URL = f'{BASE_URL}/transaction/verify'
    WEBHOOK_SECRET = settings.PAYSTACK_WEBHOOK_SECRET

    def __init__(self):
        self.secret_key = settings.PAYSTACK_SECRET_KEY

    def _get_headers(self):
        """
        Get headers for Paystack API requests.
        """
        return {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json',
            'X-API-Version': '2024-01-01'  # Latest API version
        }

    def initialize_transaction(self, email, amount, reference, metadata=None):
        """
        Initialize a Paystack transaction.
        
        Args:
            email: Customer email address
            amount: Transaction amount in KES (will be converted to kobo)
            reference: Internal transaction reference (DP...)
            metadata: Additional metadata to attach to transaction
        
        Returns:
            dict: Response with authorization URL and access code
        """
        # Convert amount to kobo (Paystack uses smallest currency unit)
        # KES to NGN conversion may be needed, or use Paystack's KES support
        amount_in_kobo = int(amount) * 100  # Assuming 1 KES = 100 subunits

        payload = {
            'email': email,
            'amount': amount_in_kobo,
            'reference': reference,
            'currency': 'KES',  # Kenyan Shilling
            'metadata': metadata or {},
            'callback_url': settings.PAYSTACK_CALLBACK_URL
        }

        try:
            response = requests.post(
                self.INITIALIZE_URL,
                json=payload,
                headers=self._get_headers(),
                timeout=30
            )
            response.raise_for_status()

            result = response.json()

            if result.get('status'):
                logger.info(f"Paystack transaction initialized: {reference}")
                return {
                    'success': True,
                    'authorization_url': result['data'].get('authorization_url'),
                    'access_code': result['data'].get('access_code'),
                    'reference': result['data'].get('reference')
                }
            else:
                logger.error(f"Paystack initialization failed: {result.get('message')}")
                return {
                    'success': False,
                    'error': result.get('message', 'Transaction initialization failed')
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"Paystack initialization failed: {str(e)}")
            error_response = e.response.json() if e.response else {}
            return {
                'success': False,
                'error': error_response.get('message', str(e))
            }

    def verify_transaction(self, reference):
        """
        Verify a Paystack transaction status.
        
        Args:
            reference: Paystack transaction reference
        
        Returns:
            dict: Transaction verification result
        """
        try:
            response = requests.get(
                f'{self.VERIFY_URL}/{reference}',
                headers=self._get_headers(),
                timeout=30
            )
            response.raise_for_status()

            result = response.json()

            if result.get('status'):
                data = result.get('data', {})
                return {
                    'success': True,
                    'status': data.get('status'),  # 'success', 'failed', 'abandoned'
                    'amount': data.get('amount') / 100,  # Convert from kobo
                    'currency': data.get('currency'),
                    'paid_at': data.get('paid_at'),
                    'channel': data.get('channel'),
                    'authorization': data.get('authorization'),
                    'customer': data.get('customer'),
                    'metadata': data.get('metadata')
                }
            else:
                return {
                    'success': False,
                    'error': result.get('message', 'Verification failed')
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"Paystack verification failed: {str(e)}")
            error_response = e.response.json() if e.response else {}
            return {
                'success': False,
                'error': error_response.get('message', str(e))
            }

    def verify_webhook_signature(self, payload, signature_header):
        """
        Verify Paystack webhook signature.
        
        Paystack sends X-Paystack-Signature header with SHA512 hash of payload.
        
        Args:
            payload: Raw webhook payload bytes
            signature_header: X-Paystack-Signature header value
        
        Returns:
            bool: True if signature is valid
        """
        if not signature_header or not self.WEBHOOK_SECRET:
            logger.warning("Webhook secret not configured")
            return False

        # Compute HMAC SHA512
        computed_signature = hmac.new(
            self.WEBHOOK_SECRET.encode('utf-8'),
            payload,
            hashlib.sha512
        ).hexdigest()

        # Compare signatures
        is_valid = hmac.compare_digest(computed_signature, signature_header)

        if not is_valid:
            logger.warning("Invalid Paystack webhook signature")

        return is_valid

    def parse_webhook(self, webhook_data):
        """
        Parse Paystack webhook payload.
        
        Returns:
            dict: Parsed webhook data with event type and transaction details
        """
        try:
            event = webhook_data.get('event', '')
            data = webhook_data.get('data', {})
            transaction = data.get('transaction', {})
            customer = data.get('customer', {})

            return {
                'event': event,
                'reference': transaction.get('reference'),
                'status': transaction.get('status'),
                'amount': transaction.get('amount') / 100 if transaction.get('amount') else 0,
                'currency': transaction.get('currency'),
                'paid_at': transaction.get('paid_at'),
                'channel': transaction.get('channel'),
                'email': customer.get('email'),
                'customer_id': customer.get('customer_code'),
                'metadata': transaction.get('metadata', {})
            }

        except Exception as e:
            logger.error(f"Failed to parse Paystack webhook: {str(e)}")
            return {
                'event': 'unknown',
                'error': str(e)
            }