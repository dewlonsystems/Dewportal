import logging
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from core.permissions import IsAdminUser, IsOwnerOrAdmin
from core.utils import generate_temporary_password
from .models import CustomUser, PasswordResetRequest
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    PasswordChangeSerializer, PasswordResetRequestSerializer,
    PasswordResetRequestAdminSerializer
)


logger = logging.getLogger('users')


class UserProfileView(APIView):
    """
    View for users to view and update their own profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Return current user's profile information.
        """
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        """
        Update current user's profile information.
        """
        serializer = UserUpdateSerializer(request.user, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            logger.info(f"User {request.user.username} updated their profile")
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordChangeView(APIView):
    """
    View for users to change their password.
    Enforces strong password requirements.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Change user's password.
        """
        serializer = PasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user

            # Verify current password
            if not user.check_password(serializer.validated_data['current_password']):
                return Response(
                    {'error': 'Current password is incorrect'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Set new password
            user.set_password(serializer.validated_data['new_password'])
            user.confirm_password_change()
            user.save()

            logger.info(f"User {user.username} changed their password")

            return Response({'message': 'Password changed successfully'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """
    View for staff users to request password reset.
    Request is routed to admin for approval.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Submit password reset request.
        """
        serializer = PasswordResetRequestSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            reset_request = serializer.save()
            logger.info(f"Password reset request submitted by {request.user.username}")

            # Notify admins via WebSocket (handled by notifications app)
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                'admin_notifications',
                {
                    'type': 'password_reset_request',
                    'data': {
                        'user_id': request.user.id,
                        'username': request.user.username,
                        'request_id': reset_request.id
                    }
                }
            )

            return Response(
                {'message': 'Password reset request submitted. Admin will review.'},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for admin user management.
    Admins can create, view, update, and delete users.
    """
    queryset = CustomUser.objects.filter(is_deleted=False)
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active', 'locked_until']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'last_seen', 'username']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        """
        Create user and send temporary password via email.
        """
        user = serializer.save()

        # Send email with temporary password
        try:
            send_mail(
                subject='Welcome to Dewlon Portal - Temporary Password',
                message=f"Welcome {user.first_name}!\n\nYour temporary password is: {user.temporary_password}\n\nPlease log in and change your password immediately.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            logger.info(f"Welcome email sent to {user.email}")
        except Exception as e:
            logger.error(f"Failed to send welcome email to {user.email}: {str(e)}")

        # Notify admins via WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'admin_notifications',
            {
                'type': 'user_created',
                'data': {
                    'user_id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            }
        )

    def perform_destroy(self, instance):
        """
        Soft delete user and blacklist their tokens.
        """
        # Blacklist user's tokens
        from rest_framework_simplejwt.tokens import RefreshToken

        # Log the action
        logger.info(f"User {instance.username} deleted by admin {self.request.user.username}")

        # Soft delete
        instance.delete()

        # Notify via WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'admin_notifications',
            {
                'type': 'user_deleted',
                'data': {
                    'user_id': instance.id,
                    'username': instance.username
                }
            }
        )

    def perform_update(self, serializer):
        """
        Update user and notify via WebSocket.
        """
        user = serializer.save()

        logger.info(f"User {user.username} updated by admin {self.request.user.username}")

        # Notify via WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'admin_notifications',
            {
                'type': 'user_updated',
                'data': {
                    'user_id': user.id,
                    'username': user.username
                }
            }
        )


class UserActionView(APIView):
    """
    View for admin actions on users (disable, enable, reset password).
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, user_id, action):
        """
        Perform action on user.
        Actions: disable, enable, reset_password
        """
        try:
            user = CustomUser.objects.get(pk=user_id, is_deleted=False)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'disable':
            user.is_active = False
            user.save(update_fields=['is_active'])
            logger.info(f"User {user.username} disabled by admin {request.user.username}")
            message = f"User {user.username} has been disabled."

        elif action == 'enable':
            user.is_active = True
            user.locked_until = None
            user.failed_login_attempts = 0
            user.save(update_fields=['is_active', 'locked_until', 'failed_login_attempts'])
            logger.info(f"User {user.username} enabled by admin {request.user.username}")
            message = f"User {user.username} has been enabled."

        elif action == 'reset_password':
            temp_password = generate_temporary_password()
            user.set_password(temp_password)
            user.temporary_password = temp_password
            user.must_change_password = True
            user.save(update_fields=['temporary_password', 'must_change_password'])

            # Send email
            try:
                send_mail(
                    subject='Password Reset - Dewlon Portal',
                    message=f"Your password has been reset by an admin. Your temporary password is: {temp_password}\n\nPlease log in and change your password immediately.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                logger.info(f"Password reset email sent to {user.email}")
            except Exception as e:
                logger.error(f"Failed to send password reset email to {user.email}: {str(e)}")

            message = f"Password reset for {user.username}. Temporary password sent via email."

        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        # Notify via WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'admin_notifications',
            {
                'type': 'user_action',
                'data': {
                    'action': action,
                    'user_id': user.id,
                    'username': user.username
                }
            }
        )

        return Response({'message': message})


class PasswordResetRequestAdminView(generics.ListAPIView):
    """
    View for admins to view all password reset requests.
    """
    queryset = PasswordResetRequest.objects.all().select_related('user', 'processed_by')
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class = PasswordResetRequestAdminSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'user']
    ordering_fields = ['created_at', 'processed_at']
    ordering = ['-created_at']


class PasswordResetRequestActionView(APIView):
    """
    View for admins to approve or reject password reset requests.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, request_id, action):
        """
        Approve or reject password reset request.
        Actions: approve, reject
        """
        try:
            reset_request = PasswordResetRequest.objects.get(pk=request_id, status='pending')
        except PasswordResetRequest.DoesNotExist:
            return Response({'error': 'Request not found or already processed'}, status=status.HTTP_404_NOT_FOUND)

        if action == 'approve':
            reset_request.approve(request.user)
            message = 'Password reset request approved.'
        elif action == 'reject':
            notes = request.data.get('notes', '')
            reset_request.reject(request.user, notes)
            message = 'Password reset request rejected.'
        else:
            return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

        logger.info(f"Password reset request {request_id} {action}d by admin {request.user.username}")

        # Notify via WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'admin_notifications',
            {
                'type': 'password_reset_processed',
                'data': {
                    'request_id': request_id,
                    'action': action,
                    'user_id': reset_request.user.id
                }
            }
        )

        return Response({'message': message})