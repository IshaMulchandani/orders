"""
Reusable DRF permission classes.

HasRole.for_roles(...) is used across every app that needs role-gating
(Partner-only admin actions, Accountant-only transitions, etc.) instead
of each app writing its own bespoke permission class.
"""
from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    """
    Base class — don't use directly. Call HasRole.for_roles(...) to get
    a concrete permission class parametrised with the allowed roles.
    """

    allowed_roles: tuple = ()

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self.allowed_roles
        )

    @classmethod
    def for_roles(cls, *roles):
        """
        Usage: permission_classes = [HasRole.for_roles("PARTNER")]

        DRF instantiates each class in permission_classes with no
        constructor args, so we can't just pass roles to __init__.
        Instead this returns a small dynamically-built subclass with
        `allowed_roles` baked in.
        """
        name = "HasRoleFor" + "".join(r.title() for r in roles)
        return type(name, (cls,), {"allowed_roles": roles})
