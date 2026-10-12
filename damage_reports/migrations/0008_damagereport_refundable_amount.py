from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('damage_reports', '0007_alter_damageissue_status_maintenancereport'),
    ]

    operations = [
        migrations.AddField(
            model_name='damagereport',
            name='refundable_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]