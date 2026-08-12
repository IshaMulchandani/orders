from django.conf import settings
from rest_framework import serializers

from .models import Invitation, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "is_active", "date_joined"]
        read_only_fields = fields


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField()


class InvitationSerializer(serializers.ModelSerializer):
    invited_by_email = serializers.EmailField(source="invited_by.email", read_only=True)
    invite_link = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = [
            "id", "email", "role", "invited_by_email", "invite_link",
            "status", "expires_at", "accepted_at", "created_at",
        ]
        read_only_fields = [
            "id", "invited_by_email", "invite_link", "status", "accepted_at", "created_at",
        ]

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        if Invitation.objects.filter(email__iexact=value, accepted_at__isnull=True).exists():
            existing = Invitation.objects.get(email__iexact=value, accepted_at__isnull=True)
            if not existing.is_expired:
                raise serializers.ValidationError("An invitation is already pending for this email.")
            existing.delete()  # expired — clear the way for a fresh invite
        return value

    def get_invite_link(self, obj):
        # No token in the link on purpose — the invite is consumed by
        # email match at Google sign-in, not by visiting a special URL.
        # This just points the invitee at the login page.
        return f"{settings.FRONTEND_URL}/login"

    def get_status(self, obj):
        if obj.accepted_at:
            return "accepted"
        if obj.is_expired:
            return "expired"
        return "pending"
