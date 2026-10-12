from django.urls import path

from .views import (
    DamageReportListCreateView,
    DamageReportStatusUpdateView,
    DamagePaymentListCreateView,
    DamagePaymentProcessView,
    DamagePaymentConfirmView,
    DamageIssueListCreateView,
    DamageIssueStatusUpdateView,
    AdminDamageReportListView,
    AdminDamageReportDetailView,
    AdminDamagePaymentListView,
    AdminDamagePaymentDetailView,
    DamageReportEditView,
    MaintenanceReportListCreateView,
    MaintenanceReportStatusUpdateView,MaintenanceDamagedBookingListView,
    AdminEligibleDamageBookingListView,
    AdminDamageReportRefundView

)


urlpatterns = [

    path(
        'admin/reports/<int:pk>/refund/',
        AdminDamageReportRefundView.as_view(),
        name='admin-damage-report-refund'
    ),

    path(
        'admin/eligible-bookings/',
        AdminEligibleDamageBookingListView.as_view(),
        name='admin-eligible-damage-bookings'
    ),

    # Admin Damage Reports
    path(
        'admin/reports/',
        AdminDamageReportListView.as_view(),
        name='admin-damage-report-list'
    ),

    path(
        'admin/<int:pk>/',
        AdminDamageReportDetailView.as_view(),
        name='admin-damage-report-detail'
    ),

    # Admin Damage Payments
    path(
        'admin/payments/',
        AdminDamagePaymentListView.as_view(),
        name='admin-damage-payment-list'
    ),

    path(
        'admin/payments/<int:pk>/',
        AdminDamagePaymentDetailView.as_view(),
        name='admin-damage-payment-detail'
    ),

    # Normal Damage Reports
    path(
        '',
        DamageReportListCreateView.as_view()
    ),

    path(
        '<int:pk>/status/',
        DamageReportStatusUpdateView.as_view()
    ),

    # Customer Damage Payments
    path(
        'payments/',
        DamagePaymentListCreateView.as_view()
    ),

    path(
        'payments/<int:pk>/process/',
        DamagePaymentProcessView.as_view()
    ),

    path(
    'payments/<int:pk>/confirm/',
    DamagePaymentConfirmView.as_view(),
    name='damage-payment-confirm'
    ),

    path(
        'issues/',
        DamageIssueListCreateView.as_view(),
        name='damage-issue-list-create'
    ),

    path(
        'issues/<int:pk>/status/',
        DamageIssueStatusUpdateView.as_view(),
        name='damage-issue-status'
    ),
    path(
    '<int:pk>/edit/',
    DamageReportEditView.as_view(),
    name='damage-report-edit'
    ),
    path(
        'maintenance-reports/',
        MaintenanceReportListCreateView.as_view(),
        name='maintenance-report-list-create'
    ),
    path(
        'maintenance-reports/<int:pk>/status/',
        MaintenanceReportStatusUpdateView.as_view(),
        name='maintenance-report-status'
    ),
    path(
        'maintenance/damaged-bookings/',
        MaintenanceDamagedBookingListView.as_view(),
        name='maintenance-damaged-bookings'
    ),
]