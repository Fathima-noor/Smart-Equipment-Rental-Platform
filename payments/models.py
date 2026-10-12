from django.db import models
from django.conf import settings
from bookings.models import Booking
from django.contrib.auth import get_user_model


class Payment(models.Model):

    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    ]

    REFUND_STATUS = [
        ('not_applicable', 'Not Applicable'),
        ('pending', 'Pending'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
        ('failed', 'Failed'),
    ]

    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name='payment'
    )

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    vendor = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name='vendor_payments',
    null=True,
    blank=True
)

    # Rental charge only
    rental_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    # Security deposit paid upfront
    deposit_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    # rental_amount + deposit_amount
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS,
        default='pending'
    )

    # Amount of deposit used for damage
    deposit_deducted = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    # Remaining deposit returned to customer
    deposit_refunded = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    # Extra amount customer must pay when damage > deposit
    additional_damage_payment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    refund_status = models.CharField(
        max_length=30,
        choices=REFUND_STATUS,
        default='not_applicable'
    )

    payment_date = models.DateTimeField(
        auto_now_add=True
    )

    transaction_id = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    refund_transaction_id = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    refund_attempt = models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        return f"Payment {self.id} - Booking {self.booking.id}"