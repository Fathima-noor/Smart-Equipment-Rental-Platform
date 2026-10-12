from django.db import models
from accounts.models import User


# Create your models here.



class Equipment(models.Model):

    CATEGORY_CHOICES = (
        ('camera', 'Camera'),
        ('laptop', 'Laptop'),
        ('projector', 'Projector'),
        ('drone', 'Drone'),
        ('other', 'Other'),
    )

    name = models.CharField(max_length=200)

    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES
    )

    description = models.TextField()

    price_per_day = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    quantity = models.PositiveIntegerField(default=1)

    image = models.ImageField(
        upload_to='equipment/',
        blank=True,
        null=True
    )

    is_available = models.BooleanField(default=True)

    vendor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='equipment'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name