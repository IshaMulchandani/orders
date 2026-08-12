"""Product master data. Name-only by design — hard-deletable, Partner-only writes.
Price is always entered manually per order line (no default price)."""
from django.conf import settings
from django.db import models


class Product(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
