from django.apps import AppConfig


class UsersConfig(AppConfig):
    """User accounts, roles, and email invitations. Built out in Phase 1."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"
