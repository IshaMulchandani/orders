"""
Creates the first Partner account, bypassing the invite flow.

The invite flow requires an existing Partner to create invitations, so
the very first Partner has no one to invite them — this command breaks
that chicken-and-egg problem. Run once, after the first deploy:

    python manage.py bootstrap_partner --email you@company.com --name "Your Name"

Or set BOOTSTRAP_PARTNER_EMAIL / BOOTSTRAP_PARTNER_NAME in the
environment and run with no arguments (handy for a deploy hook).
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.users.models import Role, User


class Command(BaseCommand):
    help = "Creates the first Partner account, bypassing the invite flow."

    def add_arguments(self, parser):
        parser.add_argument("--email", help="Email of the first Partner.")
        parser.add_argument("--name", help="Full name of the first Partner.")

    def handle(self, *args, **options):
        email = options.get("email") or settings.BOOTSTRAP_PARTNER_EMAIL
        name = options.get("name") or settings.BOOTSTRAP_PARTNER_NAME

        if not email:
            raise CommandError("Provide --email or set BOOTSTRAP_PARTNER_EMAIL in the environment.")

        if User.objects.filter(email__iexact=email).exists():
            self.stdout.write(self.style.WARNING(f"{email} already exists — skipping."))
            return

        first_name, _, last_name = (name or "").partition(" ")
        user = User.objects.create_user(
            email=email,
            first_name=first_name,
            last_name=last_name,
            role=Role.PARTNER,
            is_staff=True,
            is_superuser=True,
        )
        self.stdout.write(self.style.SUCCESS(f"Created Partner {user.email}. They can now sign in with Google."))
