from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):

    list_display = [
        'id',
        'booking',
        'customer',
        'rental_amount',
        'deposit_amount',
        'total_amount',
        'payment_status',
        'refund_status',
        'transaction_id',
    ]

    list_filter = (
        'payment_status',
    )

    search_fields = (
        'customer__username',
        'transaction_id',
    )