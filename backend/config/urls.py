"""
Root URL configuration.

Each domain app owns its own urls.py and is included here under /api/.
Keeps routing discoverable — to find where an endpoint lives, look for
its app name in this list, then open that app's urls.py.
"""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health_check(request):
    """Simple liveness endpoint for Render/uptime checks."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check),
    # Domain app routes are wired in as each is built out:
    # path("api/auth/", include("apps.users.urls")),
    # path("api/clients/", include("apps.clients.urls")),
    # path("api/products/", include("apps.products.urls")),
    # path("api/orders/", include("apps.orders.urls")),
    # path("api/notifications/", include("apps.notifications.urls")),
]
