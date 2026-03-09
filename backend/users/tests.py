from django.test import TestCase
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import PasswordResetRequest


User = get_user_model()


class CustomUserModelTest(TestCase):
    """
    Test CustomUser model functionality.
    """

    def test_create_user(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.role, 'staff')
        self.assertTrue(user.check_password('testpass123'))

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            first_name='Admin',
            last_name='User'
        )
        self.assertEqual(admin.role, 'admin')
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_account_lockout(self):
        user = User.objects.create_user(
            username='locktest',
            email='lock@example.com',
            password='testpass123',
            first_name='Lock',
            last_name='Test'
        )
        user.increment_failed_attempts()
        user.increment_failed_attempts()
        user.increment_failed_attempts()
        self.assertTrue(user.is_locked)
        self.assertFalse(user.is_active)

    def test_reset_failed_attempts(self):
        user = User.objects.create_user(
            username='resettest',
            email='reset@example.com',
            password='testpass123',
            first_name='Reset',
            last_name='Test'
        )
        user.increment_failed_attempts()
        user.reset_failed_attempts()
        self.assertEqual(user.failed_login_attempts, 0)
        self.assertFalse(user.is_locked)


class UserProfileViewTest(APITestCase):
    """
    Test user profile endpoints.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='profileuser',
            email='profile@example.com',
            password='testpass123',
            first_name='Profile',
            last_name='User'
        )

    def test_profile_requires_authentication(self):
        response = self.client.get('/api/v1/users/profile/')
        self.assertEqual(response.status_code, 401)

    def test_authenticated_user_can_view_profile(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/users/profile/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['username'], 'profileuser')