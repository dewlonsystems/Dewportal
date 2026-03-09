from django.test import TestCase
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from .models import LedgerEntry

User = get_user_model()


class LedgerEntryModelTest(TestCase):
    """
    Test LedgerEntry model immutability.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='ledgeruser',
            email='ledger@example.com',
            password='testpass123',
            first_name='Ledger',
            last_name='User'
        )

    def test_ledger_entry_creation(self):
        entry = LedgerEntry.objects.create(
            user=self.user,
            amount=1000,
            entry_type='credit',
            description='Test entry',
            reference='LE-TEST-001'
        )
        self.assertEqual(entry.amount, 1000)
        self.assertTrue(entry.is_finalized)

    def test_ledger_entry_cannot_be_modified(self):
        entry = LedgerEntry.objects.create(
            user=self.user,
            amount=1000,
            entry_type='credit',
            description='Test entry',
            reference='LE-TEST-002'
        )

        # Try to modify
        entry.amount = 2000
        with self.assertRaises(ValidationError):
            entry.save()

    def test_ledger_entry_cannot_be_deleted(self):
        entry = LedgerEntry.objects.create(
            user=self.user,
            amount=1000,
            entry_type='credit',
            description='Test entry',
            reference='LE-TEST-003'
        )

        # Try to delete
        with self.assertRaises(ValidationError):
            entry.delete()

    def test_positive_amount_constraint(self):
        with self.assertRaises(Exception):
            LedgerEntry.objects.create(
                user=self.user,
                amount=-100,
                entry_type='credit',
                description='Test entry',
                reference='LE-TEST-004'
            )


class LedgerBalanceViewTest(APITestCase):
    """
    Test ledger balance endpoint.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='balanceuser',
            email='balance@example.com',
            password='testpass123',
            first_name='Balance',
            last_name='User'
        )

    def test_balance_requires_authentication(self):
        response = self.client.get('/api/v1/ledger/balance/')
        self.assertEqual(response.status_code, 401)

    def test_authenticated_user_can_view_balance(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/ledger/balance/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('balance', response.data)