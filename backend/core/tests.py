from django.test import TestCase
from rest_framework.test import APITestCase


class CoreUtilsTest(TestCase):
    """
    Test core utility functions.
    """

    def test_generate_secure_token(self):
        from core.utils import generate_secure_token
        token = generate_secure_token()
        self.assertEqual(len(token), 32)

    def test_generate_temporary_password(self):
        from core.utils import generate_temporary_password
        password = generate_temporary_password()
        self.assertGreaterEqual(len(password), 8)
        # Check for required character types
        self.assertTrue(any(c.isupper() for c in password))
        self.assertTrue(any(c.islower() for c in password))
        self.assertTrue(any(c.isdigit() for c in password))

    def test_generate_transaction_reference(self):
        from core.utils import generate_transaction_reference
        ref = generate_transaction_reference()
        self.assertTrue(ref.startswith('DP'))
        self.assertEqual(len(ref), 10)  # DP + 8 characters


class DashboardViewTest(APITestCase):
    """
    Test dashboard endpoint.
    """

    def test_dashboard_requires_authentication(self):
        response = self.client.get('/api/v1/system/dashboard/')
        self.assertEqual(response.status_code, 401)