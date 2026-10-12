from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import DamageReport, DamagePayment


@admin.register(DamageReport)
class DamageReportAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'booking',
        'reported_by',
        'damage_amount',
        'deposit_deducted',
        'additional_amount',
        'status',
        'created_at',
    )

    list_filter = (
        'status',
    )

    search_fields = (
        'booking__customer__username',
        'description',
    )


@admin.register(DamagePayment)
class DamagePaymentAdmin(admin.ModelAdmin):

    list_display = (
        'id',
        'damage_report',
        'customer',
        'amount',
        'payment_status',
        'payment_date',
        'transaction_id',
    )

    list_filter = (
        'payment_status',
    )

    search_fields = (
        'customer__username',
        'transaction_id',
    )