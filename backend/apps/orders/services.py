"""
Order business logic kept out of views.py/serializers.py so it can't
drift between the DRF layer and, eventually, other entry points
(management commands, the Phase 4 transition endpoint, etc.).
"""
from django.db.models import Q
from django.utils import timezone

from apps.users.models import Role

from .models import Order, OrderCounter


def allocate_order_number():
    """
    Atomically allocates the next order number for the current year
    (Asia/Kolkata). Must be called inside a transaction alongside the
    Order creation it's for — select_for_update locks the counter row
    so two concurrent order creations can never get the same number.
    """
    year = timezone.localtime().year
    counter, _ = OrderCounter.objects.select_for_update().get_or_create(year=year)
    counter.last_seq += 1
    counter.save(update_fields=["last_seq"])
    return year, counter.last_seq


def orders_visible_to(user):
    """
    Each team sees orders currently assigned to them, plus anything
    they've personally acted on before (even after it's moved to
    another team) — so an Accountant can still look up an order they
    billed, for example, once it's moved on to Packaging or Done.

      - Partner: everything.
      - Salesman: every order they personally created, any status.
      - Accountant: current queue (Pending, Payment Pending) + anything
        they have an OrderEvent on.
      - Packaging & Shipping: current queue (Bill Created) + anything
        they have an OrderEvent on.
    """
    if user.role == Role.PARTNER:
        return Order.objects.all()

    if user.role == Role.SALESMAN:
        return Order.objects.filter(salesman=user)

    if user.role == Role.ACCOUNTANT:
        return Order.objects.filter(
            Q(status__in=[Order.Status.PENDING, Order.Status.PAYMENT_PENDING]) | Q(events__actor=user)
        ).distinct()

    if user.role == Role.PACKAGING:
        return Order.objects.filter(
            Q(status=Order.Status.BILL_CREATED) | Q(events__actor=user)
        ).distinct()

    return Order.objects.none()
