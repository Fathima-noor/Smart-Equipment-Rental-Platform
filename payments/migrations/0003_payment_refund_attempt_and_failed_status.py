from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0002_remove_payment_amount_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='payment',
            name='refund_status',
            field=models.CharField(
                choices=[
                    ('not_applicable', 'Not Applicable'),
                    ('pending', 'Pending'),
                    ('refunded', 'Refunded'),
                    ('partially_refunded', 'Partially Refunded'),
                    ('failed', 'Failed'),
                ],
                default='not_applicable',
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name='payment',
            name='refund_attempt',
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]