"""
Custom user manager.

Our User model has no `username` field (email is the identifier), so
the default Django UserManager — which expects one — can't be used
as-is. This is the standard Django pattern for email-based auth.
"""
from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            # Regular users never set a password — auth is Google OAuth
            # only. An unusable password keeps Django's auth internals
            # (e.g. the admin login form) working correctly.
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "PARTNER")
        return self._create_user(email, password, **extra_fields)
