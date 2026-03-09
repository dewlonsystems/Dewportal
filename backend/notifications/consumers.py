import json
import logging
from datetime import timedelta
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

logger = logging.getLogger('notifications')
User = get_user_model()


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.
    
    Handles:
    - User authentication via JWT token
    - Role-based channel grouping (user-specific + admin group)
    - Heartbeat/ping-pong for connection health
    - Graceful disconnection handling
    
    Events received:
    - ping: Heartbeat from client
    - mark_read: Mark notification as read
    - mark_all_read: Mark all notifications as read
    
    Events sent:
    - notification: New notification
    - transaction_update: Transaction status change
    - audit_log_entry: New audit log entry
    - user_created/updated/deleted: User management events
    - password_reset_request: New password reset request
    - pong: Heartbeat response
    """

    # Groups the user should join based on role
    admin_groups = ['admin_notifications']

    async def connect(self):
        """
        Handle WebSocket connection.
        Authenticate user and join appropriate groups.
        """
        try:
            # Get token from query string
            token = self.scope['url_route']['kwargs'].get('token')

            if not token:
                logger.warning("WebSocket connection rejected: No token provided")
                await self.close(code=4001)
                return

            # Authenticate user via JWT token
            user = await self._authenticate_user(token)

            if not user:
                logger.warning("WebSocket connection rejected: Invalid token")
                await self.close(code=4002)
                return

            # Check if user is active
            if not user.is_active or user.is_locked:
                logger.warning(f"WebSocket connection rejected: User {user.username} is inactive or locked")
                await self.close(code=4003)
                return

            # Store user in scope
            self.scope['user'] = user

            # Accept connection
            await self.accept()

            # Join user-specific group
            self.user_group = f'user_{user.id}'
            await self.channel_layer.group_add(self.user_group, self.channel_name)

            # Join admin group if user is admin
            self.admin_group = None
            if user.role == 'admin':
                self.admin_group = 'admin_notifications'
                await self.channel_layer.group_add(self.admin_group, self.channel_name)

            # Track connection in database
            await self._track_connection(user)

            # Send welcome message
            await self.send_json({
                'type': 'connected',
                'data': {
                    'user_id': user.id,
                    'username': user.username,
                    'role': user.role,
                    'timestamp': timezone.now().isoformat()
                }
            })

            logger.info(f"WebSocket connection established for user {user.username}")

            # Log audit event
            await self._log_audit_event(user, 'websocket_connected')

        except Exception as e:
            logger.error(f"WebSocket connection error: {str(e)}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        Clean up groups and track disconnection.
        """
        try:
            user = self.scope.get('user')

            if user:
                # Leave groups
                await self.channel_layer.group_discard(self.user_group, self.channel_name)

                if self.admin_group:
                    await self.channel_layer.group_discard(self.admin_group, self.channel_name)

                # Track disconnection in database
                await self._track_disconnection(user)

                # Log audit event
                await self._log_audit_event(user, 'websocket_disconnected')

                logger.info(f"WebSocket connection closed for user {user.username}, code: {close_code}")

        except Exception as e:
            logger.error(f"WebSocket disconnection error: {str(e)}")

    async def receive_json(self, content):
        """
        Handle incoming JSON messages from client.
        """
        try:
            message_type = content.get('type')
            data = content.get('data', {})

            if message_type == 'ping':
                # Heartbeat - update last activity
                await self._update_heartbeat()
                await self.send_json({'type': 'pong', 'timestamp': timezone.now().isoformat()})

            elif message_type == 'mark_read':
                # Mark notification as read
                notification_id = data.get('notification_id')
                if notification_id:
                    await self._mark_notification_read(notification_id)
                    await self.send_json({
                        'type': 'notification_marked_read',
                        'notification_id': notification_id
                    })

            elif message_type == 'mark_all_read':
                # Mark all notifications as read
                await self._mark_all_notifications_read()
                await self.send_json({
                    'type': 'all_notifications_marked_read',
                    'timestamp': timezone.now().isoformat()
                })

            else:
                logger.warning(f"Unknown WebSocket message type: {message_type}")

        except Exception as e:
            logger.error(f"WebSocket receive error: {str(e)}")
            await self.send_json({
                'type': 'error',
                'message': 'Failed to process message'
            })

    # --------------------------------------------------------------------------
    # Event Handlers (called by channel_layer.group_send)
    # --------------------------------------------------------------------------

    async def notification(self, event):
        """
        Handle notification event.
        """
        await self.send_json({
            'type': 'notification',
            'data': event['data']
        })

    async def transaction_update(self, event):
        """
        Handle transaction update event.
        """
        await self.send_json({
            'type': 'transaction_update',
            'data': event['data']
        })

    async def audit_log_entry(self, event):
        """
        Handle audit log entry event.
        """
        await self.send_json({
            'type': 'audit_log_entry',
            'data': event['data']
        })

    async def user_created(self, event):
        """
        Handle user created event (admin only).
        """
        await self.send_json({
            'type': 'user_created',
            'data': event['data']
        })

    async def user_updated(self, event):
        """
        Handle user updated event (admin only).
        """
        await self.send_json({
            'type': 'user_updated',
            'data': event['data']
        })

    async def user_deleted(self, event):
        """
        Handle user deleted event (admin only).
        """
        await self.send_json({
            'type': 'user_deleted',
            'data': event['data']
        })

    async def password_reset_request(self, event):
        """
        Handle password reset request event (admin only).
        """
        await self.send_json({
            'type': 'password_reset_request',
            'data': event['data']
        })

    async def password_reset_processed(self, event):
        """
        Handle password reset processed event.
        """
        await self.send_json({
            'type': 'password_reset_processed',
            'data': event['data']
        })

    async def payment_status_update(self, event):
        """
        Handle payment status update event.
        """
        await self.send_json({
            'type': 'payment_status_update',
            'data': event['data']
        })

    async def dashboard_update(self, event):
        """
        Handle dashboard update event.
        """
        await self.send_json({
            'type': 'dashboard_update',
            'data': event['data']
        })

    async def user_logout(self, event):
        """
        Handle user logout event.
        """
        await self.send_json({
            'type': 'user_logout',
            'data': event['data']
        })

    async def error(self, event):
        """
        Handle error event.
        """
        await self.send_json({
            'type': 'error',
            'message': event['message']
        })

    # --------------------------------------------------------------------------
    # Helper Methods
    # --------------------------------------------------------------------------

    @database_sync_to_async
    def _authenticate_user(self, token):
        """
        Authenticate user via JWT token.
        """
        try:
            access_token = AccessToken(token)
            user_id = access_token.payload.get('user_id')

            if not user_id:
                return None

            user = User.objects.get(pk=user_id, is_deleted=False)
            return user

        except (TokenError, InvalidToken, User.DoesNotExist):
            return None

    @database_sync_to_async
    def _track_connection(self, user):
        """
        Track WebSocket connection in database.
        """
        from .models import WebSocketConnection

        WebSocketConnection.objects.create(
            user=user,
            channel_name=self.channel_name,
            ip_address=self.scope.get('client', [None])[0],
            user_agent=self.scope.get('headers', {}).get(b'user-agent', b'').decode('utf-8', errors='ignore')[:255]
        )

    @database_sync_to_async
    def _track_disconnection(self, user):
        """
        Track WebSocket disconnection in database.
        """
        from .models import WebSocketConnection

        WebSocketConnection.objects.filter(
            user=user,
            channel_name=self.channel_name,
            is_active=True
        ).update(
            is_active=False,
            disconnected_at=timezone.now()
        )

    @database_sync_to_async
    def _update_heartbeat(self):
        """
        Update heartbeat for connection.
        """
        from .models import WebSocketConnection

        WebSocketConnection.objects.filter(
            channel_name=self.channel_name,
            is_active=True
        ).update(last_heartbeat=timezone.now())

    @database_sync_to_async
    def _mark_notification_read(self, notification_id):
        """
        Mark notification as read.
        """
        from .models import Notification

        try:
            notification = Notification.objects.get(
                pk=notification_id,
                user=self.scope['user']
            )
            notification.mark_as_read()
        except Notification.DoesNotExist:
            pass

    @database_sync_to_async
    def _mark_all_notifications_read(self):
        """
        Mark all user notifications as read.
        """
        from .models import Notification

        Notification.objects.filter(
            user=self.scope['user'],
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )

    @database_sync_to_async
    def _log_audit_event(self, user, action_type):
        """
        Log WebSocket event to audit log.
        """
        from audit.models import AuditLog

        AuditLog.log_event(
            user=user,
            action_type=action_type,
            category='websocket',
            description=f'WebSocket {action_type.replace("_", " ")}',
            ip_address=self.scope.get('client', [None])[0]
        )


class HealthCheckConsumer(AsyncJsonWebsocketConsumer):
    """
    Simple WebSocket consumer for health checks.
    Used by load balancers and monitoring systems.
    """

    async def connect(self):
        await self.accept()
        await self.send_json({'status': 'healthy', 'service': 'websocket'})

    async def disconnect(self, close_code):
        pass

    async def receive_json(self, content):
        await self.send_json({'status': 'healthy', 'echo': content})