import logging
from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Q, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from core.permissions import IsAdminUser, IsStaffOrAdmin
from .models import AuditLog, UserSession
from .serializers import (
    AuditLogSerializer,
    AuditLogCursorPaginationSerializer,
    UserSessionSerializer,
    AuditLogFilterSerializer
)

logger = logging.getLogger('audit')


class AuditLogListView(APIView):
    """
    View for listing audit logs with cursor-based pagination.
    
    Role-based filtering:
    - Admin: All audit logs across all users
    - Staff: Only their own audit logs
    
    Supports filtering by:
    - Date range (date_from, date_to)
    - User (user_id)
    - Action type (action_type)
    - Category (category)
    - Search (search in details and IP address)
    
    Returns 20 records per request with cursor for next page.
    """
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def get(self, request):
        """
        Return paginated audit logs.
        """
        # Validate filter parameters
        filter_serializer = AuditLogFilterSerializer(data=request.query_params)
        if not filter_serializer.is_valid():
            return Response(filter_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        filters = filter_serializer.validated_data
        limit = filters.pop('limit', 20)
        cursor = filters.pop('cursor', None)

        # Apply role-based filtering
        user = request.user
        if user.role == 'staff':
            filters['user_id'] = user.id

        # Get paginated results
        pagination_result = AuditLog.objects.get_cursor_paginated(
            cursor=cursor,
            limit=limit,
            filters=filters
        )

        # Serialize records
        record_serializer = AuditLogSerializer(
            pagination_result['records'],
            many=True,
            context={'request': request}
        )

        response_data = {
            'records': record_serializer.data,
            'next_cursor': pagination_result['next_cursor'],
            'previous_cursor': pagination_result['previous_cursor'],
            'has_more': pagination_result['has_more'],
            'limit': pagination_result['limit'],
            'total_returned': pagination_result['total_returned'],
            'filters_applied': filters
        }

        return Response(response_data, status=status.HTTP_200_OK)


class AuditLogDetailView(generics.RetrieveAPIView):
    """
    View for viewing a single audit log detail.
    Admin only - sensitive audit data.
    """
    queryset = AuditLog.objects.all()
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = AuditLogSerializer


class AuditLogSummaryView(APIView):
    """
    View for audit log summary statistics.
    Used for dashboard and reporting.
    """
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def get(self, request):
        """
        Return audit log summary statistics.
        """
        user = request.user
        now = timezone.now()

        # Build base queryset based on role
        if user.role == 'admin':
            queryset = AuditLog.objects.all()
        else:
            queryset = AuditLog.objects.filter(user=user)

        # Last 24 hours
        last_24h = now - timezone.timedelta(hours=24)
        last_7d = now - timezone.timedelta(days=7)
        last_30d = now - timezone.timedelta(days=30)

        # Count by time period
        count_24h = queryset.filter(created_at__gte=last_24h).count()
        count_7d = queryset.filter(created_at__gte=last_7d).count()
        count_30d = queryset.filter(created_at__gte=last_30d).count()
        total = queryset.count()

        # Count by severity
        severity_counts = queryset.filter(created_at__gte=last_7d).values('severity').annotate(
            count=Count('id')
        )

        # Count by action type (top 10)
        action_type_counts = queryset.filter(created_at__gte=last_7d).values('action_type').annotate(
            count=Count('id')
        ).order_by('-count')[:10]

        # Count by category
        category_counts = queryset.filter(created_at__gte=last_7d).values('category').annotate(
            count=Count('id')
        )

        # Unique users (admin only)
        unique_users = None
        if user.role == 'admin':
            unique_users = queryset.filter(
                created_at__gte=last_7d,
                user__isnull=False
            ).values('user').distinct().count()

        return Response({
            'period_counts': {
                'last_24h': count_24h,
                'last_7d': count_7d,
                'last_30d': count_30d,
                'total': total
            },
            'severity_breakdown': {item['severity']: item['count'] for item in severity_counts},
            'top_action_types': list(action_type_counts),
            'category_breakdown': {item['category']: item['count'] for item in category_counts},
            'unique_users': unique_users,
            'generated_at': now.isoformat()
        })


class UserLastSeenView(APIView):
    """
    View for tracking and retrieving user last seen timestamps.
    Admin can see all users' last seen time and current active status.
    """
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def get(self, request):
        """
        Return last seen information for users.
        """
        from users.models import CustomUser

        user = request.user

        # Build queryset based on role
        if user.role == 'admin':
            queryset = CustomUser.objects.filter(is_deleted=False)
        else:
            queryset = CustomUser.objects.filter(id=user.id, is_deleted=False)

        users_data = []
        for u in queryset:
            users_data.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'role': u.role,
                'last_seen': u.last_seen.isoformat() if u.last_seen else None,
                'is_active': u.is_active,
                'is_locked': u.is_locked,
                'is_online': self._is_user_online(u)
            })

        return Response({
            'users': users_data,
            'count': len(users_data)
        })

    def _is_user_online(self, user):
        """
        Check if user has active sessions.
        """
        if not user.last_seen:
            return False

        # Consider user online if last seen within 5 minutes
        from datetime import timedelta
        return timezone.now() - user.last_seen < timedelta(minutes=5)

    def post(self, request):
        """
        Update current user's last seen timestamp.
        Called periodically by frontend to track active sessions.
        """
        user = request.user
        user.update_last_seen()

        # Create or update session record
        session_key = request.session.session_key if request.session else None

        if session_key:
            UserSession.objects.update_or_create(
                user=user,
                session_key=session_key,
                defaults={
                    'ip_address': request.META.get('REMOTE_ADDR'),
                    'user_agent': request.META.get('HTTP_USER_AGENT', '')[:255],
                    'last_activity': timezone.now(),
                    'is_active': True
                }
            )

        return Response({
            'last_seen': user.last_seen.isoformat(),
            'status': 'updated'
        })


class UserSessionListView(APIView):
    """
    View for listing active user sessions.
    Admin only - sensitive session data.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """
        Return list of active sessions.
        """
        user_id = request.query_params.get('user_id')

        queryset = UserSession.objects.filter(is_active=True)

        if user_id:
            queryset = queryset.filter(user_id=user_id)

        queryset = queryset.select_related('user').order_by('-last_activity')

        serializer = UserSessionSerializer(queryset, many=True)

        return Response({
            'sessions': serializer.data,
            'count': queryset.count()
        })

    def delete(self, request):
        """
        Terminate user sessions (logout from all devices).
        """
        user_id = request.query_params.get('user_id')

        if not user_id:
            return Response(
                {'error': 'user_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Terminate sessions
        count = UserSession.objects.filter(user_id=user_id, is_active=True).update(
            is_active=False
        )

        # Blacklist user's tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        from users.models import CustomUser

        try:
            user = CustomUser.objects.get(pk=user_id)
            # Blacklist all outstanding tokens for this user
            RefreshToken.objects.filter(user=user).delete()
        except CustomUser.DoesNotExist:
            pass

        # Log the action
        AuditLog.log_event(
            user=request.user,
            action_type='token_blacklisted',
            category='authentication',
            description=f'Admin terminated {count} sessions for user {user_id}',
            request=request,
            severity='warning'
        )

        return Response({
            'message': f'Terminated {count} sessions',
            'sessions_terminated': count
        })