"""
Django settings for the Ordering System project.

Kept intentionally simple: one settings module driven entirely by
environment variables (via django-environ), so the same codebase runs
locally, in CI, and on Render without branching settings files.
"""
from datetime import timedelta
from pathlib import Path

import dj_database_url
import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY", default="insecure-dev-key-change-me")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# --------------------------------------------------------------------------
# Applications
# --------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
]

# Local apps — model-bearing apps are added here as they're built out
# (Phase 1 onward). Kept as their own package so each domain area
# (users, clients, products, orders, notifications) stays independently
# testable and reusable.
LOCAL_APPS = [
    "apps.common",
    "apps.users",
    "apps.clients",
    "apps.products",
    "apps.orders",
    "apps.notifications",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# --------------------------------------------------------------------------
# Database (Postgres via DATABASE_URL — local Docker or Supabase)
# --------------------------------------------------------------------------
DATABASES = {
    "default": dj_database_url.parse(
        env("DATABASE_URL", default="postgres://postgres:postgres@localhost:5432/ordering_system"),
        conn_max_age=600,
    )
}

# --------------------------------------------------------------------------
# Passwords — unused directly (auth is Google OAuth only), kept for
# Django admin login and framework compatibility.
# --------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --------------------------------------------------------------------------
# Internationalization
# --------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

# --------------------------------------------------------------------------
# Static files
# --------------------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --------------------------------------------------------------------------
# Custom user model — auth is Google OAuth only, no usernames/passwords
# for regular users. Must be set before the first migration runs.
# --------------------------------------------------------------------------
AUTH_USER_MODEL = "users.User"

# --------------------------------------------------------------------------
# DRF / JWT
# --------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# --------------------------------------------------------------------------
# CORS — the React frontend origin(s)
# --------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:5173"])

# --------------------------------------------------------------------------
# Google OAuth — the same Client ID is used by the frontend (to render
# the sign-in button) and here (to verify the id_token's audience).
# --------------------------------------------------------------------------
GOOGLE_OAUTH_CLIENT_ID = env("GOOGLE_OAUTH_CLIENT_ID", default="")

# Base URL of the deployed frontend — used to build the invite link
# shown to Partners in the admin/users page.
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:5173")

# First-Partner bootstrap (see apps/users/management/commands/bootstrap_partner.py)
BOOTSTRAP_PARTNER_EMAIL = env("BOOTSTRAP_PARTNER_EMAIL", default="")
BOOTSTRAP_PARTNER_NAME = env("BOOTSTRAP_PARTNER_NAME", default="")
