"""
Order endpoints. Status transitions (Bill Created, Shipped, Payment
Pending, Done, Cancelled) are Phase 4 — this viewset only covers
create/list/retrieve/update of Pending orders.
"""
from decimal import Decimal

from django.db.models import DecimalField, F, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from apps.common.permissions import HasRole

from .permissions import IsOrderEditableByRequester
from .serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    OrderUpdateSerializer,
)
from .services import orders_visible_to


class OrderViewSet(viewsets.ModelViewSet):
    # No DELETE — cancellation is a status transition (Phase 4), not a
    # row deletion. Orders are never removed once created.
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self):
        qs = orders_visible_to(self.request.user).select_related("client", "salesman", "billed_by")
        # Annotated once here (used by OrderListSerializer's plain
        # `total` field); OrderDetailSerializer computes its own total
        # from prefetched lines instead, since it's a single object.
        qs = qs.annotate(
            total=Coalesce(
                Sum(
                    F("lines__quantity") * F("lines__price"),
                    output_field=DecimalField(max_digits=14, decimal_places=2),
                ),
                Value(Decimal("0.00")),
                output_field=DecimalField(max_digits=14, decimal_places=2),
            )
        )
        if self.action == "retrieve":
            qs = qs.prefetch_related("lines__product", "events__actor")
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return OrderListSerializer
        if self.action == "create":
            return OrderCreateSerializer
        if self.action in ("update", "partial_update"):
            return OrderUpdateSerializer
        return OrderDetailSerializer

    def get_permissions(self):
        if self.action == "create":
            return [HasRole.for_roles("PARTNER", "SALESMAN")()]
        if self.action in ("update", "partial_update"):
            return [permissions.IsAuthenticated(), IsOrderEditableByRequester()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        detail = OrderDetailSerializer(order, context=self.get_serializer_context())
        return Response(detail.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        detail = OrderDetailSerializer(order, context=self.get_serializer_context())
        return Response(detail.data)
