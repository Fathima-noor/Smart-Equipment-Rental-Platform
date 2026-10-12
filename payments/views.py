from rest_framework import generics, serializers
from rest_framework.permissions import IsAuthenticated

from .models import Payment
from .serializers import PaymentSerializer, PaymentProcessSerializer
from rest_framework.response import Response
from accounts.permissions import IsAdmin
from notifications.models import Notification
import stripe
from django.conf import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

from decimal import Decimal
from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from damage_reports.models import DamageReport

class PaymentListCreateView(generics.ListCreateAPIView):

    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return Payment.objects.filter(
            customer=self.request.user
        ).order_by('-id')

    def create(self, request, *args, **kwargs):

        booking_id = request.data.get('booking')

        if not booking_id:
            return Response(
                {'detail': 'Booking ID is required.'},
                status=400
            )

        existing_payment = Payment.objects.filter(
            booking_id=booking_id,
            customer=request.user
        ).first()

        if existing_payment:

            serializer = self.get_serializer(
                existing_payment
            )

            return Response(
                serializer.data,
                status=200
            )

        return super().create(
            request,
            *args,
            **kwargs
        )

    def perform_create(self, serializer):

        booking = serializer.validated_data['booking']

        if booking.customer != self.request.user:

            raise serializers.ValidationError(
                'You can only make payments for your own bookings.'
            )

        rental_amount = booking.total_amount
        deposit_amount = booking.deposit
        total_amount = rental_amount + deposit_amount

        serializer.save(
            customer=self.request.user,
            rental_amount=rental_amount,
            deposit_amount=deposit_amount,
            total_amount=total_amount
        )


class PaymentProcessView(generics.UpdateAPIView):

    serializer_class = PaymentProcessSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = ['patch']

    def get_queryset(self):

        return Payment.objects.filter(
            customer=self.request.user
        )

    def perform_update(self, serializer):

        payment = serializer.instance

        # ----------------------------------------
        # CHECK IF ALREADY PAID
        # ----------------------------------------

        if payment.payment_status == 'paid':

            raise serializers.ValidationError(
                'This payment has already been completed.'
            )

        # ----------------------------------------
        # CREATE STRIPE PAYMENT INTENT
        # ----------------------------------------

        intent = stripe.PaymentIntent.create(
            amount=int(
                payment.total_amount * 100
            ),
            currency='inr',
            automatic_payment_methods={
                'enabled': True
            }
        )

        # ----------------------------------------
        # SAVE STRIPE PAYMENT INTENT ID
        # ----------------------------------------

        payment.transaction_id = intent.id

        payment.save(
            update_fields=[
                'transaction_id'
            ]
        )

        # ----------------------------------------
        # RETURN CLIENT SECRET
        # ----------------------------------------

        self.client_secret = intent.client_secret
        self.payment = payment


    def patch(self, request, *args, **kwargs):

        payment = self.get_object()

        if payment.payment_status == 'paid':

            return Response(
                {'detail': 'This payment has already been completed.'},
                status=400
            )

        self.perform_update(
            self.get_serializer(
                payment,
                data=request.data,
                partial=True
            )
        )

        return Response(
            {
                'payment_id': payment.id,
                'client_secret': self.client_secret,
                'transaction_id': payment.transaction_id
            },
            status=200
        )


class PaymentConfirmView(generics.UpdateAPIView):

    serializer_class = PaymentProcessSerializer
    permission_classes = [IsAuthenticated]

    http_method_names = ['patch']

    def get_queryset(self):

        return Payment.objects.filter(
            customer=self.request.user
        )

    def patch(self, request, *args, **kwargs):

        payment = self.get_object()

        if payment.payment_status == 'paid':

            return Response(
                {
                    'detail': 'This payment has already been completed.'
                },
                status=400
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

        payment.payment_status = 'paid'

        payment.save(
            update_fields=[
                'payment_status'
            ]
        )

        booking = payment.booking

        booking.payment_status = 'paid'

        booking.save(
            update_fields=[
                'payment_status'
            ]
        )

        return Response(
            {
                'payment_id': payment.id,
                'booking_id': booking.id,
                'payment_status': payment.payment_status,
                'stripe_status': intent.status
            },
            status=200
        )




class VendorPaymentListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(
            vendor=self.request.user
        ).select_related(
            'booking',
            'booking__equipment',
            'customer'
        ).order_by('-payment_date')

class AdminPaymentListView(generics.ListAPIView):

    serializer_class = PaymentSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):

        return Payment.objects.select_related(
            'customer',
            'booking',
            'booking__equipment',
            'booking__equipment__vendor'
        ).order_by('payment_date')


