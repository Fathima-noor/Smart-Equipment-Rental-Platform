from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.conf import settings
from bookings.models import Booking


class DamageReport(models.Model):

    STATUS_CHOICES = [
        ('reported', 'Reported'),
        ('reviewed', 'Reviewed'),
        ('resolved', 'Resolved'),
    ]

    booking = models.ForeignKey(
        Booking,
        on_delete=models.CASCADE,
        related_name='damage_reports'
    )

    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='damage_reports'
    )

    description = models.TextField()

    damage_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    deposit_deducted = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    additional_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    refundable_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='reported'
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def clean(self):
        super().clean()

        if self.booking_id and DamageReport.objects.exclude(pk=self.pk).filter(
            booking_id=self.booking_id
        ).exists():
            raise ValidationError({
                'booking': 'A damage report already exists for this booking.'
            })

    def save(self, *args, **kwargs):
        if not self._state.adding:
            return super().save(*args, **kwargs)

        with transaction.atomic():
            Booking.objects.select_for_update().only('pk').get(
                pk=self.booking_id
            )

            if DamageReport.objects.filter(
                booking_id=self.booking_id
            ).exists():
                raise ValidationError({
                    'booking': 'A damage report already exists for this booking.'
                })

            return super().save(*args, **kwargs)

    def __str__(self):
        return f"Damage Report {self.id} - Booking {self.booking.id}"



class DamagePayment(models.Model):

    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    ]

    damage_report = models.OneToOneField(
        DamageReport,
        on_delete=models.CASCADE,
        related_name='damage_payment'
    )

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='damage_payments'
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS,
        default='pending'
    )

    payment_date = models.DateTimeField(
        auto_now_add=True
    )

    transaction_id = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    stripe_payment_intent_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True
    )

    def __str__(self):
        return f"Damage Payment {self.id} - Report {self.damage_report.id}"



class DamageIssue(models.Model):

    ISSUE_TYPES = [
        ('incorrect_damage', 'Incorrect Damage Amount'),
        ('not_caused', 'I Did Not Cause This Damage'),
        ('already_damaged', 'Item Was Already Damaged'),
        ('incorrect_deposit', 'Incorrect Deposit Deduction'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('reviewed', 'Reviewed'),
        ('resolved', 'Resolved'),
        ('rejected', 'Rejected'),
    ]

    damage_report = models.ForeignKey(
        DamageReport,
        on_delete=models.CASCADE,
        related_name='issues'
    )

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='damage_issues'
    )

    issue_type = models.CharField(
        max_length=50,
        choices=ISSUE_TYPES
    )

    description = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    resolution_note = models.TextField(
    blank=True,
    default=''
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Issue #{self.id} - {self.damage_report.booking.equipment.name}"
    




class MaintenanceReport(models.Model):

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    booking = models.OneToOneField(
        Booking,
        on_delete=models.CASCADE,
        related_name='maintenance_report'
    )

    maintenance_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maintenance_reports'
    )

    description = models.TextField()

    repair_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"Maintenance Report {self.id} - Booking {self.booking.id}"