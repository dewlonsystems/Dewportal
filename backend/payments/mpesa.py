# =============================================================================
# DEWPORTAL BACKEND - MPESA SERVICE
# =============================================================================

import requests
import base64
from datetime import datetime
from django.conf import settings
from django.core.cache import cache
import logging

logger = logging.getLogger('payments')


def format_phone_number(phone_number: str) -> str:
    """
    Normalize any Kenyan phone number format to 254XXXXXXXXX.

    Accepted input formats:
        0712345678      → 254712345678
        +254712345678   → 254712345678
        254712345678    → 254712345678
        712345678       → 254712345678

    Raises ValueError for invalid numbers.
    """
    if not phone_number:
        raise ValueError("Phone number is required")

    # Strip all whitespace and dashes
    phone = phone_number.strip().replace(' ', '').replace('-', '')

    # Strip leading +
    if phone.startswith('+'):
        phone = phone[1:]

    # 0XXXXXXXXX → 254XXXXXXXXX
    if phone.startswith('0') and len(phone) == 10:
        phone = f'254{phone[1:]}'

    # 7XXXXXXXXX or 1XXXXXXXXX (9 digits, no country code)
    elif len(phone) == 9 and (phone.startswith('7') or phone.startswith('1')):
        phone = f'254{phone}'

    # Already 254XXXXXXXXX
    elif phone.startswith('254') and len(phone) == 12:
        pass  # already correct

    else:
        raise ValueError(
            f"Invalid Kenyan phone number: '{phone_number}'. "
            "Expected formats: 07XXXXXXXX, +2547XXXXXXXX, or 2547XXXXXXXX"
        )

    # Final validation — must be 254 + 9 digits = 12 chars
    if len(phone) != 12 or not phone.isdigit():
        raise ValueError(f"Phone number '{phone_number}' could not be normalized to 254XXXXXXXXX")

    # Validate Kenyan operator prefixes
    # Safaricom: 0700-0729, 0740-0741, 0745, 0748, 0757-0759, 0768-0769,
    #            0790-0799, 0110-0119, 0100-0109
    # Airtel:    0730-0739, 0750-0756, 0780-0789
    # Telkom:    0770-0779
    # All valid Kenyan mobile numbers start with 2547 or 2541
    prefix = phone[3:5]  # digits after '254'
    valid_prefixes = (
        '70', '71', '72', '73', '74', '75', '76', '77', '78', '79',  # 07X
        '10', '11',                                                     # 01X
    )
    if not any(prefix.startswith(p[:2]) for p in valid_prefixes):
        raise ValueError(f"Phone number '{phone_number}' does not appear to be a valid Kenyan mobile number")

    return phone