class AdminPaymentDetailView(generics.RetrieveAPIView):

    serializer_class = PaymentSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):

        return Payment.objects.select_related(
            'customer',
            'booking',
            'booking__equipment',
            'booking__equipment__vendor'
        )

    




class AdminDepositRefundView(APIView):

    permission_classes = [IsAdmin]

    def post(self, request, pk):

        try:
            payment = Payment.objects.select_related(
                'booking',
                'customer'
            ).get(pk=pk)

        except Payment.DoesNotExist:
            return Response(
                {'detail': 'Payment not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        booking = payment.booking

        # Check booking completion
        if booking.status != 'completed':
            return Response(
                {'detail': 'Deposit can be refunded only after booking is completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check payment
        if payment.payment_status != 'paid':
            return Response(
                {'detail': 'The booking payment is not completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Prevent duplicate refunds
        if payment.refund_status in ['refunded', 'partially_refunded']:
            return Response(
                {'detail': 'Deposit refund has already been processed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not payment.transaction_id:
            return Response(
                {'detail': 'Stripe transaction ID not found.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find damage report, if available
        damage_report = DamageReport.objects.filter(
            booking=booking
        ).first()

        deposit = payment.deposit_amount
        damage_amount = (
            damage_report.damage_amount
            if damage_report else Decimal('0.00')
        )

        # Calculate deposit deduction and refund
        deposit_deducted = min(deposit, damage_amount)
        refundable_amount = max(
            deposit - deposit_deducted,
            Decimal('0.00')
        )
        additional_amount = max(
            damage_amount - deposit,
            Decimal('0.00')
        )

        if refundable_amount <= 0:
            return Response(
                {
                    'detail': 'No deposit balance is available for refund.',
                    'deposit_amount': str(deposit),
                    'damage_amount': str(damage_amount),
                    'additional_amount': str(additional_amount)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create refund through Stripe
        try:
            refund = stripe.Refund.create(
                payment_intent=payment.transaction_id,
                amount=int(refundable_amount * 100),
                idempotency_key=f'deposit-refund-payment-{payment.id}'
            )

        except stripe.error.StripeError as e:
            payment.refund_status = 'failed'
            payment.refund_attempt += 1
            payment.save(
                update_fields=[
                    'refund_status',
                    'refund_attempt'
                ]
            )

            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save refund details after Stripe accepts the refund
        with transaction.atomic():

            payment.deposit_deducted = deposit_deducted
            payment.deposit_refunded = refundable_amount
            payment.additional_damage_payment = additional_amount
            payment.refund_status = (
                'refunded'
                if refundable_amount == deposit
                else 'partially_refunded'
            )
            payment.refund_transaction_id = refund.id
            payment.refund_attempt += 1

            payment.save(
                update_fields=[
                    'deposit_deducted',
                    'deposit_refunded',
                    'additional_damage_payment',
                    'refund_status',
                    'refund_transaction_id',
                    'refund_attempt'
                ]
            )

            # Update damage report calculations, if one exists
            if damage_report:
                damage_report.deposit_deducted = deposit_deducted
                damage_report.refundable_amount = refundable_amount
                damage_report.additional_amount = additional_amount
                damage_report.save(
                    update_fields=[
                        'deposit_deducted',
                        'refundable_amount',
                        'additional_amount'
                    ]
                )

            # Notify customer
            Notification.objects.create(
                user=payment.customer,
                title='Security Deposit Refunded',
                message=(
                    f'Your security deposit refund of '
                    f'₹{refundable_amount} for Booking '
                    f'#{booking.id} has been processed.'
                ),
                notification_type='payment'
            )

        return Response(
            {
                'detail': 'Security deposit refund processed successfully.',
                'payment_id': payment.id,
                'booking_id': booking.id,
                'deposit_amount': str(deposit),
                'deposit_deducted': str(deposit_deducted),
                'deposit_refunded': str(refundable_amount),
                'additional_damage_payment': str(additional_amount),
                'refund_status': payment.refund_status,
                'refund_transaction_id': refund.id
            },
            status=status.HTTP_200_OK
        )