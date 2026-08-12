"""
User accounts and email invitations.

Auth is Google OAuth only (see apps.users.views.GoogleAuthView) — there
are no app-set passwords for regular users. The password field still
exists because it's inherited from AbstractUser and Django's admin
site expects it; regular users just get an unusable password.
"""
import secrets
from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from .managers import UserManager


class Role(models.TextChoices):
    PARTNER = "PARTNER", "Partner"
    SALESMAN = "SALESMAN", "Salesman"
    ACCOUNTANT = "ACCOUNTANT", "Accountant"
    PACKAGING = "PACKAGING", "Packaging & Shipping"


class User(AbstractUser):
    """Custom user keyed on email instead of username, with a fixed role."""

    username = None
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.get_full_name() or self.email} ({self.role})"


def _default_invitation_expiry():
    return timezone.now() + timedelta(days=7)


def _generate_invite_token():
    return secrets.token_urlsafe(32)


class Invitation(models.Model):
    """
    A pending invite for someone to join with a pre-assigned role.

    Consumed automatically the first time the invited email signs in
    with Google (see GoogleAuthView) — there is no separate "accept
    invite" page or link to click through. The token exists for
    auditing/future use, not because the frontend needs to present it.
    """

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    invited_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="invitations_sent"
    )
    token = models.CharField(max_length=64, unique=True, default=_generate_invite_token)
    expires_at = models.DateTimeField(default=_default_invitation_expiry)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.email} → {self.role}"

    @property
    def is_expired(self):
        return self.accepted_at is None and timezone.now() > self.expires_at
