from django.urls import path

from .views import (
    RegisterView,
    ProfileView,
    ChangePasswordView,
    AdminUserListCreateView,
    AdminUserDetailView,
    ChangePasswordView,
    NotificationPreferencesView,
    VendorRequestView,
    AdminVendorRequestListView,
    AdminVendorRequestActionView
)

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView
)


urlpatterns = [

    path(
        'register/',
        RegisterView.as_view(),
        name='register'
    ),

    path(
        'login/',
        TokenObtainPairView.as_view(),
        name='login'
    ),

    path(
        'token/refresh/',
        TokenRefreshView.as_view(),
        name='token_refresh'
    ),

    path(
        'profile/',
        ProfileView.as_view(),
        name='profile'
    ),
    path(
    'profile/change-password/',
    ChangePasswordView.as_view(),
    name='change-password'
    ),
    path(
    'profile/notification-preferences/',
    NotificationPreferencesView.as_view(),
    name='notification-preferences'
    ),

    path(
    'vendor-request/',
    VendorRequestView.as_view(),
    name='vendor-request'
    ),

    path(
        'admin/users/',
        AdminUserListCreateView.as_view(),
        name='admin-user-list'
    ),

    path(
        'admin/users/<int:pk>/',
        AdminUserDetailView.as_view(),
        name='admin-user-detail'
    ),
    path(
    'admin/vendor-requests/',
    AdminVendorRequestListView.as_view(),
    name='admin-vendor-requests'
    ),
    path(
    'admin/vendor-requests/<int:pk>/',
    AdminVendorRequestActionView.as_view(),
    name='admin-vendor-request-action'
    ),
]