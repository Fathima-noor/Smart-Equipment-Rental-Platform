from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Notification

        fields = [
            'id',
            'title',
            'message',
            'notification_type',
            'is_read',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'title',
            'message',
            'notification_type',
            'created_at',
        ]


class AdminNotificationSerializer(serializers.ModelSerializer):

    recipient_name = serializers.SerializerMethodField()
    recipient_username = serializers.CharField(
        source='user.username',
        read_only=True
    )
    recipient_role = serializers.CharField(
        source='user.role',
        read_only=True
    )

    class Meta:
        model = Notification

        fields = [
            'id',
            'user',
            'recipient_name',
            'recipient_username',
            'recipient_role',
            'title',
            'message',
            'notification_type',
            'is_read',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'user',
            'recipient_name',
            'recipient_username',
            'recipient_role',
            'title',
            'message',
            'notification_type',
            'created_at',
        ]

    def get_recipient_name(self, obj):
        user = obj.user

        full_name = (
            f"{user.first_name} {user.last_name}"
        ).strip()

        return full_name or user.username