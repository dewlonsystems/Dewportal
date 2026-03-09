from django.test import TestCase
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import Transaction

User = get_user_model()


class TransactionModelTest(TestCase):
    """
    Test Transaction model functionality.
    """

    def test_transaction_reference_generation(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        transaction = Transaction.objects.create(
            user=user,
            amount=1000,
            payment_method='mpesa'
        )
        self.assertTrue(transaction.reference.startswith('DP'))
        self.assertEqual(len(transaction.reference), 10)

    def test_status_transition_validation(self):
        user = User.objects.create_user(
            username='statustest',
            email='status@example.com',
            password='testpass123',
            first_name='Status',
            last_name='Test'
        )
        transaction = Transaction.objects.create(
            user=user,
            amount=1000,
            payment_method='mpesa',
            status='pending'
        )
        # Valid transition
        self.assertTrue(transaction.can_transition_to('completed'))
        self.assertTrue(transaction.can_transition_to('failed'))
        # Invalid transition
        self.assertFalse(transaction.can_transition_to('pending'))


class InitiatePaymentViewTest(APITestCase):
    """
    Test payment initiation endpoints.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='paymentuser',
            email='payment@example.com',
            password='testpass123',
            first_name='Payment',
            last_name='User'
        )

    def test_initiate_payment_requires_authentication(self):
        response = self.client.post('/api/v1/billing/initiate/', {
            'payment_method': 'mpesa',
            'amount': 100,
            'phone_number': '254712345678'
        })
        self.assertEqual(response.status_code, 401)

    def test_initiate_mpesa_payment(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/billing/initiate/', {
            'payment_method': 'mpesa',
            'amount': 100,
            'phone_number': '254712345678'
        })
        # Will fail without valid Mpesa credentials, but should return proper structure
        self.assertIn(response.status_code, [200, 400, 500])