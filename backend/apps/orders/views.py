"""
Order endpoints: create/list/retrieve/update of orders, the status
transition action that drives the whole workflow (Pending -> Bill
Created -> Shipped -> Payment Pending -> Done, and Cancel), and the
Partner-only history view (Done + Cancelled).
"""
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.permissions import HasRole

from .models import Order
from .permissions import IsOrderEditableByRequester
from .serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    OrderListSerializer,
    OrderUpdateSerializer,
)
from .services import TransitionError, apply_transition, orders_visible_to, with_total


class OrderViewSet(viewsets.ModelViewSet):
    # No DELETE — cancellation is a status transition, not a row
    # deletion. Orders are never removed once created.
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self):
        qs = orders_visible_to(self.request.user).select_related("client", "salesman", "billed_by")
        # Annotated once here (used by OrderListSerializer's plain
        # `total` field); OrderDetailSerializer computes its own total
        # from prefetched lines instead, since it's a single object.
        qs = with_total(qs)
        # Optional ?status=PENDING filter — used by the Partner
        # dashboard tabs and the Accountant/Packaging queue views so
        # each can ask for just their slice without extra endpoints.
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param.upper())
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

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        """
        POST {to_status} -> moves the order to a new status, or
        rejects with a 400 and a user-facing reason. Any authenticated
        user can call this; apps.orders.services._validate_transition
        is what actually enforces who's allowed to do what — see
        OrderDetailSerializer.available_actions for the same check
        used to decide which buttons the frontend shows in the first
        place.
        """
        order = self.get_object()
        to_status = request.data.get("to_status")
        if not to_status:
            return Response({"detail": "to_status is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            apply_transition(order, request.user, to_status)
        except TransitionError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        detail = OrderDetailSerializer(order, context=self.get_serializer_context())
        return Response(detail.data)


class OrderHistoryView(generics.ListAPIView):
    """
    Partner-only. Chronological Done + Cancelled orders — the
    click-through target for a Partner's Done/Cancelled notifications,
    and a general audit view. Filters:
      ?kind=done|cancelled   (default: both)
      ?date_from, ?date_to   (YYYY-MM-DD, filtered on created_at)
      ?q                     (client name, case-insensitive contains)
    """

    serializer_class = OrderListSerializer
    permission_classes = [HasRole.for_roles("PARTNER")]

    def get_queryset(self):
        qs = with_total(
            Order.objects.filter(status__in=[Order.Status.DONE, Order.Status.CANCELLED]).select_related(
                "client", "salesman", "billed_by"
            )
        )

        params = self.request.query_params
        kind = params.get("kind")
        if kind == "done":
            qs = qs.filter(status=Order.Status.DONE)
        elif kind == "cancelled":
            qs = qs.filter(status=Order.Status.CANCELLED)

        date_from = params.get("date_from")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        date_to = params.get("date_to")
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        q = params.get("q")
        if q:
            # order_no is a computed property (year/seq), not a DB
            # column, so it can't be filtered on directly — client name
            # covers the common "find this order" search case instead.
            qs = qs.filter(client_name_snapshot__icontains=q)

        return qs
