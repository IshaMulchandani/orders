from rest_framework.permissions import BasePermission

from apps.users.models import Role


class IsOrderEditableByRequester(BasePermission):
    """
    Object-level check for order edits: the Partner can always edit,
    the Salesman who created it can edit only their own order. Whether
    the order is still in a Pending status is checked separately in
    OrderUpdateSerializer.validate() — that's a data rule, this is an
    identity/role rule.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.role == Role.PARTNER:
            return True
        return obj.salesman_id == request.user.id
