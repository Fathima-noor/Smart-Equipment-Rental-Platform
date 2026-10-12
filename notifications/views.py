from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdmin

from .models import Notification
from .serializers import (
    NotificationSerializer,
    AdminNotificationSerializer
)


# =========================================================
# CUSTOMER / VENDOR NOTIFICATIONS
# =========================================================

class NotificationListView(generics.ListAPIView):

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        ).order_by('-created_at')


class NotificationReadView(generics.UpdateAPIView):

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['patch']

    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        )

    def perform_update(self, serializer):
        serializer.save(is_read=True)


class NotificationMarkAllReadView(generics.GenericAPIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):

        Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)

        return Response({
            'message': 'All notifications marked as read.'
        })


# =========================================================
# ADMIN NOTIFICATIONS
# =========================================================

class AdminNotificationListView(generics.ListAPIView):

    serializer_class = AdminNotificationSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):

        return Notification.objects.select_related(
            'user'
        ).order_by(
            'created_at',
            'id'
        )


class AdminNotificationDetailView(generics.RetrieveAPIView):

    serializer_class = AdminNotificationSerializer
    permission_classes = [IsAdmin]

    queryset = Notification.objects.select_related(
        'user'
    )


class AdminNotificationReadView(generics.UpdateAPIView):

    serializer_class = AdminNotificationSerializer
    permission_classes = [IsAdmin]
    http_method_names = ['patch']

    queryset = Notification.objects.select_related(
        'user'
    )

    def perform_update(self, serializer):
        serializer.save(is_read=True)


class AdminNotificationMarkAllReadView(generics.GenericAPIView):

    permission_classes = [IsAdmin]

    def patch(self, request, *args, **kwargs):

        Notification.objects.filter(
            is_read=False
        ).update(
            is_read=True
        )

        return Response({
            'message': 'All notifications marked as read.'
        })