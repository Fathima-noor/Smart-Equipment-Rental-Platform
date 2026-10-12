from rest_framework.permissions import BasePermission


class IsCustomerOrVendor(BasePermission):

    def has_permission(self, request, view):

        if not request.user.is_authenticated:
            return False

        return request.user.role in ['customer', 'vendor', 'admin']


class IsOperationsStaff(BasePermission):

    def has_permission(self, request, view):

        if not request.user.is_authenticated:
            return False

        return request.user.role == 'operations_staff'