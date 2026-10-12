from django.contrib.auth.models import AbstractUser
from django.db import models

# Create your models here.


class User(AbstractUser):

    ROLE_CHOICES = (
        ('customer', 'Customer'),
        ('vendor', 'Vendor'),
        ('admin', 'Admin'),
        ('operations_staff', 'Operations Staff'),
        ('maintenance_staff', 'Maintenance Staff'),
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='customer'
    )


class NotificationPreferences(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )

    email_notifications = models.BooleanField(default=True)

    booking_notifications = models.BooleanField(default=True)

    damage_notifications = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} Notification Preferences"



class VendorRequest(models.Model):

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    EQUIPMENT_CATEGORY_CHOICES = (
        ('camera', 'Camera'),
        ('laptop', 'Laptop'),
        ('projector', 'Projector'),
        ('drone', 'Drone'),
        ('other', 'Other'),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='vendor_requests'
    )

    reason = models.TextField()

    equipment_category = models.CharField(
        max_length=20,
        choices=EQUIPMENT_CATEGORY_CHOICES
    )

    additional_details = models.TextField(
        blank=True,
        null=True
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
        return f"{self.user.username} - {self.status}"