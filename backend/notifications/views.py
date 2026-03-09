import logging
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Q, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from core.permissions import IsStaffOrAdmin, IsAdminUser
from .models import Notification, WebSocketConnection
from .serializers import (
    NotificationSerializer,
    NotificationBulkUpdateSerializer,
    WebSocketConnectionSerializer
)

logger = logging.getLogger('notifications')


class NotificationListView(generics.ListAPIView):
    """
    View for listing user notifications.
    
    Role-based filtering:
    - Admin: All notifications (can filter by user)
    - Staff: Only their own notifications
    """
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]
    serializer_class = NotificationSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['notification_type', 'severity', 'is_read', 'is_dismissed']
    ordering_fields = ['created_at', 'read_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Filter notifications based on user role.
        """
        user = self.request.user
        queryset = Notification.objects.all()

        if user.role == 'staff':
            queryset = queryset.filter(user=user)
        else:
            # Admin can filter by user_id query param
            user_id = self.request.query_params.get('user_id')
            if user_id:
                queryset = queryset.filter(user_id=user_id)

        return queryset.select_related('user')


class NotificationDetailView(generics.RetrieveUpdateAPIView):
    """
    View for viewing and updating a single notification.
    """
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Notification.objects.all()

        if user.role == 'staff':
            queryset = queryset.filter(user=user)

        return queryset


class NotificationMarkAsReadView(APIView):
    """
    View for marking notifications as read.
    """
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def post(self, request):
        """
        Mark single notification as read.
        """
        notification_id = request.data.get('notification_id')

        if not notification_id:
            return Response(
                {'error': 'notification_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        queryset = Notification.objects.filter(pk=notification_id)

        if user.role == 'staff':
            queryset = queryset.filter(user=user)

        try:
            notification = queryset.get()
            notification.mark_as_read()

            return Response({
                'message': 'Notification marked as read',
                'notification_id': notification_id
            })

        except Notification.DoesNotExist:
            return Response(
                {'error': 'Notification not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class NotificationMarkAllAsReadView(APIView):
    """
    View for marking all notifications as read.
    """
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def post(self, request):
        """
        Mark all user notifications as read.
        """
        user = request.user
        queryset = Notification.objects.filter(user=user, is_read=False)

        count = queryset.update(
            is_read=True,
            read_at=timezone.now()
        )

        return Response({
            'message': f'{count} notifications marked as read',
            'count': count
        })


class NotificationBulkUpdateView(APIView):
    """
    View for bulk updating notifications (read/dismiss).
    """
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def post(self, request):
        """
        Bulk update notifications.
        """
        serializer = NotificationBulkUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        notification_ids = serializer.validated_data['notification_ids']
        action = serializer.validated_data['action']

        # Filter notifications
        queryset = Notification.objects.filter(
            pk__in=notification_ids
        )

        if user.role == 'staff':
            queryset = queryset.filter(user=user)

        if action == 'mark_read':
            count = queryset.update(
                is_read=True,
                read_at=timezone.now()
            )
        elif action == 'dismiss':
            count = queryset.update(
                is_dismissed=True,
                dismissed_at=timezone.now()
            )
        else:
            return Response(
                {'error': 'Invalid action'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            'message': f'{count} notifications updated',
            'count': count,
            'action': action
        })


class NotificationSummaryView(APIView):
    """
    View for notification summary statistics.
    Used for badge counts and dashboard.
    """
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]

    def get(self, request):
        """
        Return notification summary.
        """
        user = request.user

        # Base queryset
        queryset = Notification.objects.filter(user=user)

        # Unread count
        unread_count = queryset.filter(is_read=False, is_dismissed=False).count()

        # Unread by severity
        unread_by_severity = queryset.filter(
            is_read=False,
            is_dismissed=False
        ).values('severity').annotate(count=Count('id'))

        # Recent notifications (last 24 hours)
        from datetime import timedelta
        last_24h = timezone.now() - timedelta(hours=24)
        recent_count = queryset.filter(created_at__gte=last_24h).count()

        return Response({
            'unread_count': unread_count,
            'unread_by_severity': {
                item['severity']: item['count'] for item in unread_by_severity
            },
            'recent_count': recent_count,
            'last_checked': timezone.now().isoformat()
        })


class WebSocketConnectionListView(generics.ListAPIView):
    """
    View for listing active WebSocket connections.
    Admin only - monitoring purposes.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = WebSocketConnectionSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['user', 'is_active']
    ordering_fields = ['last_heartbeat', 'created_at']
    ordering = ['-last_heartbeat']

    def get_queryset(self):
        """
        Filter to show only active connections by default.
        """
        is_active = self.request.query_params.get('is_active', 'true')
        queryset = WebSocketConnection.objects.all()

        if is_active == 'true':
            queryset = queryset.filter(is_active=True)

        return queryset.select_related('user')


class WebSocketConnectionTerminateView(APIView):
    """
    View for terminating WebSocket connections.
    Admin only - force disconnect users.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, connection_id):
        """
        Terminate a WebSocket connection.
        """
        try:
            connection = WebSocketConnection.objects.get(pk=connection_id)
            connection.mark_disconnected()

            # Notify via channel layer to actually disconnect
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                connection.channel_name,
                {
                    'type': 'error',
                    'message': 'Connection terminated by admin'
                }
            )

            logger.info(f"WebSocket connection {connection_id} terminated by admin {request.user.username}")

            return Response({
                'message': 'Connection terminated',
                'connection_id': connection_id
            })

        except WebSocketConnection.DoesNotExist:
            return Response(
                {'error': 'Connection not found'},
                status=status.HTTP_404_NOT_FOUND
            )