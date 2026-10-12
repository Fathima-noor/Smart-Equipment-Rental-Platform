from django.urls import path

from .views import (
    NotificationListView,
    NotificationReadView,
    NotificationMarkAllReadView,

    AdminNotificationListView,
    AdminNotificationDetailView,
    AdminNotificationReadView,
    AdminNotificationMarkAllReadView,
)


urlpatterns = [

    # =====================================================
    # CUSTOMER / VENDOR
    # =====================================================

    path(
        '',
        NotificationListView.as_view(),
        name='notification-list'
    ),

    path(
        'mark-all-read/',
        NotificationMarkAllReadView.as_view(),
        name='notification-mark-all-read'
    ),

    path(
        '<int:pk>/read/',
        NotificationReadView.as_view(),
        name='notification-read'
    ),


    # =====================================================
    # ADMIN
    # =====================================================

    path(
        'admin/',
        AdminNotificationListView.as_view(),
        name='admin-notification-list'
    ),

    path(
        'admin/mark-all-read/',
        AdminNotificationMarkAllReadView.as_view(),
        name='admin-notification-mark-all-read'
    ),

    path(
        'admin/<int:pk>/',
        AdminNotificationDetailView.as_view(),
        name='admin-notification-detail'
    ),

    path(
        'admin/<int:pk>/read/',
        AdminNotificationReadView.as_view(),
        name='admin-notification-read'
    ),
]