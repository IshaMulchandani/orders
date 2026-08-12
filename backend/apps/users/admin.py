from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Invitation, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    """Reuses Django's built-in UserAdmin, adapted for an email-only, role-based user."""

    ordering = ["email"]
    list_display = ["email", "first_name", "last_name", "role", "is_active", "is_staff"]
    search_fields = ["email", "first_name", "last_name"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "role", "password1", "password2")}),
    )


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ["email", "role", "invited_by", "created_at", "expires_at", "accepted_at"]
    list_filter = ["role"]
    search_fields = ["email"]
