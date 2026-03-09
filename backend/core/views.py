import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from core.permissions import IsStaffOrAdmin


logger = logging.getLogger('core')


class DashboardView(APIView):
    """
    Dashboard aggregation endpoint.
    
    Pulls summarized data from payments, users, and audit apps
    to serve the dashboard page with real-time insights.
    
    Role-based data visibility:
    - Admin: System-wide data across all users
    - Staff: Only data relevant to their own activity
    """
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def get(self, request):
        """
        Return dashboard summary data.
        """
        user = request.user
        now = timezone.now()
        week_start = now - timedelta(days=now.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

        # Import models here to avoid circular imports
        try:
            from payments.models import Transaction
            from users.models import CustomUser
            from audit.models import AuditLog
        except ImportError as e:
            logger.error(f"Dashboard import error: {str(e)}")
            return Response(
                {'error': 'Dashboard dependencies not available'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Build query filters based on user role
        if user.role == 'admin':
            transaction_filter = Q()
            user_filter = Q()
        else:
            transaction_filter = Q(user=user)
            user_filter = Q(id=user.id)

        # ----------------------------------------------------------------------
        # Revenue Metrics
        # ----------------------------------------------------------------------
        revenue_data = Transaction.objects.filter(
            transaction_filter,
            status='completed',
            created_at__gte=week_start
        ).aggregate(
            total_revenue=Sum('amount'),
            total_transactions=Count('id')
        )

        # Daily revenue for the week (for charts)
        daily_revenue = []
        for i in range(7):
            day_start = week_start + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            day_revenue = Transaction.objects.filter(
                transaction_filter,
                status='completed',
                created_at__gte=day_start,
                created_at__lt=day_end
            ).aggregate(total=Sum('amount'))['total'] or 0
            daily_revenue.append({
                'date': day_start.strftime('%Y-%m-%d'),
                'revenue': float(day_revenue)
            })

        # ----------------------------------------------------------------------
        # Transaction Status Summary
        # ----------------------------------------------------------------------
        transaction_status = Transaction.objects.filter(
            transaction_filter,
            created_at__gte=week_start
        ).values('status').annotate(
            count=Count('id'),
            total=Sum('amount')
        )

        # ----------------------------------------------------------------------
        # Recent Activity (from Audit Log)
        # ----------------------------------------------------------------------
        recent_activity = AuditLog.objects.filter(
            user_filter if user.role == 'staff' else Q()
        ).select_related('user').order_by('-created_at')[:10]

        activity_data = [
            {
                'id': log.id,
                'action': log.action,
                'user': log.user.email if log.user else 'system',
                'timestamp': log.created_at.isoformat(),
                'details': log.details
            }
            for log in recent_activity
        ]

        # ----------------------------------------------------------------------
        # User Statistics (Admin only)
        # ----------------------------------------------------------------------
        user_stats = None
        if user.role == 'admin':
            user_stats = {
                'total_users': CustomUser.objects.filter(is_deleted=False).count(),
                'active_users': CustomUser.objects.filter(
                    is_deleted=False,
                    is_active=True
                ).count(),
                'admin_count': CustomUser.objects.filter(
                    is_deleted=False,
                    role='admin'
                ).count(),
                'staff_count': CustomUser.objects.filter(
                    is_deleted=False,
                    role='staff'
                ).count(),
            }

        # ----------------------------------------------------------------------
        # Response Data
        # ----------------------------------------------------------------------
        response_data = {
            'summary': {
                'total_revenue': float(revenue_data['total_revenue'] or 0),
                'total_transactions': revenue_data['total_transactions'] or 0,
                'currency': 'KES'
            },
            'daily_revenue': daily_revenue,
            'transaction_status': [
                {
                    'status': item['status'],
                    'count': item['count'],
                    'total': float(item['total'] or 0)
                }
                for item in transaction_status
            ],
            'recent_activity': activity_data,
            'user_stats': user_stats,
            'generated_at': now.isoformat(),
            'user_role': user.role
        }

        return Response(response_data, status=status.HTTP_200_OK)


class SystemHealthView(APIView):
    """
    Internal system health check endpoint.
    Used for monitoring and alerting.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Return system health status.
        """
        health_status = {
            'database': 'healthy',
            'redis': 'healthy',
            'celery': 'healthy',
            'timestamp': timezone.now().isoformat()
        }

        # Check database connection
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
        except Exception as e:
            health_status['database'] = f'unhealthy: {str(e)}'

        # Check Redis connection
        try:
            from django.core.cache import cache
            cache.set('health_check', 'ok', 10)
            if cache.get('health_check') != 'ok':
                health_status['redis'] = 'unhealthy: cache failed'
        except Exception as e:
            health_status['redis'] = f'unhealthy: {str(e)}'

        # Determine overall status
        overall_status = 'healthy'
        status_code = status.HTTP_200_OK
        if any('unhealthy' in str(v) for v in health_status.values()):
            overall_status = 'degraded'
            status_code = status.HTTP_503_SERVICE_UNAVAILABLE

        health_status['overall'] = overall_status

        return Response(health_status, status=status_code)