from django.db import models
from django.conf import settings
from equipment.models import Equipment


class Booking(models.Model):

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    ]

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings'
    )

    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.CASCADE,
        related_name='bookings'
    )

    start_date = models.DateField()

    end_date = models.DateField()

    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    deposit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='pending'
    )

    # Equipment condition before rental
    equipment_condition_before = models.CharField(
        max_length=20,
        choices=[
            ('good', 'Good'),
            ('damaged', 'Damaged'),
        ],
        default='good'
    )

    # Equipment condition after return
    equipment_condition_after = models.CharField(
        max_length=20,
        choices=[
            ('good', 'Good'),
            ('damaged', 'Damaged'),
        ],
        null=True,
        blank=True
    )
    damage_description = models.TextField(
    null=True,
    blank=True
    )

        # Physical equipment workflow
    EQUIPMENT_WORKFLOW_CHOICES = [
        ('booked', 'Booked'),
        ('received', 'Received'),
        ('handed_over', 'Handed Over'),
        ('returned', 'Returned'),
        ('awaiting_inspection', 'Awaiting Inspection'),
        ('no_damage', 'No Damage'),
        ('damaged', 'Damaged'),
        ('returned_to_vendor', 'Returned to Vendor'),
    ]

    equipment_workflow_status = models.CharField(
        max_length=30,
        choices=EQUIPMENT_WORKFLOW_CHOICES,
        default='booked'
    )

    # Operations Staff who received the equipment from Vendor
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='equipment_received_bookings'
    )

    received_at = models.DateTimeField(
        null=True,
        blank=True
    )

    # Operations Staff who handed the equipment to Customer
    handed_over_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='equipment_handed_over_bookings'
    )

    handed_over_at = models.DateTimeField(
        null=True,
        blank=True
    )

    # Operations Staff who inspected the returned equipment
    inspected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='equipment_inspected_bookings'
    )

    inspected_at = models.DateTimeField(
        null=True,
        blank=True
    )

    # Date and time equipment was returned
    returned_at = models.DateTimeField(
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(
    auto_now_add=True
    )

    updated_at = models.DateTimeField(
    auto_now=True
    )

    def __str__(self):
        return f"{self.customer.username} - {self.equipment.name}"