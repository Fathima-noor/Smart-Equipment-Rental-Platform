from decimal import Decimal

from rest_framework import serializers
from .models import DamageReport, DamagePayment, DamageIssue,MaintenanceReport
from rest_framework import serializers
from bookings.models import Booking


class AdminEligibleDamageBookingSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    equipment_name = serializers.CharField(
        source='equipment.name',
        read_only=True
    )
    maintenance_status = serializers.CharField(
        source='maintenance_report.status',
        read_only=True
    )
    maintenance_description = serializers.CharField(
        source='maintenance_report.description',
        read_only=True
    )
    maintenance_repair_cost = serializers.DecimalField(
        source='maintenance_report.repair_cost',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )

    class Meta:
        model = Booking
        fields = [
            'id',
            'customer_name',
            'equipment_name',
            'status',
            'payment_status',
            'equipment_workflow_status',
            'equipment_condition_after',
            'damage_description',
            'maintenance_status',
            'maintenance_description',
            'maintenance_repair_cost',
        ]

    def get_customer_name(self, obj):
        customer = obj.customer
        full_name = f'{customer.first_name} {customer.last_name}'.strip()
        return full_name or customer.username


class DamageReportSerializer(serializers.ModelSerializer):

    damage_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00'),
        required=True
    )

    customer_name = serializers.SerializerMethodField()

    equipment_name = serializers.CharField(
        source='booking.equipment.name',
        read_only=True
    )

    vendor_name = serializers.SerializerMethodField()
    maintenance_repair_cost = serializers.SerializerMethodField()
    refund_status = serializers.SerializerMethodField()
    refunded_amount = serializers.SerializerMethodField()
    refund_provider_reference_valid = serializers.SerializerMethodField()
    customer_return_condition = serializers.CharField(
    source='booking.equipment_condition_after',
    read_only=True
)

    class Meta:
        model = DamageReport
        fields = [
            'id',
            'booking',
            'customer_name',
            'equipment_name',
            'vendor_name',
            'customer_return_condition',
            'reported_by',
            'description',
            'damage_amount',
            'maintenance_repair_cost',
            'deposit_deducted',
            'additional_amount',
            'refundable_amount',
            'refund_status',
            'refunded_amount',
            'refund_provider_reference_valid',
            'status',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'customer_name',
            'equipment_name',
            'vendor_name',
            'customer_return_condition',
            'reported_by',
            'deposit_deducted',
            'additional_amount',
            'refundable_amount',
            'refund_status',
            'refunded_amount',
            'refund_provider_reference_valid',
            'status',
            'created_at',
        ]

    def get_customer_name(self, obj):
        customer = obj.booking.customer

        full_name = f"{customer.first_name} {customer.last_name}".strip()

        return full_name or customer.username

    def get_vendor_name(self, obj):
        vendor = obj.booking.equipment.vendor

        full_name = f"{vendor.first_name} {vendor.last_name}".strip()

        return full_name or vendor.username

    def validate_damage_amount(self, value):

        if value < 0:
            raise serializers.ValidationError(
                "Damage amount cannot be negative."
            )

        return value

    def get_maintenance_repair_cost(self, obj):

        maintenance_report = getattr(
            obj.booking,
            'maintenance_report',
            None
        )

        if maintenance_report:
            return maintenance_report.repair_cost

        return None

    def get_refund_status(self, obj):
        try:
            return obj.booking.payment.refund_status
        except Exception:
            return None

    def get_refunded_amount(self, obj):
        try:
            return obj.booking.payment.deposit_refunded
        except Exception:
            return None

    def get_refund_provider_reference_valid(self, obj):
        try:
            reference = obj.booking.payment.refund_transaction_id or ''
            return reference.startswith('re_')
        except Exception:
            return False

    def validate_booking(self, booking):

        if booking.status != 'completed':
            raise serializers.ValidationError(
                "A damage report can only be created after the equipment is returned."
            )

        if booking.payment_status != 'paid':
            raise serializers.ValidationError(
                "Payment must be completed before creating a damage report."
            )

        if booking.equipment_workflow_status != 'damaged':
            raise serializers.ValidationError(
                "Damage report can only be created for confirmed damaged equipment."
            )

        maintenance_report = getattr(
            booking,
            'maintenance_report',
            None
        )

        if maintenance_report is None:
            raise serializers.ValidationError(
                "Maintenance report must be created before creating a damage report."
            )

        if maintenance_report.status != 'completed':
            raise serializers.ValidationError(
                "Maintenance report must be completed before creating a damage report."
            )

        existing_report = DamageReport.objects.filter(
            booking=booking
        ).exists()

        if existing_report:
            raise serializers.ValidationError(
                "A damage report already exists for this booking."
            )

        return booking

       
