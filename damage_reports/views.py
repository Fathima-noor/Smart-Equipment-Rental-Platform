from rest_framework import generics, serializers,status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db import transaction
from django.shortcuts import get_object_or_404
from decimal import Decimal
from bookings.models import Booking
from bookings.serializers import BookingSerializer
from accounts.permissions import IsAdmin
from .models import DamageReport, DamagePayment,DamageIssue,MaintenanceReport
from .serializers import (
    DamageReportSerializer,
    DamageReportStatusSerializer,
    DamagePaymentSerializer,
    DamageIssueSerializer,
    DamageIssueStatusSerializer,
    DamageReportEditSerializer,
    MaintenanceReportSerializer,
    AdminEligibleDamageBookingSerializer

)
from notifications.models import Notification
from accounts.models import User
from payments.models import Payment
import stripe
from django.conf import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


class DamageReportListCreateView(generics.ListCreateAPIView):

    serializer_class = DamageReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        user = self.request.user

        if user.role == 'vendor':
            return DamageReport.objects.filter(
                booking__equipment__vendor=user
            ).select_related(
                'booking',
                'booking__equipment',
                'booking__customer'
            )

        if user.role == 'customer':
            return DamageReport.objects.filter(
                booking__customer=user
            ).select_related(
                'booking',
                'booking__equipment',
                'booking__customer'
            )

        if user.role == 'admin':
            return DamageReport.objects.all().select_related(
                'booking',
                'booking__equipment',
                'booking__customer'
            )

        return DamageReport.objects.none()

    @transaction.atomic
    def perform_create(self, serializer):

        user = self.request.user

        # Only Admin can create damage reports
        if user.role != 'admin':
            raise serializers.ValidationError(
                "Only Admin can create damage reports."
            )

        booking_id = serializer.validated_data['booking'].pk
        booking = Booking.objects.select_for_update().select_related(
            'customer',
            'equipment',
            'equipment__vendor'
        ).get(pk=booking_id)

        # Equipment must already be returned
        if booking.status != 'completed':
            raise serializers.ValidationError(
                "Damage report can only be created after the equipment has been returned."
            )

        try:
            payment = Payment.objects.select_for_update().get(booking=booking)
        except Payment.DoesNotExist:
            raise serializers.ValidationError({
                'booking': 'A verified booking payment is required before creating a damage report.'
            })

        if booking.payment_status != 'paid' or payment.payment_status != 'paid':
            raise serializers.ValidationError({
                'booking': 'Payment must be completed before creating a damage report.'
            })

        # Equipment must be damaged
        if booking.equipment_workflow_status != 'damaged':
            raise serializers.ValidationError(
                "Damage report can only be created for damaged equipment."
            )

        # Don't allow multiple damage reports
        existing_report = DamageReport.objects.filter(
            booking=booking
        ).exists()

        if existing_report:
            raise serializers.ValidationError(
                "A damage report already exists for this booking."
            )

        # Maintenance report must exist
        maintenance_report = getattr(
            booking,
            'maintenance_report',
            None
        )

        if maintenance_report is None:
            raise serializers.ValidationError(
                "Maintenance report must be created before creating a damage report."
            )

        # Maintenance report must be completed
        if maintenance_report.status != 'completed':
            raise serializers.ValidationError(
                "Maintenance report must be completed before creating a damage report."
            )

        damage_amount = serializer.validated_data['damage_amount']
        available_deposit = max(
            payment.deposit_amount - payment.deposit_deducted - payment.deposit_refunded,
            Decimal('0.00')
        )
        deducted_amount = min(damage_amount, available_deposit)
        additional_amount = max(
            damage_amount - available_deposit,
            Decimal('0.00')
        )
        refundable_amount = max(
            available_deposit - damage_amount,
            Decimal('0.00')
        )

        damage_report = serializer.save(
            booking=booking,
            reported_by=user,
            description=serializer.validated_data['description'],
            damage_amount=damage_amount,
            deposit_deducted=deducted_amount,
            additional_amount=additional_amount,
            refundable_amount=refundable_amount
        )

        payment.deposit_deducted += deducted_amount
        payment.additional_damage_payment = additional_amount
        if refundable_amount > 0:
            payment.refund_status = 'pending'
        payment.save(
            update_fields=[
                'deposit_deducted',
                'additional_damage_payment',
                'refund_status'
            ]
        )

        # Notify customer
        customer = booking.customer
        equipment = booking.equipment

        message = (
            f'Official damage report #{damage_report.id} for booking '
            f'#{booking.id} ({equipment.name}) has been created. '
            f'Damage amount: ₹{damage_amount}. '
            f'₹{deducted_amount} was allocated from your security deposit.'
        )
        if additional_amount > 0:
            message += f' Additional payment due: ₹{additional_amount}.'
        if refundable_amount > 0:
            message += (
                f' Refundable deposit balance: ₹{refundable_amount} is pending; '
                'it has not yet been processed.'
            )

        Notification.objects.create(
            user=customer,
            title='Damage Report Created',
            message=message,
            notification_type='damage'
        )


