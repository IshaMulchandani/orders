from django.apps import AppConfig


class OrdersConfig(AppConfig):
    """
    Orders, order lines, and the order status timeline (OrderEvent).
    Core of the app — built out across Phases 3 and 4.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.orders"
