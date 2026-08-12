from django.contrib import admin

from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "created_by", "created_at"]
    search_fields = ["name"]
