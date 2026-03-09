import logging
from rest_framework import generics, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth import get_user_model
from django.utils import timezone

from core.permissions import IsStaffOrAdmin
from .serializers import (
    CustomTokenObtainPairSerializer,
    CustomTokenRefreshSerializer,
    LogoutSerializer,
    ForcePasswordChangeSerializer
)

logger = logging.getLogger('authentication')
User = get_user_model()


class LoginView(TokenObtainPairView):
    """
    Login endpoint with account lockout and forced password change support.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        try:
            serializer.is_valid(raise_exception=True)
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        except serializers.ValidationError:
            # Let the real serializer error through to the frontend
            raise
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return Response(
                {'error': 'Invalid credentials. Please check your username and password.'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class TokenRefreshView(TokenRefreshView):
    """
    Token refresh endpoint with user status validation.
    """
    serializer_class = CustomTokenRefreshSerializer
    permission_classes = [AllowAny]


class LogoutView(generics.GenericAPIView):
    """
    Logout endpoint that blacklists the refresh token.
    """
    serializer_class = LogoutSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{request.user.id}',
            {
                'type': 'user_logout',
                'data': {
                    'user_id': request.user.id,
                    'username': request.user.username
                }
            }
        )

        return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)


class ForcePasswordChangeView(APIView):
    """
    Endpoint for forced password change on first login.
    Users with must_change_password=True cannot access other endpoints until they change password.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if not user.must_change_password:
            return Response(
                {'error': 'Password change not required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ForcePasswordChangeSerializer(data=request.data)
        if serializer.is_valid():
            if not user.check_password(serializer.validated_data['temporary_password']):
                return Response(
                    {'error': 'Invalid temporary password'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user.set_password(serializer.validated_data['new_password'])
            user.confirm_password_change()
            user.save()

            logger.info(f"User {user.username} completed forced password change")

            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                'admin_notifications',
                {
                    'type': 'password_changed',
                    'data': {
                        'user_id': user.id,
                        'username': user.username
                    }
                }
            )

            return Response({'message': 'Password changed successfully. You can now access all features.'})

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifySessionView(APIView):
    """
    Endpoint to verify current session status.
    Used by frontend to check if user is still authenticated.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.is_locked:
            return Response(
                {'error': 'Account is locked', 'locked_until': user.locked_until.isoformat()},
                status=status.HTTP_403_FORBIDDEN
            )

        if not user.is_active:
            return Response(
                {'error': 'Account is disabled'},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'must_change_password': user.must_change_password
            },
            'session_valid': True
        })


class AccountStatusView(APIView):
    """
    Endpoint to check account lockout status.
    Used by frontend to display lockout messages.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')

        if not username:
            return Response(
                {'error': 'Username required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(username=username, is_deleted=False)
        except User.DoesNotExist:
            return Response({'exists': False})

        return Response({
            'exists': True,
            'is_locked': user.is_locked,
            'locked_until': user.locked_until.isoformat() if user.locked_until else None,
            'is_active': user.is_active,
            'must_change_password': user.must_change_password
        })