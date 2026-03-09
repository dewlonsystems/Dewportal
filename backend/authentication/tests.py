from django.test import TestCase
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class LoginViewTest(APITestCase):
    """
    Test login endpoint functionality.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )

    def test_login_success(self):
        response = self.client.post('/api/v1/auth/login/', {
            'username': 'testuser',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_invalid_credentials(self):
        response = self.client.post('/api/v1/auth/login/', {
            'username': 'testuser',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, 401)

    def test_login_locked_account(self):
        self.user.failed_login_attempts = 3
        self.user.is_active = False
        self.user.save()
        response = self.client.post('/api/v1/auth/login/', {
            'username': 'testuser',
            'password': 'testpass123'
        })
        self.assertEqual(response.status_code, 401)


class LogoutViewTest(APITestCase):
    """
    Test logout endpoint functionality.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='logoutuser',
            email='logout@example.com',
            password='testpass123',
            first_name='Logout',
            last_name='User'
        )
        self.refresh = RefreshToken.for_user(self.user)

    def test_logout_success(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/auth/logout/', {
            'refresh': str(self.refresh)
        })
        self.assertEqual(response.status_code, 200)


class ForcePasswordChangeViewTest(APITestCase):
    """
    Test forced password change functionality.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='passworduser',
            email='password@example.com',
            password='temppass123',
            first_name='Password',
            last_name='User'
        )
        self.user.must_change_password = True
        self.user.temporary_password = 'temppass123'
        self.user.save()

    def test_force_password_change_success(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/auth/password/force-change/', {
            'temporary_password': 'temppass123',
            'new_password': 'NewPass123!',
            'confirm_new_password': 'NewPass123!'
        })
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.must_change_password)