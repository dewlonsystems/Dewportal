from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LedgerEntryViewSet,
    LedgerBalanceView,
    LedgerExportView,
    LedgerAuditLogViewSet,
    LedgerIntegrityCheckView
)

app_name = 'ledger'

router = DefaultRouter()
router.register(r'entries', LedgerEntryViewSet, basename='ledger-entry')
router.register(r'audit-logs', LedgerAuditLogViewSet, basename='ledger-audit-log')

urlpatterns = [
    # Ledger entries (read-only)
    path('', include(router.urls)),

    # Balance summary
    path('balance/', LedgerBalanceView.as_view(), name='ledger-balance'),

    # Export to CSV (admin only)
    path('export/', LedgerExportView.as_view(), name='ledger-export'),

    # Integrity check (admin only)
    path('integrity-check/', LedgerIntegrityCheckView.as_view(), name='ledger-integrity-check'),
]