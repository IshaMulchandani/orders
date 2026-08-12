"""
Order business logic kept out of views.py/serializers.py so it can't
drift between the DRF layer and, eventually, other entry points
(management commands, etc.).
"""
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.users.models import Role

from .models import Order, OrderCounter, OrderEvent


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


# --- Status transitions ------------------------------------------------
#
# One validation function (_validate_transition) is the single source
# of truth for "is this move allowed right now" — both the read-only
# `available_transitions` (which drives which buttons the frontend
# shows) and the mutating `apply_transition` call it, so the rules can
# never drift apart between "what we told the user they could do" and
# "what we actually let them do."

CANDIDATE_TRANSITIONS = [
    Order.Status.BILL_CREATED,
    Order.Status.SHIPPED,
    Order.Status.DONE,
    Order.Status.CANCELLED,
]


class TransitionError(Exception):
    """Raised with a user-facing message when a requested status change isn't allowed."""


def _display_name(user):
    if not user:
        return "System"
    return user.get_full_name() or user.email


def _validate_cancel(order, user):
    if order.status == Order.Status.PENDING:
        if user.role == Role.PARTNER or order.salesman_id == user.id:
            return
        raise TransitionError(
            "Only the salesman who created this order, or a Partner, can cancel it while it's pending."
        )
    if user.role == Role.PARTNER:
        return
    raise TransitionError("Only a Partner can cancel an order once it's past the pending stage.")


def _validate_transition(order, user, to_status):
    """Raises TransitionError if not allowed. No side effects — safe to call speculatively."""
    if order.status in (Order.Status.DONE, Order.Status.CANCELLED):
        raise TransitionError(f"This order is {order.get_status_display()} and can no longer be changed.")

    if to_status == Order.Status.CANCELLED:
        _validate_cancel(order, user)
        return

    if order.status == Order.Status.PENDING and to_status == Order.Status.BILL_CREATED:
        if user.role not in (Role.ACCOUNTANT, Role.PARTNER):
            raise TransitionError("Only an Accountant or Partner can mark an order as Bill Created.")
        return

    if order.status == Order.Status.BILL_CREATED and to_status == Order.Status.SHIPPED:
        if user.role not in (Role.PACKAGING, Role.PARTNER):
            raise TransitionError("Only Packaging & Shipping or a Partner can mark an order as Shipped.")
        return

    if order.status == Order.Status.PAYMENT_PENDING and to_status == Order.Status.DONE:
        if user.role not in (Role.ACCOUNTANT, Role.PARTNER):
            raise TransitionError("Only an Accountant or Partner can mark an order as Done.")
        return

    raise TransitionError(
        f"Cannot move an order from {order.get_status_display()} to {to_status.replace('_', ' ').title()}."
    )


def can_transition(order, user, to_status):
    try:
        _validate_transition(order, user, to_status)
        return True
    except TransitionError:
        return False


def available_transitions(order, user):
    """The to_statuses `user` may move `order` to right now — drives which action buttons the frontend shows."""
    return [s for s in CANDIDATE_TRANSITIONS if can_transition(order, user, s)]


def _record_transition(order, actor, to_status, kind, description):
    from_status = order.status
    order.status = to_status
    order.save(update_fields=["status", "updated_at"])
    OrderEvent.objects.create(
        order=order, actor=actor, kind=kind, from_status=from_status, to_status=to_status, description=description,
    )


def apply_transition(order, user, to_status):
    """
    Validates then applies a status transition atomically, logging an
    OrderEvent. Raises TransitionError on any rule violation — callers
    (the transition endpoint) turn that into a 400 with the message.
    """
    with transaction.atomic():
        _validate_transition(order, user, to_status)

        if to_status == Order.Status.CANCELLED:
            _record_transition(
                order, user, Order.Status.CANCELLED, OrderEvent.Kind.CANCELLED,
                f"Order cancelled by {_display_name(user)}.",
            )
        elif to_status == Order.Status.BILL_CREATED:
            order.billed_by = user
            order.save(update_fields=["billed_by"])
            _record_transition(
                order, user, Order.Status.BILL_CREATED, OrderEvent.Kind.STATUS_CHANGE,
                f"Bill created by {_display_name(user)}.",
            )
        elif to_status == Order.Status.SHIPPED:
            # Auto-cascades straight to Payment Pending — see README:
            # "this change in status is to be done by the app itself."
            # Both events are logged for a full audit trail even
            # though the order's resting status skips over Shipped.
            _record_transition(
                order, user, Order.Status.SHIPPED, OrderEvent.Kind.STATUS_CHANGE,
                f"Marked shipped by {_display_name(user)}.",
            )
            _record_transition(
                order, None, Order.Status.PAYMENT_PENDING, OrderEvent.Kind.STATUS_CHANGE,
                "Automatically moved to Payment Pending.",
            )
        elif to_status == Order.Status.DONE:
            _record_transition(
                order, user, Order.Status.DONE, OrderEvent.Kind.STATUS_CHANGE,
                f"Marked done by {_display_name(user)}.",
            )

    return order
