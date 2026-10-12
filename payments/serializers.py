from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):

    refund_provider_reference_valid = serializers.SerializerMethodField()


    booking_equipment = serializers.CharField(
        source='booking.equipment.name',
        read_only=True
    )
    

    customer_name = serializers.SerializerMethodField()

    vendor_name = serializers.SerializerMethodField()
    handover_date = serializers.DateTimeField(
    source='booking.handed_over_at',
    read_only=True)
    
    class Meta:
        model = Payment

        fields = [
            'id',
            'booking',
            'booking_equipment',
            'customer',
            'customer_name',
            'vendor',
            'vendor_name',
            'handover_date',
            'rental_amount',
            'deposit_amount',
            'total_amount',
            'payment_status',
            'payment_date',
            'transaction_id',
            'deposit_deducted',
            'deposit_refunded',
            'additional_damage_payment',
            'refund_status',
            'refund_transaction_id',
            'refund_attempt',
            'refund_provider_reference_valid',
        ]

        read_only_fields = [
            'id',
            'booking_equipment',
            'customer',
            'customer_name',
            'vendor',
            'vendor_name',
            'handover_date',
            'rental_amount',
            'deposit_amount',
            'total_amount',
            'payment_status',
            'payment_date',
            'transaction_id',
            'deposit_deducted',
            'deposit_refunded',
            'additional_damage_payment',
            'refund_status',
            'refund_transaction_id',
            'refund_attempt',
            'refund_provider_reference_valid',
        ]

    def get_customer_name(self, obj):
        customer = obj.customer

        full_name = (
            f'{customer.first_name} {customer.last_name}'
        ).strip()

        return full_name or customer.username

    def get_refund_provider_reference_valid(self, obj):
        return bool(
            obj.refund_transaction_id and
            obj.refund_transaction_id.startswith('re_')
        )

    def get_vendor_name(self, obj):
        if not obj.vendor:
            return None

        full_name = (
            f'{obj.vendor.first_name} {obj.vendor.last_name}'
        ).strip()

        return full_name or obj.vendor.username
    

class PaymentProcessSerializer(serializers.ModelSerializer):

    class Meta:
        model = Payment

        fields = [
            'payment_status',
            'transaction_id',
        ]

        read_only_fields = [
            'payment_status',
            'transaction_id',
        ]