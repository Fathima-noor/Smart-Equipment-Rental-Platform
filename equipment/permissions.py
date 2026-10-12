from rest_framework.permissions import BasePermission


class IsVendorOrReadOnly(BasePermission):

    def has_permission(self, request, view):

        if not request.user.is_authenticated:
            return False

        # Anyone logged in can view equipment
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # Only vendors and admins can create/update/delete
        return request.user.role in ['vendor', 'admin']

    def has_object_permission(self, request, view, obj):

        # Anyone logged in can view equipment
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # Admin can manage everything
        if request.user.role == 'admin':
            return True

        # Vendor can manage only their own equipment
        return (
            request.user.role == 'vendor'
            and obj.vendor == request.user
        )