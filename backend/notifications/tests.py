from django.test import TestCase
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from .models import Notification, WebSocketConnection
from config.asgi import application

User = get_user_model()


class NotificationModelTest(TestCase):
    """
    Test Notification model functionality.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='notifyuser',
            email='notify@example.com',
            password='testpass123',
            first_name='Notify',
            last_name='User'
        )

    def test_notification_creation(self):
        notification = Notification.objects.create(
            user=self.user,
            notification_type='payment',
            severity='success',
            title='Payment Received',
            message='Your payment has been received'
        )
        self.assertEqual(notification.notification_type, 'payment')
        self.assertFalse(notification.is_read)

    def test_mark_as_read(self):
        notification = Notification.objects.create(
            user=self.user,
            notification_type='payment',
            severity='success',
            title='Payment Received',
            message='Your payment has been received'
        )
        notification.mark_as_read()
        self.assertTrue(notification.is_read)
        self.assertIsNotNone(notification.read_at)

    def test_create_notification_with_websocket(self):
        notification = Notification.create_notification(
            user=self.user,
            notification_type='transaction',
            title='Transaction Completed',
            message='Your transaction has been completed',
            severity='success'
        )
        self.assertTrue(notification.delivered_via_websocket)


class NotificationConsumerTest(TestCase):
    """
    Test WebSocket consumer functionality.
    """

    async def test_websocket_connection(self):
        # Create user and token
        user = User.objects.create_user(
            username='wstestuser',
            email='wstest@example.com',
            password='testpass123'
        )
        token = AccessToken.for_user(user)

        # Connect to WebSocket
        communicator = WebsocketCommunicator(
            application,
            f"/ws/notifications/{token}/"
        )
        connected, subprotocol = await communicator.connect()

        # Should connect successfully
        self.assertTrue(connected)

        # Should receive connected message
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'connected')
        self.assertEqual(response['data']['user_id'], user.id)

        # Disconnect
        await communicator.disconnect()

    async def test_websocket_invalid_token(self):
        # Try to connect with invalid token
        communicator = WebsocketCommunicator(
            application,
            "/ws/notifications/invalid_token/"
        )
        connected, subprotocol = await communicator.connect()

        # Should reject connection
        self.assertFalse(connected)

    async def test_websocket_ping_pong(self):
        user = User.objects.create_user(
            username='pingtest',
            email='ping@example.com',
            password='testpass123'
        )
        token = AccessToken.for_user(user)

        communicator = WebsocketCommunicator(
            application,
            f"/ws/notifications/{token}/"
        )
        connected, _ = await communicator.connect()

        if connected:
            # Send ping
            await communicator.send_json_to({'type': 'ping'})

            # Should receive pong
            response = await communicator.receive_json_from()
            self.assertEqual(response['type'], 'pong')

            await communicator.disconnect()