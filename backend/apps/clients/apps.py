from django.apps import AppConfig


class ClientsConfig(AppConfig):
    """Client (customer) master data. Built out in Phase 2."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.clients"
