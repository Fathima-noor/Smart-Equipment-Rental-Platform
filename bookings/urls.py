from django.urls import path

from .views import (
    BookingListCreateView,
    BookingDetailView,
    BookingStatusUpdateView,
    BookingReturnView,AdminBookingListView,AdminBookingDetailView,
    AdminBookingStatusUpdateView,
    EquipmentReceiveView,
    EquipmentHandoverView,
    EquipmentInspectionView,
    EquipmentReturnToVendorView,
    EquipmentCompleteDamagedView,EquipmentAvailabilityView
)

urlpatterns = [

    path(
        'admin/',
        AdminBookingListView.as_view(),
        name='admin-booking-list'
    ),

    path(
        'admin/<int:pk>/',
        AdminBookingDetailView.as_view(),
        name='admin-booking-detail'
    ),

    path(
        'admin/<int:pk>/status/',
        AdminBookingStatusUpdateView.as_view(),
        name='admin-booking-status'
    ),

    path(
        '',
        BookingListCreateView.as_view()
    ),
    path(
    '<int:pk>/receive/',
    EquipmentReceiveView.as_view()
    ),
    path(
    '<int:pk>/handover/',
    EquipmentHandoverView.as_view()
    ),
    path(
    '<int:pk>/inspect/',
    EquipmentInspectionView.as_view()
    ),
    path(
    '<int:pk>/return-to-vendor/',
    EquipmentReturnToVendorView.as_view()
    ),
        path(
        '<int:pk>/complete-damaged/',
        EquipmentCompleteDamagedView.as_view()
    ),
    

    path(
        '<int:pk>/',
        BookingDetailView.as_view()
    ),

    path(
    'availability/<int:equipment_id>/',
    EquipmentAvailabilityView.as_view(),
    name='equipment-availability'
    ),


    path(
        '<int:pk>/status/',
        BookingStatusUpdateView.as_view()
    ),

    path(
        '<int:pk>/return/',
        BookingReturnView.as_view()
    ),
]