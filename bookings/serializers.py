from decimal import Decimal

from rest_framework import serializers

from .models import Booking
from django.utils import timezone
from payments.models import Payment

class BookingSerializer(serializers.ModelSerializer):

    customer_name = serializers.SerializerMethodField()

    equipment_name = serializers.CharField(
        source='equipment.name',
        read_only=True
    )

    equipment_category = serializers.CharField(
        source='equipment.category',
        read_only=True
    )
    maintenance_status = serializers.SerializerMethodField()
    maintenance_repair_cost = serializers.SerializerMethodField()

    payment_id = serializers.SerializerMethodField()
    refund_status = serializers.SerializerMethodField()
    deposit_refunded = serializers.SerializerMethodField()
    deposit_deducted = serializers.SerializerMethodField()


    class Meta:
        model = Booking

        fields = [
            'id',
            'customer',
            'customer_name',
            'equipment',
            'equipment_name',
            'equipment_category',
            'start_date',
            'end_date',
            'total_amount',
            'deposit',
            'status',
            'payment_status',
            'payment_id',
            'refund_status',
            'deposit_refunded',
            'deposit_deducted',
            'equipment_condition_before',
            'equipment_condition_after',
            'damage_description',
            'equipment_workflow_status',
            'received_by',
            'received_at',
            'handed_over_by',
            'handed_over_at',
            'inspected_by',
            'inspected_at',
            'returned_at',
            'maintenance_status',
            'maintenance_repair_cost',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'customer',
            'equipment_name',
            'equipment_category',
            'total_amount',
            'deposit',
            'status',
            'payment_status',
            'equipment_condition_before',
            'equipment_condition_after',
            'damage_description',
            'equipment_workflow_status',
            'received_by',
            'received_at',
            'handed_over_by',
            'handed_over_at',
            'inspected_by',
            'inspected_at',            
            'returned_at',
            'created_at',
            'updated_at',
        ]


    def get_customer_name(self, obj):
        customer = obj.customer

        full_name = (
             f"{customer.first_name} {customer.last_name}"
        ).strip()

        return full_name or customer.username


    def get_payment_id(self, obj):
        try:
            return obj.payment.id
        except Payment.DoesNotExist:
            return None

    def get_refund_status(self, obj):
        try:
            return obj.payment.refund_status
        except Payment.DoesNotExist:
            return 'not_applicable'

    def get_deposit_refunded(self, obj):
        try:
            return obj.payment.deposit_refunded
        except Payment.DoesNotExist:
            return Decimal('0.00')

    def get_deposit_deducted(self, obj):
        try:
            return obj.payment.deposit_deducted
        except Payment.DoesNotExist:
            return Decimal('0.00')

    def validate(self, data):

        equipment = data.get('equipment', self.instance.equipment if self.instance else None)
        start_date = data.get('start_date', self.instance.start_date if self.instance else None)
        end_date = data.get('end_date', self.instance.end_date if self.instance else None)
        # 1. Check dates

        # 1. Start date must be tomorrow or later

        # if self.instance is None and start_date <= timezone.localdate():
        #     raise serializers.ValidationError(
        #         "Rental start date must be tomorrow or a future date."
        #     )



        if end_date < start_date:
            raise serializers.ValidationError(
                "End date must be after or equal to start date."
            )

        # 2. Check equipment availability

        if not equipment.is_available:
            raise serializers.ValidationError(
                "This equipment is currently unavailable."
            )

        # 3. Find overlapping bookings

        overlapping_bookings = Booking.objects.filter(
            equipment=equipment,
            start_date__lte=end_date,
            end_date__gte=start_date,
            status__in=['pending', 'approved']
        )

        # 4. Check quantity

        if overlapping_bookings.count() >= equipment.quantity:
            raise serializers.ValidationError(
                "This equipment is fully booked for the selected dates."
            )

        return data

    def create(self, validated_data):

        equipment = validated_data['equipment']
        start_date = validated_data['start_date']
        end_date = validated_data['end_date']

        # Calculate rental days
        rental_days = (
            end_date - start_date
        ).days + 1

        # Calculate total rental amount
        total_amount = (
            equipment.price_per_day * rental_days
        )

        # Calculate 20% security deposit
        deposit = (
            total_amount * Decimal('0.20')
        )

        # Create booking
        booking = Booking.objects.create(
            total_amount=total_amount,
            deposit=deposit,
            **validated_data
        )

        return booking

    def get_maintenance_status(self, obj):

        maintenance_report = getattr(
            obj,
            'maintenance_report',
            None
        )

        if maintenance_report:
            return maintenance_report.status

        return None

    def get_maintenance_repair_cost(self, obj):

        maintenance_report = getattr(
            obj,
            'maintenance_report',
            None
        )

        if maintenance_report:
            return maintenance_report.repair_cost

        return None


class BookingStatusSerializer(serializers.ModelSerializer):

    class Meta:
        model = Booking

        fields = [
            'status'
        ]

    def validate_status(self, value):

        allowed_statuses = [
            'pending',
            'approved',
            'rejected',
            'completed',
            'cancelled'
        ]

        if value not in allowed_statuses:
            raise serializers.ValidationError(
                "Invalid booking status."
            )

        return value


class BookingReturnSerializer(serializers.ModelSerializer):

    class Meta:
        model = Booking

        fields = [
            'equipment_condition_after',
        ]

    def validate_equipment_condition_after(self, value):

        allowed_conditions = [
            'good',
            'damaged'
        ]

        if value not in allowed_conditions:
            raise serializers.ValidationError(
                "Invalid equipment condition."
            )

        return value

    def validate(self, data):

        booking = self.instance

        if booking.status != 'approved':
            raise serializers.ValidationError(
                "Only an approved booking can be returned."
            )

        if booking.payment_status != 'paid':
            raise serializers.ValidationError(
                "Payment must be completed before returning the equipment."
            )

        if booking.equipment_workflow_status != 'handed_over':
            raise serializers.ValidationError(
                "Equipment must be handed over to the customer before it can be returned."
            )

        if booking.end_date > timezone.localdate():
            raise serializers.ValidationError(
                "You cannot return the equipment before the rental end date."
            )

        return data



class EquipmentReturnToVendorSerializer(serializers.ModelSerializer):

    class Meta:
        model = Booking
        fields = []

    def validate(self, data):

        booking = self.instance

        if booking.equipment_workflow_status != 'no_damage':
            raise serializers.ValidationError(
                "Only equipment with no damage can be returned to the vendor."
            )

        return data