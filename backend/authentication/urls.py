from django.urls import path
from .views import (
    LoginView, 
    CustomTokenRefreshView,  # ← Updated: was TokenRefreshView
    LogoutView,
    ForcePasswordChangeView, 
    VerifySessionView, 
    AccountStatusView
)

app_name = 'authentication'

urlpatterns = [
    # Login/Logout
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Token management
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token-refresh'),  # ← Updated: was TokenRefreshView

    # Password management
    path('password/force-change/', ForcePasswordChangeView.as_view(), name='force-password-change'),

    # Session verification
    path('session/verify/', VerifySessionView.as_view(), name='session-verify'),

    # Account status check
    path('account/status/', AccountStatusView.as_view(), name='account-status'),
]