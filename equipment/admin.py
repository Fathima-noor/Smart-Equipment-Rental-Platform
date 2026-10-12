from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Equipment


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'name',
        'category',
        'price_per_day',
        'quantity',
        'is_available',
        'vendor',
    )

    list_filter = (
        'category',
        'is_available',
    )

    search_fields = (
        'name',
        'description',
    )