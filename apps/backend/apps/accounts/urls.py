from django.urls import path

from .views import AdminUserDetailView, AdminUserListView, CurrentUserView, DailyTrackingHistoryView, DailyTrackingTodayView, GoogleAuthView, LoginView, PasswordResetConfirmView, PasswordResetRequestView, ProfileView, RefreshView, RegisterView, ResendVerificationView, VerifyEmailView

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/verify-email/", VerifyEmailView.as_view(), name="auth-verify-email"),
    path("auth/resend-verification/", ResendVerificationView.as_view(), name="auth-resend-verification"),
    path("auth/google/", GoogleAuthView.as_view(), name="auth-google"),
    path("auth/password-reset/request/", PasswordResetRequestView.as_view(), name="auth-password-reset-request"),
    path("auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
    path("auth/refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("auth/me/", CurrentUserView.as_view(), name="auth-me"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("tracking/today/", DailyTrackingTodayView.as_view(), name="tracking-today"),
    path("tracking/history/", DailyTrackingHistoryView.as_view(), name="tracking-history"),
    path("admin/users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("admin/users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
]
