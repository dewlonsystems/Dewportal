import logging
from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
from django.db.models import Sum, Q
from django.utils import timezone
from django.http import HttpResponse
import csv
import io

from core.permissions import IsAdminUser, IsStaffOrAdmin, IsOwnerOrAdmin
from .models import LedgerEntry, LedgerAuditLog
from .serializers import LedgerEntrySerializer, LedgerAuditLogSerializer

logger = logging.getLogger('ledger')


class LedgerEntryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing ledger entries.
    
    CRITICAL: Read-only access. Ledger entries CANNOT be created, updated,
    or deleted via this API. They are only created internally from
    completed transactions.
    
    Role-based filtering:
    - Admin: All ledger entries across all users
    - Staff: Only their own ledger entries
    """
    queryset = LedgerEntry.objects.all().select_related('user', 'transaction', 'created_by')
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]
    serializer_class = LedgerEntrySerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['entry_type', 'source', 'user']
    search_fields = ['reference', 'description', 'user__username', 'user__email']
    ordering_fields = ['created_at', 'amount', 'balance_after']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Filter ledger entries based on user role.
        """
        queryset = super().get_queryset()
        user = self.request.user

        if user.role == 'staff':
            queryset = queryset.filter(user=user)

        # Log the access
        LedgerAuditLog.objects.create(
            action='view',
            user=user,
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')[:255],
            details=f'Viewed ledger entries (filtered: {user.role})'
        )

        return queryset

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a single ledger entry.
        """
        response = super().retrieve(request, *args, **kwargs)

        # Log the access
        LedgerAuditLog.objects.create(
            action='view',
            user=request.user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
            ledger_entry_id=kwargs.get('pk'),
            details=f'Viewed ledger entry {kwargs.get("pk")}'
        )

        return response


class LedgerBalanceView(APIView):
    """
    View for getting current ledger balance.
    """
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def get(self, request):
        """
        Return current balance for the user.
        """
        user = request.user

        # Get balance
        balance = LedgerEntry.objects.get_balance(user=user if user.role == 'staff' else None)

        # Get totals
        total_credits = LedgerEntry.objects.get_total_credits(user=user if user.role == 'staff' else None)
        total_debits = LedgerEntry.objects.get_total_debits(user=user if user.role == 'staff' else None)

        # Get entry count
        entry_count = LedgerEntry.objects.filter(
            user=user if user.role == 'staff' else None
        ).count()

        # Log the access
        LedgerAuditLog.objects.create(
            action='view',
            user=user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
            details=f'Viewed ledger balance'
        )

        return Response({
            'balance': str(balance),
            'total_credits': str(total_credits),
            'total_debits': str(total_debits),
            'entry_count': entry_count,
            'currency': 'KES',
            'as_of': timezone.now().isoformat()
        })


class LedgerExportView(APIView):
    """
    View for exporting ledger entries to CSV.
    Admin only - sensitive financial data.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """
        Export ledger entries to CSV format.
        """
        user = request.user

        # Get entries based on filters
        queryset = LedgerEntry.objects.all().select_related('user', 'transaction')

        # Apply date filter if provided
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lt=date_to)

        # Apply user filter for staff
        if user.role == 'staff':
            queryset = queryset.filter(user=user)

        # Log the export
        LedgerAuditLog.objects.create(
            action='export',
            user=user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
            details=f'Exported {queryset.count()} ledger entries'
        )

        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow([
            'Reference', 'Date', 'User', 'Amount', 'Type', 'Balance After',
            'Description', 'Source', 'Transaction Reference'
        ])

        # Write data
        for entry in queryset:
            writer.writerow([
                entry.reference,
                entry.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                f"{entry.user.get_full_name()} ({entry.user.email})",
                str(entry.amount),
                entry.entry_type,
                str(entry.balance_after),
                entry.description,
                entry.source,
                entry.transaction.reference if entry.transaction else 'N/A'
            ])

        # Create response
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="ledger_export_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'

        logger.info(f"Ledger export by {user.username}: {queryset.count()} entries")

        return response


class LedgerAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing ledger audit logs.
    Admin only - sensitive audit data.
    """
    queryset = LedgerAuditLog.objects.all().select_related('user', 'ledger_entry')
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = LedgerAuditLogSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['action', 'user']
    search_fields = ['details', 'user__username', 'ledger_entry__reference']
    ordering_fields = ['created_at']
    ordering = ['-created_at']


class LedgerIntegrityCheckView(APIView):
    """
    View for running ledger integrity checks.
    Admin only - verifies ledger consistency.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """
        Run integrity checks on the ledger.
        """
        from payments.models import Transaction

        issues = []

        # Check 1: All completed transactions should have ledger entries
        completed_without_ledger = Transaction.objects.filter(
            status='completed'
        ).exclude(
            ledger_entry__isnull=False
        ).count()

        if completed_without_ledger > 0:
            issues.append({
                'type': 'missing_ledger_entry',
                'count': completed_without_ledger,
                'severity': 'high'
            })

        # Check 2: Ledger entries should have positive amounts
        negative_amounts = LedgerEntry.objects.filter(
            amount__lte=0
        ).count()

        if negative_amounts > 0:
            issues.append({
                'type': 'negative_amount',
                'count': negative_amounts,
                'severity': 'critical'
            })

        # Check 3: All ledger entries should be finalized
        non_finalized = LedgerEntry.objects.filter(
            is_finalized=False
        ).count()

        if non_finalized > 0:
            issues.append({
                'type': 'non_finalized_entry',
                'count': non_finalized,
                'severity': 'critical'
            })

        # Check 4: Verify running balances
        # (This is a simplified check - full verification would recalculate all balances)
        balance_check = LedgerEntry.objects.filter(
            balance_after__lt=0
        ).count()

        if balance_check > 0:
            issues.append({
                'type': 'negative_balance',
                'count': balance_check,
                'severity': 'high'
            })

        # Log the integrity check
        LedgerAuditLog.objects.create(
            action='view',
            user=request.user,
            ip_address=request.META.get('REMOTE_ADDR'),
            details=f'Integrity check performed. Issues found: {len(issues)}'
        )

        logger.info(f"Ledger integrity check by {request.user.username}: {len(issues)} issues found")

        return Response({
            'status': 'passed' if len(issues) == 0 else 'issues_found',
            'issues': issues,
            'checked_at': timezone.now().isoformat()
        })