class DamageReportEditSerializer(serializers.ModelSerializer):

    class Meta:
        model = DamageReport

        fields = [
            'description',
            
        ]

    def validate(self, data):

        if self.instance and self.instance.status == 'resolved':
            raise serializers.ValidationError(
                "A resolved damage report cannot be edited."
            )

        return data




class DamageReportStatusSerializer(serializers.ModelSerializer):

    class Meta:
        model = DamageReport

        fields = ['status']

    def validate_status(self, value):

        allowed_statuses = [
            'reported',
            'reviewed',
            'resolved'
        ]

        if value not in allowed_statuses:
            raise serializers.ValidationError(
                "Invalid damage report status."
            )

        if self.instance and self.instance.status == 'resolved':
            raise serializers.ValidationError(
                "A resolved damage report cannot be changed."
            )

        return value


class DamagePaymentSerializer(serializers.ModelSerializer):

    class Meta:
        model = DamagePayment

        fields = [
            'id',
            'damage_report',
            'customer',
            'amount',
            'payment_status',
            'payment_date',
            'transaction_id',
        ]

        read_only_fields = [
            'id',
            'customer',
            'amount',
            'payment_status',
            'payment_date',
            'transaction_id',
        ]

class DamageIssueSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    equipment_name = serializers.CharField(
        source='damage_report.booking.equipment.name',
        read_only=True
    )
    vendor_name = serializers.SerializerMethodField()
    damage_report_id = serializers.IntegerField(
        source='damage_report.id',
        read_only=True
    )

    class Meta:
        model = DamageIssue
        fields = [
            'id',
            'damage_report',
            'damage_report_id',
            'customer',
            'customer_name',
            'equipment_name',
            'vendor_name',
            'issue_type',
            'description',
            'status',
            'resolution_note',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'damage_report_id',
            'customer',
            'customer_name',
            'equipment_name',
            'vendor_name',
            'status',
            'resolution_note',
            'created_at',
            'updated_at',
        ]

    def get_customer_name(self, obj):
        customer = obj.customer
        full_name = f"{customer.first_name} {customer.last_name}".strip()
        return full_name or customer.username

    def get_vendor_name(self, obj):
        vendor = obj.damage_report.booking.equipment.vendor
        full_name = f"{vendor.first_name} {vendor.last_name}".strip()
        return full_name or vendor.username

class DamageIssueStatusSerializer(serializers.ModelSerializer):

    class Meta:
        model = DamageIssue

        fields = [
            'status',
            'resolution_note',
        ]
     
        read_only_fields = []



class MaintenanceReportSerializer(serializers.ModelSerializer):

    equipment_name = serializers.CharField(
        source='booking.equipment.name',
        read_only=True
    )

    class Meta:
        model = MaintenanceReport

        fields = [
            'id',
            'booking',
            'equipment_name',
            'maintenance_staff',
            'description',
            'repair_cost',
            'status',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'equipment_name',
            'maintenance_staff',
            'status',
            'created_at',
            'updated_at',
        ]

    def validate_booking(self, booking):

        if booking.equipment_workflow_status != 'damaged':
            raise serializers.ValidationError(
                "A maintenance report can only be created for damaged equipment."
            )

        existing_report = MaintenanceReport.objects.filter(
            booking=booking
        ).exists()

        if existing_report:
            raise serializers.ValidationError(
                "A maintenance report already exists for this booking."
            )

        return booking

    def validate_repair_cost(self, value):

        if value < 0:
            raise serializers.ValidationError(
                "Repair cost cannot be negative."
            )

        return value

    def validate_description(self, value):
        description = value.strip()
        if not description:
            raise serializers.ValidationError(
                'Damage description cannot be blank.'
            )
        return description