from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserProfileView, PasswordChangeView, PasswordResetRequestView,
    UserViewSet, UserActionView, PasswordResetRequestAdminView,
    PasswordResetRequestActionView
)

app_name = 'users'

router = DefaultRouter()
# ✅ Router now includes /profile/ via @action decorator
# This makes the endpoint immune to URL ordering issues
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    # ✅ Router URLs (includes /profile/ via @action)
    # This is now SAFE - URL order doesn't matter for @action endpoints
    path('', include(router.urls)),

    # Password change (Self-service)
    path('password/change/', PasswordChangeView.as_view(), name='password-change'),

    # Password reset request (Staff)
    path('password-reset-request/', PasswordResetRequestView.as_view(), name='password-reset-request'),

    # Password reset requests list (Admin)
    path('password-reset-requests/', PasswordResetRequestAdminView.as_view(), name='password-reset-requests-admin'),

    # Password reset request action (Admin)
    path('password-reset-requests/<int:request_id>/action/<str:action>/', PasswordResetRequestActionView.as_view(), name='password-reset-request-action'),

    # User actions (Admin) - Uses <int:user_id> so it won't conflict
    path('<int:user_id>/action/<str:action>/', UserActionView.as_view(), name='user-action'),

    # ⚠️ DEPRECATED: UserProfileView kept for backward compatibility only
    # Remove after confirming @action profile endpoint works in production
    path('profile/', UserProfileView.as_view(), name='profile-backup'),
]