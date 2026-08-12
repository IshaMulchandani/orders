from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    GoogleAuthView,
    InvitationListCreateView,
    InvitationRevokeView,
    LogoutView,
    MeView,
)

urlpatterns = [
    path("auth/google/", GoogleAuthView.as_view(), name="auth-google"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("invitations/", InvitationListCreateView.as_view(), name="invitation-list-create"),
    path("invitations/<int:pk>/", InvitationRevokeView.as_view(), name="invitation-revoke"),
]
