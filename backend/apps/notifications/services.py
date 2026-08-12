"""
Notification creation, kept separate from apps.orders.services so the
order state machine doesn't need to know how notifications are
delivered (in-app only for now, could grow to email later) — it just
calls notify_role() at the right moments.
"""
from django.contrib.auth import get_user_model

from .models import Notification

User = get_user_model()


def notify_role(role, order, kind, message, exclude_user=None):
    """
    Creates one Notification per active user with the given role —
    the "team" for that role. `exclude_user` skips notifying whoever
    just performed the action themselves (relevant when a Partner
    triggers a transition that would otherwise notify the Partner
    team, e.g. marking an order Done).
    """
    recipients = User.objects.filter(role=role, is_active=True)
    if exclude_user is not None:
        recipients = recipients.exclude(pk=exclude_user.pk)
    Notification.objects.bulk_create(
        Notification(user=user, order=order, kind=kind, message=message) for user in recipients
    )
