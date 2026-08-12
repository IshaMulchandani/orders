from django.contrib import admin

from .models import Order, OrderCounter, OrderEvent, OrderLine


class OrderLineInline(admin.TabularInline):
    model = OrderLine
    extra = 0
    readonly_fields = ["product_name_snapshot"]


class OrderEventInline(admin.TabularInline):
    model = OrderEvent
    extra = 0
    readonly_fields = ["actor", "kind", "from_status", "to_status", "description", "created_at"]
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_no", "client_name_snapshot", "salesman", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["client_name_snapshot", "salesman__email"]
    inlines = [OrderLineInline, OrderEventInline]


@admin.register(OrderCounter)
class OrderCounterAdmin(admin.ModelAdmin):
    list_display = ["year", "last_seq"]
