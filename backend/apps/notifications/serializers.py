from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    order_id = serializers.SerializerMethodField()
    order_no = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "kind", "message", "order_id", "order_no", "is_read", "created_at"]
        read_only_fields = fields

    def get_order_id(self, obj):
        return obj.order_id

    def get_order_no(self, obj):
        # obj.order.order_no is a computed property (not a DB column),
        # so it can only be read once the related Order is fetched —
        # guarded here since order is nullable.
        return obj.order.order_no if obj.order_id else None
