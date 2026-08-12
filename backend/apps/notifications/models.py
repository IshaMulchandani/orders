"""
In-app notifications. Created by apps.orders.services (order creation
and status transitions) — never directly by a view. See PLAN.md
section 9: team notifications fire when an order lands in that team's
queue; Partners are notified specifically on Done/Cancelled.
"""
from django.conf import settings
from django.db import models


class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    # Lazy "app_label.Model" string avoids a hard import of apps.orders
    # here — this app has no compile-time dependency on it.
    order = models.ForeignKey(
        "orders.Order", on_delete=models.CASCADE, null=True, blank=True, related_name="notifications"
    )
    # Mirrors the Order.Status value that triggered this notification
    # (e.g. "PENDING" for a new order needing billing, "DONE", "CANCELLED").
    kind = models.CharField(max_length=20)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user}: {self.message}"
