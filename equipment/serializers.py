from rest_framework import serializers
from .models import Equipment
from accounts.models import User

class EquipmentSerializer(serializers.ModelSerializer):

    class Meta:
        model = Equipment

        fields = [
            'id',
            'name',
            'category',
            'description',
            'price_per_day',
            'quantity',
            'image',
            'is_available',
            'vendor',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'vendor',
            'created_at',
            'updated_at',
        ]

    def validate_price_per_day(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Price per day must be greater than zero."
            )

        return value

    def validate_quantity(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than zero."
            )

        return value   




class AdminEquipmentSerializer(serializers.ModelSerializer):

    class Meta:
        model = Equipment

        fields = [
            'id',
            'name',
            'category',
            'description',
            'price_per_day',
            'quantity',
            'image',
            'is_available',
            'vendor',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
        ]

    def validate_price_per_day(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Price per day must be greater than zero."
            )

        return value

    def validate_quantity(self, value):

        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than zero."
            )

        return value

    def validate_vendor(self, value):

        if value.role != 'vendor':
            raise serializers.ValidationError(
                "Selected user must be a vendor."
            )

        return value