from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.products.models import Product

from .models import Order, OrderEvent, OrderLine
from .services import allocate_order_number

MAX_LINES = 50
MIN_LINES = 1


def _display_name(user):
    if not user:
        return "System"
    return user.get_full_name() or user.email


# --- Read serializers ------------------------------------------------------


class OrderLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product_name_snapshot", read_only=True)
    line_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = OrderLine
        fields = ["id", "product", "product_name", "quantity", "price", "line_total"]
        read_only_fields = fields


class OrderEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderEvent
        fields = ["id", "kind", "from_status", "to_status", "description", "actor_name", "created_at"]
        read_only_fields = fields

    def get_actor_name(self, obj):
        return _display_name(obj.actor)


class OrderListSerializer(serializers.ModelSerializer):
    order_no = serializers.ReadOnlyField()
    client_name = serializers.CharField(source="client_name_snapshot", read_only=True)
    salesman_name = serializers.SerializerMethodField()
    total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "order_no", "client_name", "salesman_name", "status", "total", "created_at"]
        read_only_fields = fields

    def get_salesman_name(self, obj):
        return _display_name(obj.salesman)


class OrderDetailSerializer(serializers.ModelSerializer):
    order_no = serializers.ReadOnlyField()
    client_name = serializers.CharField(source="client_name_snapshot", read_only=True)
    salesman_name = serializers.SerializerMethodField()
    billed_by_name = serializers.SerializerMethodField()
    lines = OrderLineSerializer(many=True, read_only=True)
    events = OrderEventSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_no", "client", "client_name", "salesman_name", "status",
            "billed_by_name", "lines", "events", "total", "can_edit", "created_at", "updated_at",
        ]
        read_only_fields = fields

    def get_salesman_name(self, obj):
        return _display_name(obj.salesman)

    def get_billed_by_name(self, obj):
        return _display_name(obj.billed_by) if obj.billed_by_id else None

    def get_total(self, obj):
        return sum((line.line_total for line in obj.lines.all()), Decimal("0.00"))

    def get_can_edit(self, obj):
        request = self.context.get("request")
        if not request or obj.status != Order.Status.PENDING:
            return False
        user = request.user
        return user.role == "PARTNER" or obj.salesman_id == user.id


# --- Write serializers -------------------------------------------------


class OrderLineWriteSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))


class OrderCreateSerializer(serializers.ModelSerializer):
    lines = OrderLineWriteSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = ["client", "lines"]

    def validate_lines(self, value):
        if not (MIN_LINES <= len(value) <= MAX_LINES):
            raise serializers.ValidationError(f"An order must have between {MIN_LINES} and {MAX_LINES} line items.")
        return value

    def create(self, validated_data):
        lines_data = validated_data.pop("lines")
        client = validated_data["client"]
        request = self.context["request"]

        with transaction.atomic():
            year, seq = allocate_order_number()
            order = Order.objects.create(
                year=year,
                seq=seq,
                client=client,
                client_name_snapshot=client.name,
                salesman=request.user,
                status=Order.Status.PENDING,
            )
            OrderLine.objects.bulk_create(
                OrderLine(
                    order=order,
                    product=line["product"],
                    product_name_snapshot=line["product"].name,
                    quantity=line["quantity"],
                    price=line["price"],
                )
                for line in lines_data
            )
            OrderEvent.objects.create(
                order=order,
                actor=request.user,
                kind=OrderEvent.Kind.CREATED,
                to_status=Order.Status.PENDING,
                description=f"Order created by {_display_name(request.user)}.",
            )
        return order


class OrderUpdateSerializer(serializers.ModelSerializer):
    lines = OrderLineWriteSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = ["client", "lines"]

    def validate_lines(self, value):
        if not (MIN_LINES <= len(value) <= MAX_LINES):
            raise serializers.ValidationError(f"An order must have between {MIN_LINES} and {MAX_LINES} line items.")
        return value

    def validate(self, attrs):
        if self.instance.status != Order.Status.PENDING:
            raise serializers.ValidationError("Only pending orders can be edited.")
        return attrs

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines")
        client = validated_data.get("client", instance.client)
        request = self.context["request"]

        with transaction.atomic():
            instance.client = client
            instance.client_name_snapshot = client.name
            instance.save(update_fields=["client", "client_name_snapshot", "updated_at"])

            instance.lines.all().delete()
            OrderLine.objects.bulk_create(
                OrderLine(
                    order=instance,
                    product=line["product"],
                    product_name_snapshot=line["product"].name,
                    quantity=line["quantity"],
                    price=line["price"],
                )
                for line in lines_data
            )
            OrderEvent.objects.create(
                order=instance,
                actor=request.user,
                kind=OrderEvent.Kind.EDITED,
                description=f"Order edited by {_display_name(request.user)}.",
            )
        return instance
