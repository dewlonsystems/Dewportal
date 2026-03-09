from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserProfileView, PasswordChangeView, PasswordResetRequestView,
    UserViewSet, UserActionView, PasswordResetRequestAdminView,
    PasswordResetRequestActionView
)

app_name = 'users'

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    # User management (admin only)
    path('', include(router.urls)),

    # Current user profile
    path('profile/', UserProfileView.as_view(), name='profile'),

    # Password change
    path('password/change/', PasswordChangeView.as_view(), name='password-change'),

    # Password reset request (staff)
    path('password-reset-request/', PasswordResetRequestView.as_view(), name='password-reset-request'),

    # User actions (admin only)
    path('<int:user_id>/action/<str:action>/', UserActionView.as_view(), name='user-action'),

    # Password reset requests list (admin only)
    path('password-reset-requests/', PasswordResetRequestAdminView.as_view(), name='password-reset-requests-admin'),

    # Password reset request action (admin only)
    path('password-reset-requests/<int:request_id>/action/<str:action>/', PasswordResetRequestActionView.as_view(), name='password-reset-request-action'),
]