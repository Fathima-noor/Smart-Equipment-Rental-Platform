from rest_framework import generics,serializers,permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from datetime import date, timedelta
from equipment.models import Equipment

from payments.models import Payment
from .models import Booking
from .serializers import (
    BookingSerializer,
    BookingStatusSerializer,
    BookingReturnSerializer,
    EquipmentReturnToVendorSerializer

)
from accounts.models import User

from .permissions import IsCustomerOrVendor,IsOperationsStaff
from django.utils import timezone
from accounts.permissions import IsAdmin
from django.db import transaction

from notifications.models import Notification

class BookingListCreateView(generics.ListCreateAPIView):

    serializer_class = BookingSerializer
    def get_permissions(self):

     if self.request.method in permissions.SAFE_METHODS:

        return [permissions.IsAuthenticated()]

     return [IsCustomerOrVendor()]

    def get_queryset(self):

        user = self.request.user

        if user.role == 'customer':
            return Booking.objects.filter(customer=user)

        if user.role == 'vendor':
            return Booking.objects.filter(
                equipment__vendor=user
            ) 

        if user.role == 'admin':
            return Booking.objects.all()

        if user.role == 'operations_staff':
            return Booking.objects.all()

        return Booking.objects.none()
    def perform_create(self, serializer):

        # Create the booking
        booking = serializer.save(
            customer=self.request.user
        )

        # ----------------------------------------
        # NOTIFY VENDOR
        # ----------------------------------------

        vendor = booking.equipment.vendor
        customer = booking.customer
        equipment = booking.equipment

        customer_name = (
            f"{customer.first_name} {customer.last_name}"
        ).strip()

        if not customer_name:
            customer_name = customer.username

        Notification.objects.create(
            user=vendor,
            title='New Booking Request',
            message=(
                f'{customer_name} submitted a booking request '
                f'for {equipment.name}.'
            ),
            notification_type='booking'
        )


class BookingDetailView(generics.RetrieveAPIView):

    serializer_class = BookingSerializer
    permission_classes = [IsCustomerOrVendor]

    def get_queryset(self):

        user = self.request.user

        if user.role == 'customer':
            return Booking.objects.filter(
                customer=user
            )

        if user.role == 'vendor':
            return Booking.objects.filter(
                equipment__vendor=user
            )

        if user.role == 'admin':
            return Booking.objects.all()

        return Booking.objects.none()

class EquipmentAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, equipment_id):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not start_date or not end_date:
            return Response(
                {'detail': 'Both start_date and end_date are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            start = date.fromisoformat(start_date)
            end = date.fromisoformat(end_date)
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if end < start:
            return Response(
                {'detail': 'End date must be after or equal to start date.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        equipment = get_object_or_404(Equipment, id=equipment_id)

        if not equipment.is_available or equipment.quantity <= 0:
            return Response({
                'available': False,
                'message': 'This equipment is currently unavailable.'
            })

        current_date = start

        while current_date <= end:
            booked_count = Booking.objects.filter(
                equipment=equipment,
                start_date__lte=current_date,
                end_date__gte=current_date,
                status__in=['pending', 'approved']
            ).count()

            if booked_count >= equipment.quantity:
                return Response({
                    'available': False,
                    'message': 'This equipment is fully booked for the selected dates.'
                })

            current_date += timedelta(days=1)

        return Response({
            'available': True,
            'message': 'Equipment is available for the selected dates.'
        })


class BookingStatusUpdateView(generics.UpdateAPIView):

    queryset = Booking.objects.all()
    serializer_class = BookingStatusSerializer
    permission_classes = [IsCustomerOrVendor]

    http_method_names = ['patch']

    def get_queryset(self):

        user = self.request.user

        if user.role == 'vendor':
            return Booking.objects.filter(
                equipment__vendor=user
            )

        if user.role == 'admin':
            return Booking.objects.all()

        return Booking.objects.none()

    @transaction.atomic
    def perform_update(self, serializer):

        # Save the new booking status
        booking = serializer.save()

        customer = booking.customer
        equipment = booking.equipment

        # ----------------------------------------
        # APPROVED
        # ----------------------------------------

        if booking.status == 'approved':

            Notification.objects.create(
                user=customer,
                title='Booking Approved',
                message=(
                    f'Your booking for {equipment.name} '
                    f'has been approved.'
                ),
                notification_type='booking'
            )

        # ----------------------------------------
        # REJECTED
        # ----------------------------------------

        elif booking.status == 'rejected':

            Notification.objects.create(
                user=customer,
                title='Booking Rejected',
                message=(
                    f'Your booking for {equipment.name} '
                    f'has been rejected.'
                ),
                notification_type='booking'
            )

        # ----------------------------------------
        # CANCELLED
        # ----------------------------------------

        elif booking.status == 'cancelled':

            Notification.objects.create(
                user=customer,
                title='Booking Cancelled',
                message=(
                    f'Your booking for {equipment.name} '
                    f'has been cancelled.'
                ),
                notification_type='booking'
            )


class EquipmentReceiveView(generics.UpdateAPIView):

    serializer_class = BookingSerializer
    permission_classes = [IsOperationsStaff]
    http_method_names = ['patch']

    def get_queryset(self):
        return Booking.objects.filter(
            status='approved',
            equipment_workflow_status='booked'
        )

    @transaction.atomic
    def perform_update(self, serializer):

        booking = serializer.instance

        booking.equipment_workflow_status = 'received'
        booking.received_by = self.request.user
        booking.received_at = timezone.now()

        booking.save(
            update_fields=[
                'equipment_workflow_status',
                'received_by',
                'received_at',
                'updated_at'
            ]
        )

        Notification.objects.create(
            user=booking.equipment.vendor,
            title='Equipment Received',
            message=(
                f'{booking.equipment.name} has been received '
                f'from you by Operations Staff.'
            ),
            notification_type='booking'
        )

class EquipmentHandoverView(generics.UpdateAPIView):

    serializer_class = BookingSerializer
    permission_classes = [IsOperationsStaff]
    http_method_names = ['patch']

    def get_queryset(self):
        return Booking.objects.filter(
            status='approved',
            equipment_workflow_status='received',
            payment_status='paid'
        )

    @transaction.atomic
    def perform_update(self, serializer):

        booking = serializer.instance

        booking.equipment_workflow_status = 'handed_over'
        booking.handed_over_by = self.request.user
        booking.handed_over_at = timezone.now()

        booking.save(
            update_fields=[
                'equipment_workflow_status',
                'handed_over_by',
                'handed_over_at',
                'updated_at'
            ]
        )


        # 2. Get vendor from the booked equipment
        vendor = booking.equipment.vendor

        # 3. Get the existing customer payment record
        payment = Payment.objects.select_for_update().get(
            booking=booking
        )

        # 4. Link this payment to the equipment vendor
        payment.vendor = vendor

        # Rental amount only; deposit is excluded
        payment.rental_amount = booking.total_amount

        payment.save(
            update_fields=[
                'vendor',
                'rental_amount'
            ]
        )

        Notification.objects.create(
            user=booking.customer,
            title='Equipment Handed Over',
            message=(
                f'{booking.equipment.name} has been handed over '
                f'to you by Operations Staff.'
            ),
            notification_type='booking'
        )


class EquipmentInspectionView(generics.UpdateAPIView):

    serializer_class = BookingSerializer
    permission_classes = [IsOperationsStaff]
    http_method_names = ['patch']

    def get_queryset(self):
        return Booking.objects.filter(
            status='approved',
            equipment_workflow_status='awaiting_inspection'
        )

    @transaction.atomic
    def perform_update(self, serializer):

        booking = serializer.instance
        condition = self.request.data.get('condition')
        damage_description = self.request.data.get(
            'damage_description', ''
        ).strip()

        if condition not in ['no_damage', 'damaged']:
            raise serializers.ValidationError(
                "Condition must be either no_damage or damaged."
            )

        if condition == 'damaged' and not damage_description:
            raise serializers.ValidationError(
                "Damage description is required when equipment is damaged."
            )

        booking.inspected_by = self.request.user
        booking.inspected_at = timezone.now()

        if condition == 'no_damage':
            booking.equipment_workflow_status = 'no_damage'
            booking.equipment_condition_after = 'good'
            booking.damage_description = None

        else:
            booking.equipment_workflow_status = 'damaged'
            booking.equipment_condition_after = 'damaged'
            booking.damage_description = damage_description

        booking.save(
            update_fields=[
                'equipment_workflow_status',
                'equipment_condition_after',
                'damage_description',
                'inspected_by',
                'inspected_at',
                'updated_at'
            ]
        )

        Notification.objects.create(
            user=booking.customer,
            title='Equipment Inspection Completed',
            message=(
                f'{booking.equipment.name} has been inspected. '
                f'Condition: {booking.equipment_condition_after}.'
            ),
            notification_type='booking'
        )

        if condition == 'damaged':
            maintenance_staff = User.objects.filter(
                role='maintenance_staff'
            )

            for staff in maintenance_staff:
                Notification.objects.create(
                    user=staff,
                    title='Damaged Equipment Requires Maintenance',
                    message=(
                        f'Booking #{booking.id}: '
                        f'{booking.equipment.name} was marked as damaged. '
                        f'Damage details: {damage_description}'
                    ),
                    notification_type='damage'
                )




class EquipmentReturnToVendorView(generics.UpdateAPIView):

    serializer_class = EquipmentReturnToVendorSerializer
    permission_classes = [IsOperationsStaff]
    http_method_names = ['patch']

    def get_queryset(self):
        return Booking.objects.filter(
            status='approved',
            equipment_workflow_status='no_damage'
        )

    @transaction.atomic
    def perform_update(self, serializer):

        booking = serializer.instance
        equipment = booking.equipment

        booking.equipment_workflow_status = 'returned_to_vendor'
        booking.status = 'completed'

        booking.save(
            update_fields=[
                'equipment_workflow_status',
                'status',
                'updated_at'
            ]
        )

        equipment.is_available = True
        equipment.save(
            update_fields=['is_available']
        )

        Notification.objects.create(
            user=equipment.vendor,
            title='Equipment Returned',
            message=(
                f'{equipment.name} has been inspected and returned '
                f'to you in good condition.'
            ),
            notification_type='booking'
        )

        Notification.objects.create(
            user=booking.customer,
            title='Booking Completed',
            message=(
                f'Your booking for {equipment.name} has been completed '
                f'after the equipment was returned in good condition.'
            ),
            notification_type='booking'
        )



class EquipmentCompleteDamagedView(generics.UpdateAPIView):

    serializer_class = BookingSerializer
    permission_classes = [IsOperationsStaff]
    http_method_names = ['patch']

    def get_queryset(self):
        return Booking.objects.filter(
            status='approved',
            equipment_workflow_status='damaged',
            maintenance_report__status='completed'
        )

    @transaction.atomic
    def perform_update(self, serializer):

        booking = serializer.instance

        booking.status = 'completed'

        booking.save(
            update_fields=[
                'status',
                'updated_at'
            ]
        )

        Notification.objects.create(
            user=booking.equipment.vendor,
            title='Damaged Process Completed',
            message=(
                f'The maintenance process for '
                f'{booking.equipment.name} has been completed. '
                f'The admin will now create the damage report.'
            ),
            notification_type='damage'
        )

        Notification.objects.create(
            user=booking.customer,
            title='Equipment Damage Under Review',
            message=(
                f'The returned {booking.equipment.name} '
                f'was found damaged and has completed maintenance '
                f'inspection. A damage report will be created by '
                f'the admin.'
            ),
            notification_type='damage' 
        )


class BookingReturnView(generics.UpdateAPIView):

    serializer_class = BookingReturnSerializer
    permission_classes = [IsCustomerOrVendor]

    http_method_names = ['patch']

    def get_queryset(self):

        user = self.request.user

        if user.role == 'customer':
            return Booking.objects.filter(
                customer=user
            )

        if user.role == 'vendor':
            return Booking.objects.filter(
                equipment__vendor=user
            )

        if user.role == 'admin':
            return Booking.objects.all()

        return Booking.objects.none()

    @transaction.atomic
    def perform_update(self, serializer):

        booking = serializer.save(
            returned_at=timezone.now(),
            equipment_workflow_status='awaiting_inspection'
        )

        equipment = booking.equipment
        customer = booking.customer

        Notification.objects.create(
            user=customer,
            title='Equipment Returned',
            message=(
                f'{equipment.name} has been returned successfully. '
                f'Operations Staff will inspect the equipment.'
            ),
            notification_type='booking'
        )

        Notification.objects.create(
            user=equipment.vendor,
            title='Equipment Returned',
            message=(
                f'{equipment.name} has been returned by the customer '
                f'and is awaiting inspection.'
            ),
            notification_type='booking'
        )

class AdminBookingListView(generics.ListAPIView):

    serializer_class = BookingSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):

        return Booking.objects.select_related(
            'customer',
            'equipment',
            'equipment__vendor'
        ).order_by('-created_at')


class AdminBookingDetailView(generics.RetrieveAPIView):

    serializer_class = BookingSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):

        return Booking.objects.select_related(
            'customer',
            'equipment',
            'equipment__vendor'
        )


class AdminBookingStatusUpdateView(generics.UpdateAPIView):

    serializer_class = BookingStatusSerializer
    permission_classes = [IsAdmin]

    http_method_names = ['patch']

    def get_queryset(self):

        return Booking.objects.select_related(
            'customer',
            'equipment',
            'equipment__vendor'
        )

    @transaction.atomic
    def perform_update(self, serializer):

        booking = serializer.save()

        customer = booking.customer
        equipment = booking.equipment

        # -----------------------------
        # APPROVED
        # -----------------------------

        if booking.status == 'approved':

            Notification.objects.create(
                user=customer,
                title='Booking Approved',
                message=(
                    f'Your booking for {equipment.name} '
                    f'has been approved by the administrator.'
                ),
                notification_type='booking'
            )

        # -----------------------------
        # REJECTED
        # -----------------------------

        elif booking.status == 'rejected':

            Notification.objects.create(
                user=customer,
                title='Booking Rejected',
                message=(
                    f'Your booking for {equipment.name} '
                    f'has been rejected by the administrator.'
                ),
                notification_type='booking'
            )

        # -----------------------------
        # CANCELLED
        # -----------------------------

        elif booking.status == 'cancelled':

            Notification.objects.create(
                user=customer,
                title='Booking Cancelled',
                message=(
                    f'Your booking for {equipment.name} '
                    f'has been cancelled by the administrator.'
                ),
                notification_type='booking'
            )

        # -----------------------------
        # COMPLETED
        # -----------------------------

        elif booking.status == 'completed':

            Notification.objects.create(
                user=customer,
                title='Booking Completed',
                message=(
                    f'Your booking for {equipment.name} '
                    f'has been marked as completed.'
                ),
                notification_type='booking'
            )