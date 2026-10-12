from rest_framework import serializers
from .models import User,NotificationPreferences,VendorRequest


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password',
            'first_name',
            'last_name',
        ]

    def create(self, validated_data):

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role='customer'
        )

        return user


class UserProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
        ]


class AdminUserSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        required=False
    )

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'password',
            'first_name',
            'last_name',
            'role',
            'is_active',
        ]

        read_only_fields = [
            'id',
        ]

    def create(self, validated_data):

        password = validated_data.pop('password', None)

        user = User.objects.create_user(
            password=password,
            **validated_data
        )

        return user



class ProfileUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
        ]

        read_only_fields = [
            'id',
            'role',
        ]

    def validate_username(self, value):
        user = self.instance

        if User.objects.filter(
            username=value
        ).exclude(id=user.id).exists():
            raise serializers.ValidationError(
                'This username is already taken.'
            )

        return value

    def validate_email(self, value):
        user = self.instance

        if User.objects.filter(
            email=value
        ).exclude(id=user.id).exists():
            raise serializers.ValidationError(
                'This email is already registered.'
            )

        return value


class NotificationPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreferences
        fields = [
            'id',
            'email_notifications',
            'booking_notifications',
            'damage_notifications',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at'
        ]



class VendorRequestSerializer(serializers.ModelSerializer):

    user_name = serializers.CharField(
        source='user.username',
        read_only=True
    )

    user_email = serializers.EmailField(
        source='user.email',
        read_only=True
    )

    class Meta:

        model = VendorRequest

        fields = [
            'id',
            'user',
            'user_name',
            'user_email',
            'reason',
            'equipment_category',
            'additional_details',
            'status',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'user',
            'user_name',
            'user_email',
            'status',
            'created_at',
            'updated_at',
        ]