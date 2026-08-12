"""
Auth (Google OAuth + JWT) and invitation-management endpoints.

Auth flow: the frontend gets an id_token from Google Identity Services
and posts it here. We verify it against Google's servers, then either
log in an existing user or — if there's a matching pending Invitation —
create the account with the role the Partner assigned. There is no
app password anywhere in this flow.
"""
from django.conf import settings
from django.utils import timezone
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.permissions import HasRole

from .models import Invitation, User
from .serializers import GoogleAuthSerializer, InvitationSerializer, UserSerializer


def _issue_tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    }


class GoogleAuthView(APIView):
    """
    POST {id_token} -> {access, refresh, user}

    - Existing active user + matching email -> log in.
    - No existing user, but a pending (non-expired) Invitation matches
      the email -> create the account with the invited role, mark the
      invitation accepted, then log in.
    - Neither -> 403 (not invited).
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            idinfo = google_id_token.verify_oauth2_token(
                serializer.validated_data["id_token"],
                google_requests.Request(),
                settings.GOOGLE_OAUTH_CLIENT_ID,
            )
        except ValueError:
            return Response({"detail": "Invalid Google token."}, status=status.HTTP_401_UNAUTHORIZED)

        email = idinfo.get("email")
        if not email or not idinfo.get("email_verified"):
            return Response(
                {"detail": "Google account email is not verified."}, status=status.HTTP_401_UNAUTHORIZED
            )

        user = User.objects.filter(email__iexact=email).first()

        if user is None:
            invitation = Invitation.objects.filter(email__iexact=email, accepted_at__isnull=True).first()
            if invitation is None or invitation.is_expired:
                return Response(
                    {"detail": "This email hasn't been invited yet. Ask a Partner to invite you first."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            user = User.objects.create_user(
                email=email,
                first_name=idinfo.get("given_name", ""),
                last_name=idinfo.get("family_name", ""),
                role=invitation.role,
            )
            invitation.accepted_at = timezone.now()
            invitation.save(update_fields=["accepted_at"])
        elif not user.is_active:
            return Response({"detail": "This account has been deactivated."}, status=status.HTTP_403_FORBIDDEN)

        return Response(_issue_tokens_for(user))


class LogoutView(APIView):
    """POST {refresh} -> blacklists the refresh token so it can't be reused."""

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except Exception:
                pass  # already invalid/blacklisted — logout should still succeed
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    """GET -> the current authenticated user. Used by the frontend on page load."""

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class InvitationListCreateView(generics.ListCreateAPIView):
    """Partner-only. List all invitations, or create a new one."""

    queryset = Invitation.objects.select_related("invited_by").all()
    serializer_class = InvitationSerializer
    permission_classes = [HasRole.for_roles("PARTNER")]

    def perform_create(self, serializer):
        serializer.save(invited_by=self.request.user)


class InvitationRevokeView(generics.DestroyAPIView):
    """Partner-only. Revoke a pending (not yet accepted) invitation."""

    queryset = Invitation.objects.filter(accepted_at__isnull=True)
    permission_classes = [HasRole.for_roles("PARTNER")]
