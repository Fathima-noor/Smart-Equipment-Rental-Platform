from django.urls import path

from .views import (
    PaymentListCreateView,
    PaymentProcessView,
    PaymentConfirmView,
    VendorPaymentListView,
    AdminPaymentListView,
    AdminPaymentDetailView,
    AdminDepositRefundView
)


urlpatterns = [

    path(
        'admin/',
        AdminPaymentListView.as_view(),
        name='admin-payment-list'
    ),

    path(
        'admin/<int:pk>/',
        AdminPaymentDetailView.as_view(),
        name='admin-payment-detail'
    ),

    path(
        '',
        PaymentListCreateView.as_view(),
        name='payment-list-create'
    ),

    path(
        '<int:pk>/process/',
        PaymentProcessView.as_view(),
        name='payment-process'
    ),
    path(
        '<int:pk>/confirm/',
        PaymentConfirmView.as_view(),
        name='payment-confirm'
    ),
    path(
        'vendor/',
        VendorPaymentListView.as_view(),
        name='vendor-payments'
    ),
    path(
    'admin/<int:pk>/refund-deposit/',
    AdminDepositRefundView.as_view(),
    name='admin-deposit-refund'
),
]