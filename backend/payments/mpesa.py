import requests
import base64
from datetime import datetime
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
import logging

logger = logging.getLogger('payments')


class MpesaService:
    """
    Mpesa Daraja API Service (Production).
    
    Implements STK Push (Lipa Na Mpesa Online) for payment collection.
    Uses production endpoints and credentials.
    
    API Documentation: https://developer.safaricom.co.ke/APIs
    """

    # Production URLs (Safaricom Daraja API)
    BASE_URL = 'https://api.safaricom.co.ke'
    OAUTH_URL = f'{BASE_URL}/oauth/v1/generate?grant_type=client_credentials'
    STK_PUSH_URL = f'{BASE_URL}/mpesa/stkpush/v1/processrequest'
    STK_QUERY_URL = f'{BASE_URL}/mpesa/stkpushquery/v1/query'

    def __init__(self):
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.shortcode = settings.MPESA_SHORTCODE
        self.passkey = settings.MPESA_PASSKEY
        self.callback_url = settings.MPESA_CALLBACK_URL

    def get_access_token(self):
        """
        Get OAuth access token from Mpesa Daraja API.
        Token is cached for 55 minutes (expires in 1 hour).
        """
        cache_key = 'mpesa_access_token'
        cached_token = cache.get(cache_key)

        if cached_token:
            return cached_token

        try:
            response = requests.get(
                self.OAUTH_URL,
                auth=(self.consumer_key, self.consumer_secret),
                timeout=10
            )
            response.raise_for_status()

            data = response.json()
            access_token = data.get('access_token')
            expires_in = data.get('expires_in', 3599)

            # Cache token for 55 minutes (safely before expiry)
            cache.set(cache_key, access_token, expires_in - 60)

            logger.info("Mpesa access token obtained successfully")
            return access_token

        except requests.exceptions.RequestException as e:
            logger.error(f"Mpesa OAuth failed: {str(e)}")
            raise Exception(f"Mpesa authentication failed: {str(e)}")

    def _generate_password(self):
        """
        Generate password for STK Push.
        Format: Base64(Shortcode + Passkey + Timestamp)
        """
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        data_to_encode = f"{self.shortcode}{self.passkey}{timestamp}"
        encoded = base64.b64encode(data_to_encode.encode()).decode('utf-8')
        return encoded, timestamp

    def initiate_stk_push(self, phone_number, amount, transaction_reference, account_reference):
        """
        Initiate STK Push payment request.
        
        Args:
            phone_number: Customer phone number (format: 254XXXXXXXXX)
            amount: Transaction amount in KES
            transaction_reference: Internal transaction reference (DP...)
            account_reference: Account reference for the transaction
        
        Returns:
            dict: Response from Mpesa API with CheckoutRequestID
        """
        access_token = self.get_access_token()
        password, timestamp = self._generate_password()

        # Format phone number (ensure 254 format)
        if phone_number.startswith('0'):
            phone_number = f'254{phone_number[1:]}'
        elif phone_number.startswith('+'):
            phone_number = phone_number.replace('+', '')

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        payload = {
            'BusinessShortCode': self.shortcode,
            'Password': password,
            'Timestamp': timestamp,
            'TransactionType': 'CustomerPayBillOnline',
            'Amount': int(amount),
            'PartyA': phone_number,
            'PartyB': self.shortcode,
            'PhoneNumber': phone_number,
            'CallBackURL': self.callback_url,
            'AccountReference': account_reference[:12],  # Max 12 chars
            'TransactionDesc': 'Payment to Dewlon Portal'
        }

        try:
            response = requests.post(
                self.STK_PUSH_URL,
                json=payload,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()

            result = response.json()
            logger.info(f"Mpesa STK Push initiated: {result.get('CheckoutRequestID')}")

            return {
                'success': True,
                'checkout_request_id': result.get('CheckoutRequestID'),
                'response_code': result.get('ResponseCode'),
                'response_description': result.get('ResponseDescription'),
                'merchant_request_id': result.get('MerchantRequestID'),
                'customer_message': result.get('CustomerMessage')
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"Mpesa STK Push failed: {str(e)}")
            error_response = e.response.json() if e.response else {}
            return {
                'success': False,
                'error': str(e),
                'response_description': error_response.get('errorMessage', 'STK Push initiation failed')
            }

    def query_stk_status(self, checkout_request_id):
        """
        Query the status of an STK Push request.
        Used as fallback if callback is not received.
        """
        access_token = self.get_access_token()
        password, timestamp = self._generate_password()

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        payload = {
            'BusinessShortCode': self.shortcode,
            'Password': password,
            'Timestamp': timestamp,
            'CheckoutRequestID': checkout_request_id
        }

        try:
            response = requests.post(
                self.STK_QUERY_URL,
                json=payload,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()

            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"Mpesa STK Query failed: {str(e)}")
            return {'success': False, 'error': str(e)}

    def parse_callback(self, callback_data):
        """
        Parse Mpesa callback payload.
        
        Returns:
            dict: Parsed callback data with status and details
        """
        try:
            stk_callback = callback_data.get('Body', {}).get('stkCallback', {})
            result_code = stk_callback.get('ResultCode')
            result_desc = stk_callback.get('ResultDesc')
            checkout_request_id = stk_callback.get('CheckoutRequestID')

            # Success code is 0
            is_success = result_code == 0

            # Extract transaction details if successful
            transaction_data = {}
            if is_success and stk_callback.get('CallbackMetadata', {}).get('Item'):
                items = stk_callback['CallbackMetadata']['Item']
                for item in items:
                    if item.get('Name') == 'MpesaReceiptNumber':
                        transaction_data['receipt_number'] = item.get('Value')
                    elif item.get('Name') == 'Amount':
                        transaction_data['amount'] = item.get('Value')
                    elif item.get('Name') == 'PhoneNumber':
                        transaction_data['phone_number'] = item.get('Value')
                    elif item.get('Name') == 'TransactionDate':
                        transaction_data['transaction_date'] = item.get('Value')

            return {
                'success': is_success,
                'checkout_request_id': checkout_request_id,
                'result_code': result_code,
                'result_description': result_desc,
                'transaction_data': transaction_data
            }

        except Exception as e:
            logger.error(f"Failed to parse Mpesa callback: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'result_description': 'Callback parsing failed'
            }