class AdminEligibleDamageBookingListView(generics.ListAPIView):
    serializer_class = AdminEligibleDamageBookingSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return Booking.objects.filter(
            status__in=['approved', 'completed'],
            payment_status='paid',
            equipment_workflow_status='damaged',
            maintenance_report__status='completed'
        ).exclude(
            damage_reports__isnull=False
        ).select_related(
            'customer',
            'equipment',
            'equipment__vendor',
            'maintenance_report'
        ).order_by('-id')

class DamageReportEditView(generics.UpdateAPIView):

    serializer_class = DamageReportEditSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = ['patch']

    def get_queryset(self):

        user = self.request.user

        if user.role == 'admin':
            return DamageReport.objects.all()

        return DamageReport.objects.none()




class DamageReportStatusUpdateView(generics.UpdateAPIView):

    serializer_class = DamageReportStatusSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = ['patch']

    def get_queryset(self):

        user = self.request.user

        if user.role == 'admin':
            return DamageReport.objects.all()

        return DamageReport.objects.none()

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.save()


class DamagePaymentListCreateView(generics.ListCreateAPIView):

    serializer_class = DamagePaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return DamagePayment.objects.filter(
            customer=self.request.user
        ).select_related(
            'damage_report',
            'damage_report__booking',
            'damage_report__booking__equipment'
        )

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        raw_report_id = request.data.get('damage_report')
        try:
            report_id = int(raw_report_id)
        except (TypeError, ValueError):
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            report_id = serializer.validated_data['damage_report'].pk

        damage_report = DamageReport.objects.select_for_update().select_related(
            'booking',
            'booking__customer'
        ).filter(pk=report_id).first()
        if damage_report is None:
            raise serializers.ValidationError(
                {'damage_report': 'Damage report not found.'}
            )

        if damage_report.booking.customer_id != request.user.id:
            raise serializers.ValidationError(
                'You can only pay for your own damage report.'
            )

        existing_payment = DamagePayment.objects.filter(
            damage_report=damage_report
        ).first()
        if existing_payment:
            return Response(
                self.get_serializer(existing_payment).data,
                status=status.HTTP_200_OK
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if damage_report.status != 'resolved':
            raise serializers.ValidationError(
                'Damage report must be resolved before making an additional payment.'
            )

        if damage_report.additional_amount <= 0:
            raise serializers.ValidationError(
                'No additional payment is required for this damage report.'
            )

        payment = serializer.save(
            customer=request.user,
            amount=damage_report.additional_amount
        )
        return Response(
            self.get_serializer(payment).data,
            status=status.HTTP_201_CREATED,
            headers=self.get_success_headers(serializer.data)
        )


class DamagePaymentProcessView(generics.UpdateAPIView):

    serializer_class = DamagePaymentSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = ['patch']

    def get_queryset(self):

        return DamagePayment.objects.filter(
            customer=self.request.user
        )

    @transaction.atomic
    def patch(self, request, *args, **kwargs):
        payment = get_object_or_404(
            DamagePayment.objects.select_for_update().select_related(
                'damage_report',
                'damage_report__booking'
            ).filter(customer=request.user),
            pk=kwargs['pk']
        )

        if payment.payment_status == 'paid':
            return Response(
                {
                    'payment_id': payment.id,
                    'payment_status': 'paid',
                    'transaction_id': payment.transaction_id,
                    'detail': 'This damage payment has already been completed.'
                },
                status=status.HTTP_200_OK
            )

        if payment.amount <= 0:

            return Response(
                {
                    'detail': 'No additional damage payment is required.'
                },
                status=400
            )

        try:
            if payment.transaction_id:
                intent = stripe.PaymentIntent.retrieve(payment.transaction_id)
                if intent.status == 'canceled':
                    return Response(
                        {'detail': 'This payment attempt was canceled. Contact support to retry safely.'},
                        status=status.HTTP_409_CONFLICT
                    )
            else:
                amount_minor = int(
                    (payment.amount * Decimal('100')).quantize(Decimal('1'))
                )
                intent = stripe.PaymentIntent.create(
                    amount=amount_minor,
                    currency='inr',
                    automatic_payment_methods={'enabled': True},
                    metadata={
                        'damage_payment_id': str(payment.id),
                        'damage_report_id': str(payment.damage_report_id),
                        'booking_id': str(payment.damage_report.booking_id)
                    },
                    idempotency_key=f'damage-payment-{payment.id}'
                )
                payment.transaction_id = intent.id
                payment.save(update_fields=['transaction_id'])
        except stripe.error.StripeError:
            return Response(
                {'detail': 'Unable to start the additional payment with Stripe.'},
                status=status.HTTP_502_BAD_GATEWAY
            )

        return Response(
            {
                'payment_id': payment.id,
                'payment_status': payment.payment_status,
                'amount': payment.amount,
                'client_secret': intent.client_secret,
                'transaction_id': intent.id,
                'stripe_status': intent.status
            },
            status=200
        )


class DamagePaymentConfirmView(generics.UpdateAPIView):

    serializer_class = DamagePaymentSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = ['patch']

    def get_queryset(self):

        return DamagePayment.objects.filter(
            customer=self.request.user
        )

    @transaction.atomic
    def patch(self, request, *args, **kwargs):
        payment = get_object_or_404(
            DamagePayment.objects.select_for_update().select_related(
                'damage_report',
                'customer'
            ).filter(customer=request.user),
            pk=kwargs['pk']
        )

        if payment.payment_status == 'paid':
            return Response(
                {
                    'payment_id': payment.id,
                    'damage_report': payment.damage_report_id,
                    'amount': str(payment.amount),
                    'payment_status': 'paid',
                    'transaction_id': payment.transaction_id
                },
                status=status.HTTP_200_OK
            )

        if not payment.transaction_id:

            return Response(
                {
                    'detail': 'Stripe PaymentIntent not found.'
                },
                status=400
            )

        try:

            intent = stripe.PaymentIntent.retrieve(
                payment.transaction_id
            )

        except stripe.error.StripeError:

            return Response(
                {
                    'detail': 'Unable to verify the Stripe payment.'
                },
                status=400
            )

        if intent.status != 'succeeded':

            return Response(
                {
                    'detail': 'Payment has not been completed.',
                    'stripe_status': intent.status
                },
                status=400
            )
        expected_amount_minor = int(
            (payment.amount * Decimal('100')).quantize(Decimal('1'))
        )

        metadata = (
            intent.metadata.to_dict()
            if hasattr(intent.metadata, 'to_dict')
            else dict(intent.metadata or {})
        )

        metadata_payment_id = metadata.get('damage_payment_id')

        stripe_amount = int(getattr(intent, 'amount', 0))
        stripe_currency = str(
            getattr(intent, 'currency', '')
        ).lower()

        amount_matches = (
            stripe_amount == expected_amount_minor
        )

        currency_matches = (
            stripe_currency == 'inr'
        )

        payment_id_matches = (
            str(metadata_payment_id) == str(payment.id)
        )

        print("Payment ID:", payment.id)
        print("Transaction ID:", payment.transaction_id)
        print("Stripe status:", intent.status)
        print("Expected amount:", expected_amount_minor)
        print("Stripe amount:", stripe_amount)
        print("Amount matches:", amount_matches)
        print("Stripe currency:", stripe_currency)
        print("Currency matches:", currency_matches)
        print("Stripe metadata:", metadata)
        print("Metadata payment ID:", metadata_payment_id)
        print("Payment ID matches:", payment_id_matches)

        if not (
            amount_matches and
            currency_matches and
            payment_id_matches
        ):
            return Response(
                {
                    'detail': 'Stripe payment details do not match this damage payment.',
                    'amount_matches': amount_matches,
                    'currency_matches': currency_matches,
                    'payment_id_matches': payment_id_matches
                },
                status=status.HTTP_409_CONFLICT
            )
       

        payment.payment_status = 'paid'

        payment.save(
            update_fields=[
                'payment_status'
            ]
        )

        Notification.objects.get_or_create(
            user=payment.customer,
            title='Additional Damage Payment Completed',
            message=(
                f'Your additional payment of ₹{payment.amount} for damage '
                f'report #{payment.damage_report_id} has been verified and completed.'
            ),
            notification_type='payment'
        )

        return Response(
            {
                'payment_id': payment.id,
                'damage_report': payment.damage_report_id,
                'amount': str(payment.amount),
                'payment_status': payment.payment_status,
                'stripe_status': intent.status,
                'transaction_id': payment.transaction_id
            },
            status=200
        )




class AdminDamageReportRefundView(APIView):
    permission_classes = [IsAdmin]

    @transaction.atomic
    def patch(self, request, pk):
        try:
            report = DamageReport.objects.select_for_update().select_related(
                'booking',
                'booking__customer',
                'booking__equipment'
            ).get(pk=pk)
        except DamageReport.DoesNotExist:
            return Response(
                {'detail': 'Damage report not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if report.refundable_amount <= 0:
            return Response(
                {'detail': 'No deposit refund is due for this damage report.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if DamageReport.objects.filter(
            booking_id=report.booking_id,
            refundable_amount__gt=0
        ).exclude(pk=report.pk).exists():
            return Response(
                {'detail': 'Multiple legacy reports claim a refundable balance for this booking; manual reconciliation is required.'},
                status=status.HTTP_409_CONFLICT
            )

        try:
            payment = Payment.objects.select_for_update().get(
                booking=report.booking
            )
        except Payment.DoesNotExist:
            return Response(
                {'detail': 'The original booking payment was not found.'},
                status=status.HTTP_409_CONFLICT
            )

        if payment.refund_status in ['refunded', 'partially_refunded']:
            if not (payment.refund_transaction_id or '').startswith('re_'):
                return Response(
                    {'detail': 'This legacy refund record has no verifiable Stripe refund ID and requires manual reconciliation.'},
                    status=status.HTTP_409_CONFLICT
                )
            return self._refund_response(payment, report)

        if not (payment.transaction_id or '').startswith('pi_'):
            return Response(
                {'detail': 'The original rental payment has no valid Stripe PaymentIntent; refund requires manual reconciliation.'},
                status=status.HTTP_409_CONFLICT
            )

        if payment.refund_status == 'pending' and payment.refund_transaction_id:
            if not payment.refund_transaction_id.startswith('re_'):
                return Response(
                    {'detail': 'The pending refund reference is not a Stripe refund ID and requires manual reconciliation.'},
                    status=status.HTTP_409_CONFLICT
                )
            try:
                refund = stripe.Refund.retrieve(payment.refund_transaction_id)
            except stripe.error.StripeError:
                return Response(
                    {'detail': 'Unable to verify the refund status with Stripe.'},
                    status=status.HTTP_502_BAD_GATEWAY
                )
            return self._record_refund_result(payment, report, refund)

        try:
            original_intent = stripe.PaymentIntent.retrieve(payment.transaction_id)
        except stripe.error.StripeError:
            return Response(
                {'detail': 'Unable to verify the original rental payment with Stripe.'},
                status=status.HTTP_502_BAD_GATEWAY
            )

        if (
            original_intent.status != 'succeeded' or
            getattr(original_intent, 'currency', '').lower() != 'inr'
        ):
            return Response(
                {'detail': 'The original rental payment is not confirmed as refundable by Stripe.'},
                status=status.HTTP_409_CONFLICT
            )

        refundable_remaining = max(
            report.refundable_amount - payment.deposit_refunded,
            Decimal('0.00')
        )
        available_deposit = max(
            payment.deposit_amount - payment.deposit_deducted - payment.deposit_refunded,
            Decimal('0.00')
        )
        refund_amount = min(refundable_remaining, available_deposit)
        if refund_amount <= 0:
            return Response(
                {'detail': 'No refundable deposit balance remains.'},
                status=status.HTTP_409_CONFLICT
            )

        refund_amount_minor = int(
            (refund_amount * Decimal('100')).quantize(Decimal('1'))
        )
        if int(getattr(original_intent, 'amount_received', 0)) < refund_amount_minor:
            return Response(
                {'detail': 'The verified original payment does not contain enough captured funds for this refund.'},
                status=status.HTTP_409_CONFLICT
            )

        attempt = payment.refund_attempt + 1
        try:
            refund = stripe.Refund.create(
                payment_intent=payment.transaction_id,
                amount=refund_amount_minor,
                metadata={
                    'damage_report_id': str(report.id),
                    'booking_id': str(report.booking_id),
                    'customer_id': str(report.booking.customer_id)
                },
                idempotency_key=(
                    f'damage-report-refund-{payment.id}-attempt-{attempt}'
                )
            )
        except stripe.error.StripeError:
            return Response(
                {'detail': 'Unable to start the deposit refund with Stripe. No refund is marked completed.'},
                status=status.HTTP_502_BAD_GATEWAY
            )

        payment.refund_attempt = attempt
        payment.refund_transaction_id = refund.id
        payment.refund_status = 'pending'
        payment.save(update_fields=[
            'refund_attempt',
            'refund_transaction_id',
            'refund_status'
        ])
        return self._record_refund_result(payment, report, refund)

    def _record_refund_result(self, payment, report, refund):
        refund_status = getattr(refund, 'status', None)
        refunded_amount = Decimal(str(getattr(refund, 'amount', 0))) / Decimal('100')

        if refund_status == 'succeeded':
            if refunded_amount <= 0 or refunded_amount > report.refundable_amount:
                return Response(
                    {'detail': 'Stripe returned an unexpected refund amount; manual reconciliation is required.'},
                    status=status.HTTP_409_CONFLICT
                )

            if payment.refund_status not in ['refunded', 'partially_refunded']:
                payment.deposit_refunded += refunded_amount
                payment.refund_status = (
                    'refunded'
                    if payment.deposit_deducted == 0 and
                    payment.deposit_refunded >= payment.deposit_amount
                    else 'partially_refunded'
                )
                payment.save(update_fields=[
                    'deposit_refunded',
                    'refund_status',
                    'refund_transaction_id'
                ])

            self._notify_refund_status(payment, report, 'completed', refunded_amount)
            return self._refund_response(payment, report)

        if refund_status in ['failed', 'canceled']:
            payment.refund_status = 'failed'
            payment.save(update_fields=['refund_status'])
            self._notify_refund_status(payment, report, 'failed', refunded_amount)
            return Response(
                {
                    'report_id': report.id,
                    'refund_status': payment.refund_status,
                    'refunded_amount': str(payment.deposit_refunded),
                    'refund_transaction_id': payment.refund_transaction_id,
                    'refund_provider_reference_valid': True,
                    'detail': 'Stripe did not complete the refund. It remains unpaid.'
                },
                status=status.HTTP_200_OK
            )

        payment.refund_status = 'pending'
        payment.save(update_fields=['refund_status'])
        self._notify_refund_status(payment, report, 'pending', refunded_amount)
        return self._refund_response(payment, report)

    def _notify_refund_status(self, payment, report, state, amount):
        titles = {
            'pending': 'Deposit Refund Pending',
            'completed': 'Deposit Refund Completed',
            'failed': 'Deposit Refund Failed'
        }
        messages = {
            'pending': (
                f'A deposit refund of ₹{amount} for damage report #{report.id} '
                'has been submitted to Stripe and is pending confirmation.'
            ),
            'completed': (
                f'Stripe confirmed a deposit refund of ₹{amount} for '
                f'damage report #{report.id}.'
            ),
            'failed': (
                f'Stripe did not complete the deposit refund for damage '
                f'report #{report.id}. No refund is recorded as completed.'
            )
        }
        Notification.objects.get_or_create(
            user=payment.customer,
            title=titles[state],
            message=messages[state],
            notification_type='payment'
        )

    def _refund_response(self, payment, report):
        return Response(
            {
                'report_id': report.id,
                'refund_status': payment.refund_status,
                'refunded_amount': str(payment.deposit_refunded),
                'refundable_amount': str(report.refundable_amount),
                'refund_transaction_id': payment.refund_transaction_id,
                'refund_provider_reference_valid': bool(
                    (payment.refund_transaction_id or '').startswith('re_')
                )
            },
            status=status.HTTP_200_OK
        )


class AdminDamageReportListView(generics.ListAPIView):

    serializer_class = DamageReportSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):

        return DamageReport.objects.select_related(
            'booking',
            'booking__equipment',
            'booking__customer',
            'booking__equipment__vendor'
        ).order_by('created_at')



class AdminDamageReportDetailView(generics.RetrieveAPIView):

    serializer_class = DamageReportSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):

        return DamageReport.objects.select_related(
            'booking',
            'booking__equipment',
            'booking__customer',
            'booking__equipment__vendor'
        )


class AdminDamagePaymentListView(generics.ListAPIView):

    queryset = DamagePayment.objects.all().select_related(
        'damage_report',
        'customer'
    )

    serializer_class = DamagePaymentSerializer

    permission_classes = [IsAdmin]


class AdminDamagePaymentDetailView(generics.RetrieveAPIView):

    queryset = DamagePayment.objects.all().select_related(
        'damage_report',
        'customer'
    )

    serializer_class = DamagePaymentSerializer

    permission_classes = [IsAdmin]

class DamageIssueListCreateView(generics.ListCreateAPIView):
    serializer_class = DamageIssueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.role == 'customer':
            return DamageIssue.objects.filter(
                customer=user
            ).select_related(
                'damage_report',
                'damage_report__booking',
                'damage_report__booking__equipment',
                'damage_report__booking__equipment__vendor',
            ).order_by('-created_at')

        if user.role == 'vendor':
            return DamageIssue.objects.filter(
                damage_report__booking__equipment__vendor=user
            ).select_related(
                'customer',
                'damage_report',
                'damage_report__booking',
                'damage_report__booking__equipment',
            ).order_by('-created_at')

        if user.role == 'admin':
            return DamageIssue.objects.all().select_related(
                'customer',
                'damage_report',
                'damage_report__booking',
                'damage_report__booking__equipment',
            ).order_by('-created_at')

        return DamageIssue.objects.none()

    def perform_create(self, serializer):
        user = self.request.user

        if user.role != 'customer':
            raise serializers.ValidationError(
                'Only customers can submit issues.'
            )

        damage_report = serializer.validated_data['damage_report']

        # Make sure this damage report belongs to the customer
        if damage_report.booking.customer != user:
            raise serializers.ValidationError(
                'You can only report an issue for your own damage report.'
            )

        # Prevent multiple active issues for the same damage report
        existing_issue = DamageIssue.objects.filter(
            damage_report=damage_report
        
        ).exists()

        if existing_issue:
            raise serializers.ValidationError(
                'An active issue already exists for this damage report.'
            )

        issue = serializer.save(customer=user)

        # Get vendor
        vendor = damage_report.booking.equipment.vendor
        equipment = damage_report.booking.equipment

        customer_name = (
            f'{user.first_name} {user.last_name}'
        ).strip() or user.username

        # Notify vendor
        Notification.objects.create(
            user=vendor,
            title='New Customer Issue',
            message=(
                f'{customer_name} has reported an issue regarding '
                f'the damage report for {equipment.name}. '
                f'Please review the issue.'
            ),
            notification_type='damage'
        )

class DamageIssueStatusUpdateView(generics.UpdateAPIView):
    serializer_class = DamageIssueSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['patch']

    def get_queryset(self):
        user = self.request.user

        if user.role == 'vendor':
            return DamageIssue.objects.filter(
                damage_report__booking__equipment__vendor=user
            )

        if user.role == 'admin':
            return DamageIssue.objects.all()

        return DamageIssue.objects.none()

    @transaction.atomic
    def perform_update(self, serializer):
        issue = self.get_object()
        old_status = issue.status

        new_status = self.request.data.get('status')
        resolution_note = self.request.data.get('resolution_note')

        allowed_statuses = [
            'pending',
            'reviewed',
            'resolved',
            'rejected'
        ]

        if new_status not in allowed_statuses:
            raise serializers.ValidationError(
                'Invalid issue status.'
            )

        issue.status = new_status

        if resolution_note is not None:
            issue.resolution_note = resolution_note

        issue.save()

        # Notify customer only when status actually changes
        if old_status != new_status:

            customer = issue.customer
            equipment = issue.damage_report.booking.equipment

            status_text = dict(
                DamageIssue.STATUS_CHOICES
            ).get(new_status, new_status)

            message = (
                f'Your issue regarding {equipment.name} '
                f'has been updated to "{status_text}".'
            )

            if new_status in ['resolved', 'rejected'] and issue.resolution_note:
                message += (
                    f' Resolution: {issue.resolution_note}'
                )

            Notification.objects.create(
                user=customer,
                title='Issue Status Updated',
                message=message,
                notification_type='damage'
            )



class MaintenanceReportListCreateView(generics.ListCreateAPIView):

    serializer_class = MaintenanceReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        user = self.request.user

        if user.role == 'maintenance_staff':
            return MaintenanceReport.objects.filter(
                maintenance_staff=user
            ).select_related(
                'booking',
                'booking__equipment',
                'booking__customer'
            ).order_by('-created_at')

        if user.role == 'admin':
            return MaintenanceReport.objects.all().select_related(
                'booking',
                'booking__equipment',
                'booking__customer',
                'maintenance_staff'
            ).order_by('-created_at')

        return MaintenanceReport.objects.none()

    def perform_create(self, serializer):

        user = self.request.user

        if user.role != 'maintenance_staff':
            raise serializers.ValidationError(
                "Only Maintenance Staff can create maintenance reports."
            )

        booking = serializer.validated_data['booking']

        if booking.equipment_workflow_status != 'damaged':
            raise serializers.ValidationError(
                "Maintenance report can only be created for damaged equipment."
            )

        if MaintenanceReport.objects.filter(
            booking=booking
        ).exists():

            raise serializers.ValidationError(
                "A maintenance report already exists for this booking."
            )

        report = serializer.save(
            maintenance_staff=user
        )

        Notification.objects.create(
            user=booking.customer,
            title='Maintenance Report Created',
            message=(
                f'Maintenance inspection has been completed for '
                f'{booking.equipment.name}.'
            ),
            notification_type='damage'
        )

    


class MaintenanceReportStatusUpdateView(generics.UpdateAPIView):

    serializer_class = MaintenanceReportSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['patch']

    def get_queryset(self):

        user = self.request.user

        if user.role == 'maintenance_staff':
            return MaintenanceReport.objects.filter(
                maintenance_staff=user
            )

        if user.role == 'admin':
            return MaintenanceReport.objects.all()

        return MaintenanceReport.objects.none()

    @transaction.atomic
    def perform_update(self, serializer):
        report = MaintenanceReport.objects.select_for_update().select_related(
            'booking',
            'booking__equipment',
            'booking__customer',
            'booking__equipment__vendor'
        ).get(pk=serializer.instance.pk)
        new_status = self.request.data.get('status')

        allowed_statuses = [
            'pending',
            'in_progress',
            'completed'
        ]

        if new_status not in allowed_statuses:
            raise serializers.ValidationError(
                "Invalid maintenance report status."
            )

        if report.status == 'completed' and new_status != 'completed':
            raise serializers.ValidationError(
                "A completed maintenance report cannot be changed."
            )

        if new_status == 'completed':
            if report.booking.equipment_workflow_status != 'damaged':
                raise serializers.ValidationError(
                    "Maintenance can only be completed for confirmed damaged equipment."
                )

            self._ensure_completion_notifications(report)

        if report.status != new_status:
            report.status = new_status

            report.save(
                update_fields=[
                    'status',
                    'updated_at'
                ]
            )

        serializer.instance = report

    def _ensure_completion_notifications(self, report):
        booking = report.booking
        equipment = booking.equipment
        customer = booking.customer
        customer_name = (
            f'{customer.first_name} {customer.last_name}'
        ).strip() or customer.username
        details = report.description.strip() or 'Maintenance work completed.'
        title = 'Maintenance Completed'
        message = (
            f'Maintenance report #{report.id} for booking #{booking.id} '
            f'has been completed. Equipment: {equipment.name}. '
            f'Customer: {customer_name}. Details: {details} '
            f'Repair cost: ₹{report.repair_cost}.'
        )

        for admin in User.objects.filter(role='admin'):
            Notification.objects.get_or_create(
                user=admin,
                title=title,
                message=message,
                notification_type='damage'
            )

        vendor_message = (
            f'Maintenance work for {equipment.name} has been completed. '
            f'Repair cost: ₹{report.repair_cost}.'
        )
        Notification.objects.get_or_create(
            user=equipment.vendor,
            title=title,
            message=vendor_message,
            notification_type='damage'
        )



class MaintenanceDamagedBookingListView(generics.ListAPIView):

    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        user = self.request.user

        if user.role != 'maintenance_staff':
            return Booking.objects.none()

        return Booking.objects.filter(
            status='approved',
            equipment_workflow_status='damaged'
        ).select_related(
            'customer',
            'equipment',
            'equipment__vendor'
        ).order_by('-updated_at')