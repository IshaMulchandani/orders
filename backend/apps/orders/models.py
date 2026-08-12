"""
Orders, order lines, the status timeline, and the yearly order-number
counter.

Client/product names are snapshotted onto the order at creation time
(client_name_snapshot, product_name_snapshot) so that if a Partner
later hard-deletes that client/product from master data, historical
orders stay fully readable — see PLAN.md section 9.

Status transitions themselves (Bill Created, Shipped, Payment Pending,
Done, Cancelled) are Phase 4 — this app only creates/edits Pending
orders for now, but the full Status enum is defined up front so the
Phase 4 state machine has somewhere to land.
"""
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.clients.models import Client
from apps.products.models import Product


class OrderCounter(models.Model):
    """
    One row per year, tracks the last allocated order sequence number.
    Locked via select_for_update (see apps.orders.services.allocate_order_number)
    during allocation so concurrent order creation can never collide on
    the same order number.
    """

    year = models.PositiveIntegerField(unique=True)
    last_seq = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.year}: {self.last_seq}"


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        BILL_CREATED = "BILL_CREATED", "Bill Created"
        SHIPPED = "SHIPPED", "Shipped"
        PAYMENT_PENDING = "PAYMENT_PENDING", "Payment Pending"
        DONE = "DONE", "Done"
        CANCELLED = "CANCELLED", "Cancelled"

    # Order number = "{year}-{seq:05d}", e.g. 2026-00001. Stored as two
    # int columns rather than a formatted string so the uniqueness
    # constraint and the yearly-reset allocator both stay simple.
    year = models.PositiveIntegerField(editable=False)
    seq = models.PositiveIntegerField(editable=False)

    client = models.ForeignKey(Client, on_delete=models.SET_NULL, null=True, related_name="orders")
    client_name_snapshot = models.CharField(max_length=255)

    salesman = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders_created"
    )

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # Set when the order transitions to Bill Created (Phase 4) — records
    # which Accountant or Partner actually created the bill.
    billed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders_billed",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["year", "seq"], name="unique_order_number_per_year"),
        ]

    @property
    def order_no(self):
        return f"{self.year}-{self.seq:05d}"

    def __str__(self):
        return self.order_no


class OrderLine(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="lines")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, related_name="+")
    product_name_snapshot = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    price = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )

    @property
    def line_total(self):
        return self.quantity * self.price

    def __str__(self):
        return f"{self.product_name_snapshot} x{self.quantity}"


class OrderEvent(models.Model):
    """Append-only audit trail — one row per status change or edit. Never mutated after creation."""

    class Kind(models.TextChoices):
        CREATED = "CREATED", "Created"
        EDITED = "EDITED", "Edited"
        STATUS_CHANGE = "STATUS_CHANGE", "Status change"
        CANCELLED = "CANCELLED", "Cancelled"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    kind = models.CharField(max_length=20, choices=Kind.choices)
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.order.order_no}: {self.kind}"
