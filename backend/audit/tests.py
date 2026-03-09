from django.test import TestCase
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import AuditLog, UserSession

User = get_user_model()


class AuditLogModelTest(TestCase):
    """
    Test AuditLog model immutability.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='audituser',
            email='audit@example.com',
            password='testpass123',
            first_name='Audit',
            last_name='User'
        )

    def test_audit_log_creation(self):
        log = AuditLog.objects.create(
            user=self.user,
            action_type='login',
            category='authentication',
            description='User logged in'
        )
        self.assertEqual(log.action_type, 'login')
        self.assertTrue(log.is_finalized)

    def test_audit_log_cannot_be_modified(self):
        log = AuditLog.objects.create(
            user=self.user,
            action_type='login',
            category='authentication',
            description='User logged in'
        )

        # Try to modify
        log.description = 'Modified description'
        with self.assertRaises(Exception):
            log.save()

    def test_audit_log_cannot_be_deleted(self):
        log = AuditLog.objects.create(
            user=self.user,
            action_type='login',
            category='authentication',
            description='User logged in'
        )

        # Try to delete
        with self.assertRaises(Exception):
            log.delete()

    def test_log_event_classmethod(self):
        log = AuditLog.log_event(
            user=self.user,
            action_type='login',
            category='authentication',
            description='User logged in via test'
        )
        self.assertEqual(log.action_type, 'login')
        self.assertIsNotNone(log.created_at)


class AuditLogListViewTest(APITestCase):
    """
    Test audit log list endpoint with cursor pagination.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='auditlistuser',
            email='auditlist@example.com',
            password='testpass123',
            first_name='AuditList',
            last_name='User'
        )
        # Create some audit logs
        for i in range(25):
            AuditLog.objects.create(
                user=self.user,
                action_type='login',
                category='authentication',
                description=f'Login event {i}'
            )

    def test_audit_logs_requires_authentication(self):
        response = self.client.get('/api/v1/logs/logs/')
        self.assertEqual(response.status_code, 401)

    def test_cursor_pagination_returns_20_records(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/logs/logs/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['records']), 20)
        self.assertTrue(response.data['has_more'])
        self.assertIsNotNone(response.data['next_cursor'])

    def test_cursor_pagination_second_page(self):
        self.client.force_authenticate(user=self.user)
        # Get first page
        response1 = self.client.get('/api/v1/logs/logs/')
        next_cursor = response1.data['next_cursor']

        # Get second page
        response2 = self.client.get(f'/api/v1/logs/logs/?cursor={next_cursor}')
        self.assertEqual(response2.status_code, 200)
        self.assertEqual(len(response2.data['records']), 5)  # Remaining records
        self.assertFalse(response2.data['has_more'])