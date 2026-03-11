import requests
import hashlib
import hmac
from django.conf import settings
import logging

logger = logging.getLogger('payments')


class PaystackService:
    """
    Paystack API Service.
    API Docs: https://paystack.com/docs/api/
    
    NOTE: Paystack signs webhooks using your secret key (sk_live_...), 
    NOT a separate webhook secret.
    """

    BASE_URL       = 'https://api.paystack.co'
    INITIALIZE_URL = f'{BASE_URL}/transaction/initialize'
    VERIFY_URL     = f'{BASE_URL}/transaction/verify'

    def __init__(self):
        self.secret_key = settings.PAYSTACK_SECRET_KEY
        # ✅ Removed: self.webhook_secret — Paystack uses secret_key for signatures

    def _get_headers(self):
        return {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type':  'application/json',
        }

    def initialize_transaction(self, email, amount, reference, metadata=None):
        """
        Initialize a Paystack transaction.
        Amount in KES whole units — converted to pesawas (* 100) for API.
        """
        payload = {
            'email':        email,
            'amount':       int(float(amount) * 100),  # KES → pesawas
            'reference':    reference,
            'currency':     'KES',
            'metadata':     metadata or {},
            'callback_url': settings.PAYSTACK_CALLBACK_URL,
        }

        try:
            response = requests.post(
                self.INITIALIZE_URL,
                json=payload,
                headers=self._get_headers(),
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()

            if result.get('status'):
                logger.info(f"Paystack initialized: {reference}")
                return {
                    'success':           True,
                    'authorization_url': result['data'].get('authorization_url'),
                    'access_code':       result['data'].get('access_code'),
                    'reference':         result['data'].get('reference'),
                }

            logger.error(f"Paystack init failed: {result.get('message')}")
            return {'success': False, 'error': result.get('message', 'Initialization failed')}

        except requests.exceptions.RequestException as e:
            logger.error(f"Paystack init request error: {str(e)}")
            error_response = e.response.json() if hasattr(e, 'response') and e.response else {}
            return {'success': False, 'error': error_response.get('message', str(e))}

    def verify_transaction(self, reference):
        """
        Verify a Paystack transaction by reference.
        Returns amount in KES whole units.
        """
        try:
            response = requests.get(
                f'{self.VERIFY_URL}/{reference}',
                headers=self._get_headers(),
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()

            if result.get('status'):
                data = result.get('data', {})
                raw_amount = data.get('amount', 0)

                return {
                    'success':       True,
                    'status':        data.get('status'),   # 'success', 'failed', 'abandoned'
                    'amount':        raw_amount / 100,     # pesawas → KES
                    'currency':      data.get('currency'),
                    'paid_at':       data.get('paid_at'),
                    'channel':       data.get('channel'),
                    'authorization': data.get('authorization'),
                    'customer':      data.get('customer'),
                    'metadata':      data.get('metadata'),
                    'reference':     data.get('reference'),
                }

            return {'success': False, 'error': result.get('message', 'Verification failed')}

        except requests.exceptions.RequestException as e:
            logger.error(f"Paystack verify error: {str(e)}")
            error_response = e.response.json() if hasattr(e, 'response') and e.response else {}
            return {'success': False, 'error': error_response.get('message', str(e))}

    def verify_webhook_signature(self, payload: bytes, signature_header: str) -> bool:
        """
        Verify Paystack webhook HMAC-SHA512 signature.
        
        Paystack signs webhooks using your SECRET KEY (sk_live_... / sk_test_...),
        NOT a separate webhook secret.
        
        Docs: https://paystack.com/docs/api/webhooks/#verifying-webhook-events
        """
        if not signature_header:
            logger.warning("Missing Paystack webhook signature header")
            return False

        # ✅ Use secret_key (not webhook_secret) for signature verification
        computed = hmac.new(
            self.secret_key.encode('utf-8'),  # ← Changed from self.webhook_secret
            payload,
            hashlib.sha512,
        ).hexdigest()

        is_valid = hmac.compare_digest(computed, signature_header)
        if not is_valid:
            logger.warning("Paystack webhook signature mismatch")
        return is_valid

    def parse_webhook(self, webhook_data: dict) -> dict:
        """
        Parse Paystack webhook payload.
        Paystack structure: { event, data: { reference, status, amount, customer, ... } }
        Note: data IS the transaction — there is no nested 'transaction' key.
        """
        try:
            event    = webhook_data.get('event', '')
            data     = webhook_data.get('data', {})       # ✅ data IS the transaction
            customer = data.get('customer', {})
            raw_amount = data.get('amount', 0)

            return {
                'event':       event,
                'reference':   data.get('reference'),     # ✅ directly on data
                'status':      data.get('status'),
                'amount':      raw_amount / 100 if raw_amount else 0,  # pesawas → KES
                'currency':    data.get('currency'),
                'paid_at':     data.get('paid_at'),
                'channel':     data.get('channel'),
                'email':       customer.get('email'),
                'customer_id': customer.get('customer_code'),
                'metadata':    data.get('metadata', {}),
            }

        except Exception as e:
            logger.error(f"Paystack webhook parse error: {str(e)}")
            return {'event': 'unknown', 'error': str(e)}