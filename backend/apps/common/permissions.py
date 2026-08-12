"""
Reusable DRF permission classes.

PermissionByRole is intentionally generic: every view in the project
that needs role-gating (Partner-only admin actions, Accountant-only
transitions, etc.) parametrises this one class instead of each app
writing its own bespoke permission. Implemented in Phase 1 once the
User model and its `role` field exist.
"""

# TODO(Phase 1): implement once apps.users.models.User.role exists.
#
# from rest_framework.permissions import BasePermission
#
# class PermissionByRole(BasePermission):
#     def __init__(self, *allowed_roles):
#         self.allowed_roles = allowed_roles
#
#     def __call__(self):
#         # DRF instantiates permission classes with no args, so this
#         # class is used via a small factory function (has_role_permission
#         # below) rather than being listed directly in permission_classes.
#         return self
#
#     def has_permission(self, request, view):
#         return bool(
#             request.user
#             and request.user.is_authenticated
#             and request.user.role in self.allowed_roles
#         )
#
#
# def has_role_permission(*roles):
#     """Usage: permission_classes = [has_role_permission('Partner')]"""
#     def factory():
#         return PermissionByRole(*roles)
#     return factory
