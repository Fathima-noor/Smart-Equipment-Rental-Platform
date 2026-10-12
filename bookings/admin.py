from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'customer',
        'equipment',
        'start_date',
        'end_date',
        'total_amount',
        'deposit',
        'status',
        'payment_status',
        'equipment_condition_before',
        'equipment_condition_after',
        'returned_at',
    )

    list_filter = (
        'status',
        'payment_status',
        'equipment_condition_before',
        'equipment_condition_after',
    )

    search_fields = (
        'customer__username',
        'equipment__name',
    )