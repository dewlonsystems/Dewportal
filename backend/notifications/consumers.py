# =============================================================================
# DEWPORTAL BACKEND - WEBSOCKET CONSUMERS
# =============================================================================

import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

logger = logging.getLogger('notifications')


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.

    Authentication via JWT token in URL path.
    Role-based channel grouping (user-specific + admin group).

    Close codes:
        4001 - No token provided
        4002 - Invalid / expired token
        4003 - User inactive or locked
        4000 - Unexpected server error
    """

    async def connect(self):
        """
        Authenticate and accept the WebSocket connection.
        accept() is called BEFORE any database work so that
        infrastructure failures never appear as a refused connection.
        """
        try:
            token = self.scope['url_route']['kwargs'].get('token')

            if not token:
                logger.warning("WebSocket rejected: No token provided")
                await self.close(code=4001)
                return

            user = await self._authenticate_user(token)

            if not user:
                logger.warning("WebSocket rejected: Invalid or expired token")
                await self.close(code=4002)
                return

            if not user.is_active or user.is_locked:
                logger.warning(
                    f"WebSocket rejected: {user.username} is inactive or locked"
                )
                await self.close(code=4003)
                return

            # Store user before accept so disconnect() can reference it
            self.scope['user'] = user

            # ── Accept first — everything below is non-fatal ──────────────────
            await self.accept()

            # Join user-specific group
            self.user_group = f'user_{user.id}'
            await self.channel_layer.group_add(self.user_group, self.channel_name)

            # Join admin group if applicable
            self.admin_group = None
            if user.role == 'admin':
                self.admin_group = 'admin_notifications'
                await self.channel_layer.group_add(
                    self.admin_group, self.channel_name
                )

            # Non-critical side effects — swallowed individually
            await self._track_connection(user)
            await self._log_audit_event(user, 'websocket_connected')

            # Welcome message
            await self.send_json({
                'type': 'connected',
                'data': {
                    'user_id':   user.id,
                    'username':  user.username,
                    'role':      user.role,
                    'timestamp': timezone.now().isoformat(),
                }
            })

            logger.info(f"WebSocket connected: {user.username} ({user.role})")

        except Exception as e:
            logger.error(f"WebSocket connect error: {str(e)}", exc_info=True)
            try:
                await self.close(code=4000)
            except Exception:
                pass

    async def disconnect(self, close_code):
        """
        Clean up groups and record disconnection.
        All steps are individually swallowed so a DB failure
        never prevents proper group cleanup.
        """
        try:
            user = self.scope.get('user')

            if user:
                # Leave groups
                try:
                    await self.channel_layer.group_discard(
                        self.user_group, self.channel_name
                    )
                except Exception as e:
                    logger.error(f"Group discard error: {str(e)}")

                if self.admin_group:
                    try:
                        await self.channel_layer.group_discard(
                            self.admin_group, self.channel_name
                        )
                    except Exception as e:
                        logger.error(f"Admin group discard error: {str(e)}")

                await self._track_disconnection(user)
                await self._log_audit_event(user, 'websocket_disconnected')

                logger.info(
                    f"WebSocket disconnected: {user.username} "
                    f"(code: {close_code})"
                )

        except Exception as e:
            logger.error(f"WebSocket disconnect error: {str(e)}")

    async def receive_json(self, content):
        """
        Handle incoming messages from the client.
        """
        try:
            message_type = content.get('type')
            data         = content.get('data', {})

            if message_type == 'ping':
                await self._update_heartbeat()
                await self.send_json({
                    'type':      'pong',
                    'timestamp': timezone.now().isoformat(),
                })

            elif message_type == 'mark_read':
                notification_id = data.get('notification_id')
                if notification_id:
                    await self._mark_notification_read(notification_id)
                    await self.send_json({
                        'type':            'notification_marked_read',
                        'notification_id': notification_id,
                    })

            elif message_type == 'mark_all_read':
                await self._mark_all_notifications_read()
                await self.send_json({
                    'type':      'all_notifications_marked_read',
                    'timestamp': timezone.now().isoformat(),
                })

            else:
                logger.warning(f"Unknown WS message type: {message_type}")

        except Exception as e:
            logger.error(f"WebSocket receive error: {str(e)}")
            await self.send_json({
                'type':    'error',
                'message': 'Failed to process message',
            })

    # -------------------------------------------------------------------------
    # Channel layer event handlers
    # Each method name maps to the 'type' field in group_send()
    # -------------------------------------------------------------------------

    async def notification(self, event):
        await self.send_json({'type': 'notification', 'data': event['data']})

    async def transaction_update(self, event):
        await self.send_json({'type': 'transaction_update', 'data': event['data']})

    async def payment_status_update(self, event):
        await self.send_json({'type': 'payment_status_update', 'data': event['data']})

    async def audit_log_entry(self, event):
        await self.send_json({'type': 'audit_log_entry', 'data': event['data']})

    async def user_created(self, event):
        await self.send_json({'type': 'user_created', 'data': event['data']})

    async def user_updated(self, event):
        await self.send_json({'type': 'user_updated', 'data': event['data']})

    async def user_deleted(self, event):
        await self.send_json({'type': 'user_deleted', 'data': event['data']})

    async def password_reset_request(self, event):
        await self.send_json({'type': 'password_reset_request', 'data': event['data']})

    async def password_reset_processed(self, event):
        await self.send_json({'type': 'password_reset_processed', 'data': event['data']})

    async def dashboard_update(self, event):
        await self.send_json({'type': 'dashboard_update', 'data': event['data']})

    async def user_logout(self, event):
        await self.send_json({'type': 'user_logout', 'data': event['data']})

    async def error(self, event):
        await self.send_json({'type': 'error', 'message': event['message']})

    # -------------------------------------------------------------------------
    # Database helpers — ALL failures are swallowed so they never
    # affect connection stability
    # -------------------------------------------------------------------------

    @database_sync_to_async
    def _authenticate_user(self, token):
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

            access_token = AccessToken(token)
            user_id      = access_token.payload.get('user_id')

            if not user_id:
                return None

            User = __import__(
                'django.contrib.auth', fromlist=['get_user_model']
            ).get_user_model()
            return User.objects.get(pk=user_id, is_deleted=False)

        except Exception:
            return None

    @database_sync_to_async
    def _track_connection(self, user):
        try:
            from .models import WebSocketConnection
            WebSocketConnection.objects.create(
                user=user,
                channel_name=self.channel_name,
                ip_address=self.scope.get('client', [None])[0],
                user_agent=dict(self.scope.get('headers', {})).get(
                    b'user-agent', b''
                ).decode('utf-8', errors='ignore')[:255],
            )
        except Exception as e:
            logger.error(f"Connection tracking failed (non-fatal): {str(e)}")

    @database_sync_to_async
    def _track_disconnection(self, user):
        try:
            from .models import WebSocketConnection
            WebSocketConnection.objects.filter(
                user=user,
                channel_name=self.channel_name,
                is_active=True,
            ).update(is_active=False, disconnected_at=timezone.now())
        except Exception as e:
            logger.error(f"Disconnection tracking failed (non-fatal): {str(e)}")

    @database_sync_to_async
    def _update_heartbeat(self):
        try:
            from .models import WebSocketConnection
            WebSocketConnection.objects.filter(
                channel_name=self.channel_name,
                is_active=True,
            ).update(last_heartbeat=timezone.now())
        except Exception as e:
            logger.error(f"Heartbeat update failed (non-fatal): {str(e)}")

    @database_sync_to_async
    def _mark_notification_read(self, notification_id):
        try:
            from .models import Notification
            notification = Notification.objects.get(
                pk=notification_id,
                user=self.scope['user'],
            )
            notification.mark_as_read()
        except Exception as e:
            logger.error(f"Mark notification read failed (non-fatal): {str(e)}")

    @database_sync_to_async
    def _mark_all_notifications_read(self):
        try:
            from .models import Notification
            Notification.objects.filter(
                user=self.scope['user'],
                is_read=False,
            ).update(is_read=True, read_at=timezone.now())
        except Exception as e:
            logger.error(f"Mark all read failed (non-fatal): {str(e)}")

    @database_sync_to_async
    def _log_audit_event(self, user, action_type):
        try:
            from audit.models import AuditLog
            AuditLog.log_event(
                user=user,
                action_type=action_type,
                category='websocket',
                description=f'WebSocket {action_type.replace("_", " ")}',
                ip_address=self.scope.get('client', [None])[0],
            )
        except Exception as e:
            logger.error(f"Audit log failed (non-fatal): {str(e)}")


# =============================================================================
# Health Check Consumer
# =============================================================================

class HealthCheckConsumer(AsyncJsonWebsocketConsumer):
    """
    Unauthenticated health check endpoint.
    Used by load balancers and monitoring.
    """

    async def connect(self):
        await self.accept()
        await self.send_json({
            'status':    'healthy',
            'service':   'websocket',
            'timestamp': timezone.now().isoformat(),
        })

    async def disconnect(self, close_code):
        pass

    async def receive_json(self, content):
        await self.send_json({
            'status': 'healthy',
            'echo':   content,
        })