class MpesaService:
    """
    Mpesa Daraja API Service (Production).
    Implements STK Push (Lipa Na M-Pesa Online).
    API Docs: https://developer.safaricom.co.ke/APIs
    """

    BASE_URL      = 'https://api.safaricom.co.ke'
    OAUTH_URL     = f'{BASE_URL}/oauth/v1/generate?grant_type=client_credentials'
    STK_PUSH_URL  = f'{BASE_URL}/mpesa/stkpush/v1/processrequest'
    STK_QUERY_URL = f'{BASE_URL}/mpesa/stkpushquery/v1/query'

    def __init__(self):
        self.consumer_key    = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.shortcode       = settings.MPESA_SHORTCODE
        self.passkey         = settings.MPESA_PASSKEY
        self.callback_url    = settings.MPESA_CALLBACK_URL
        self.tillnumber      = settings.MPESA_TILL_NUMBER

    # ── OAuth Token ────────────────────────────────────────────────────────────

    def get_access_token(self) -> str:
        """
        Get OAuth access token. Cached for 55 minutes.
        Raises Exception if token cannot be obtained.
        """
        cache_key    = 'mpesa_access_token'
        cached_token = cache.get(cache_key)
        if cached_token:
            return cached_token

        try:
            response = requests.get(
                self.OAUTH_URL,
                auth=(self.consumer_key, self.consumer_secret),
                timeout=15,
            )
            response.raise_for_status()
            data = response.json()

            access_token = data.get('access_token')

            # ✅ Guard: Safaricom can return 200 with empty/error body
            if not access_token:
                raise Exception(
                    f"Safaricom returned empty access token. Response: {data}"
                )

            expires_in = int(data.get('expires_in', 3599))
            cache.set(cache_key, access_token, expires_in - 300)  # 5min safety margin

            logger.info("Mpesa access token obtained and cached")
            return access_token

        except requests.exceptions.RequestException as e:
            logger.error(f"Mpesa OAuth failed: {str(e)}")
            raise Exception(f"Mpesa authentication failed: {str(e)}")

    # ── Password ───────────────────────────────────────────────────────────────

    def _generate_password(self) -> tuple[str, str]:
        """
        Generate STK Push password.
        Format: Base64(Shortcode + Passkey + Timestamp)
        Returns: (password, timestamp)
        """
        timestamp   = datetime.now().strftime('%Y%m%d%H%M%S')
        raw         = f"{self.shortcode}{self.passkey}{timestamp}"
        password    = base64.b64encode(raw.encode()).decode('utf-8')
        return password, timestamp

    # ── STK Push ───────────────────────────────────────────────────────────────

    def initiate_stk_push(
        self,
        phone_number: str,
        amount,
        transaction_reference: str,
        account_reference: str,
    ) -> dict:
        """
        Initiate STK Push payment request.

        Args:
            phone_number:          Any valid Kenyan format — normalized internally
            amount:                Amount in KES (whole units, Mpesa doesn't accept cents)
            transaction_reference: Internal reference (DP...)
            account_reference:     Account reference shown on customer's phone

        Returns:
            dict with success, checkout_request_id, and related fields
        """
        # ── Normalize phone number ─────────────────────────────────────────────
        try:
            normalized_phone = format_phone_number(phone_number)
        except ValueError as e:
            logger.warning(f"Phone number normalization failed: {str(e)}")
            return {
                'success':              False,
                'response_description': str(e),
            }

        # ── Normalize amount — Mpesa requires whole KES integer ────────────────
        try:
            mpesa_amount = int(float(str(amount)))
            if mpesa_amount < 1:
                return {
                    'success':              False,
                    'response_description': 'Amount must be at least KES 1',
                }
            if mpesa_amount > 150000:
                return {
                    'success':              False,
                    'response_description': 'Amount exceeds Mpesa limit of KES 150,000',
                }
        except (ValueError, TypeError):
            return {
                'success':              False,
                'response_description': f'Invalid amount: {amount}',
            }

        # ── Get token ──────────────────────────────────────────────────────────
        try:
            access_token = self.get_access_token()
        except Exception as e:
            return {
                'success':              False,
                'response_description': str(e),
            }

        password, timestamp = self._generate_password()

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type':  'application/json',
        }

        payload = {
            'BusinessShortCode': self.shortcode,
            'Password':          password,
            'Timestamp':         timestamp,
            'TransactionType':   'CustomerPayBillOnline',
            'Amount':            mpesa_amount,          # ✅ always clean integer
            'PartyA':            normalized_phone,      # ✅ always 254XXXXXXXXX
            'PartyB':            self.tillnumber,
            'PhoneNumber':       normalized_phone,      # ✅ same normalized number
            'CallBackURL':       self.callback_url,
            'AccountReference':  account_reference[:12],  # Safaricom max 12 chars
            'TransactionDesc':   'Payment to Dewlon Portal',
        }

        try:
            response = requests.post(
                self.STK_PUSH_URL,
                json=payload,
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            result = response.json()

            # Safaricom success: ResponseCode == '0'
            response_code = str(result.get('ResponseCode', ''))
            if response_code == '0':
                logger.info(
                    f"STK Push initiated: {result.get('CheckoutRequestID')} "
                    f"| phone: {normalized_phone} | amount: {mpesa_amount}"
                )
                return {
                    'success':              True,
                    'checkout_request_id':  result.get('CheckoutRequestID'),
                    'merchant_request_id':  result.get('MerchantRequestID'),
                    'response_code':        response_code,
                    'response_description': result.get('ResponseDescription', ''),
                    'customer_message':     result.get('CustomerMessage', 'STK Push sent to your phone'),
                }
            else:
                logger.error(
                    f"STK Push rejected by Safaricom: "
                    f"code={response_code} desc={result.get('ResponseDescription')}"
                )
                return {
                    'success':              False,
                    'response_description': result.get('ResponseDescription', 'STK Push rejected'),
                    'response_code':        response_code,
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"STK Push request error: {str(e)}")
            error_body = {}
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_body = e.response.json()
                except Exception:
                    pass
            return {
                'success':              False,
                'response_description': error_body.get('errorMessage', str(e)),
            }

    # ── STK Query (fallback polling) ───────────────────────────────────────────

    def query_stk_status(self, checkout_request_id: str) -> dict:
        """
        Query STK Push status. Use as fallback if callback is delayed.
        """
        try:
            access_token        = self.get_access_token()
            password, timestamp = self._generate_password()

            response = requests.post(
                self.STK_QUERY_URL,
                json={
                    'BusinessShortCode': self.shortcode,
                    'Password':          password,
                    'Timestamp':         timestamp,
                    'CheckoutRequestID': checkout_request_id,
                },
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type':  'application/json',
                },
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"STK Query failed: {str(e)}")
            return {'success': False, 'error': str(e)}

    # ── Parse Callback ─────────────────────────────────────────────────────────

    def parse_callback(self, callback_data: dict) -> dict:
        """
        Parse Mpesa STK Push callback payload from Safaricom.

        Safaricom sends ResultCode 0 for success, anything else for failure.
        ResultCode is an integer in the JSON but we compare as string for safety.
        """
        try:
            stk_callback        = callback_data.get('Body', {}).get('stkCallback', {})
            result_code         = stk_callback.get('ResultCode')
            result_desc         = stk_callback.get('ResultDesc', '')
            checkout_request_id = stk_callback.get('CheckoutRequestID')

            # ✅ Compare as string — Safaricom occasionally sends '0' vs 0
            is_success = str(result_code) == '0'

            transaction_data = {}
            if is_success:
                items = (
                    stk_callback
                    .get('CallbackMetadata', {})
                    .get('Item', [])
                )
                for item in items:
                    name  = item.get('Name')
                    value = item.get('Value')
                    if name == 'MpesaReceiptNumber':
                        transaction_data['receipt_number']    = value
                    elif name == 'Amount':
                        transaction_data['amount']            = value
                    elif name == 'PhoneNumber':
                        transaction_data['phone_number']      = str(value)
                    elif name == 'TransactionDate':
                        transaction_data['transaction_date']  = str(value)
                    elif name == 'Balance':
                        transaction_data['balance']           = value

            return {
                'success':              is_success,
                'checkout_request_id':  checkout_request_id,
                'result_code':          str(result_code),
                'result_description':   result_desc,
                'transaction_data':     transaction_data,
            }

        except Exception as e:
            logger.error(f"Mpesa callback parse error: {str(e)}")
            return {
                'success':            False,
                'error':              str(e),
                'result_description': 'Callback parsing failed',
            }