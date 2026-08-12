from django.apps import AppConfig


class CommonConfig(AppConfig):
    """
    Shared, reusable building blocks used across every domain app:
    role-based permission classes, the CSV import mixin, and the order
    status-transition mixin. Nothing here is specific to any one
    resource — that's the point (see project rule: keep components
    reusable).
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.common"
