
from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import User, VendorRequest, NotificationPreferences
from .serializers import RegisterSerializer,UserProfileSerializer, ProfileUpdateSerializer,AdminUserSerializer,NotificationPreferencesSerializer,VendorRequestSerializer

from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from .permissions import IsAdmin


class RegisterView(generics.CreateAPIView):

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]



class ProfileView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        serializer = UserProfileSerializer(
            request.user
        )

        return Response(serializer.data)

    def put(self, request):

        serializer = ProfileUpdateSerializer(
            request.user,
            data=request.data
        )

        if serializer.is_valid():

            serializer.save()

            return Response({
                'message': 'Profile updated successfully.',
                'user': serializer.data
            })

        return Response(
            serializer.errors,
            status=400
        )

    def patch(self, request):

        serializer = ProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            return Response({
                'message': 'Profile updated successfully.',
                'user': serializer.data
            })

        return Response(
            serializer.errors,
            status=400
        )



class ChangePasswordView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        user = request.user

        current_password = request.data.get(
            'current_password'
        )

        new_password = request.data.get(
            'new_password'
        )

        confirm_password = request.data.get(
            'confirm_password'
        )

        if not current_password:
            return Response({
                'error': 'Current password is required.'
            }, status=400)

        if not new_password:
            return Response({
                'error': 'New password is required.'
            }, status=400)

        if not confirm_password:
            return Response({
                'error': 'Confirm password is required.'
            }, status=400)

        if not user.check_password(current_password):
            return Response({
                'error': 'Current password is incorrect.'
            }, status=400)

        if new_password != confirm_password:
            return Response({
                'error': 'New passwords do not match.'
            }, status=400)

        if len(new_password) < 8:
            return Response({
                'error': 'Password must contain at least 8 characters.'
            }, status=400)

        if current_password == new_password:
            return Response({
                'error': 'New password must be different from current password.'
            }, status=400)

        user.set_password(new_password)
        user.save()

        return Response({
            'message': 'Password changed successfully.'
        })
class AdminUserListCreateView(generics.ListCreateAPIView):

    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]



class AdminUserListView(generics.ListCreateAPIView):

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [IsAdmin]



class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):

    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]


class NotificationPreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        preferences, created = (
            NotificationPreferences.objects.get_or_create(
                user=request.user
            )
        )

        serializer = NotificationPreferencesSerializer(preferences)

        return Response(serializer.data)

    def patch(self, request):
        preferences, created = (
            NotificationPreferences.objects.get_or_create(
                user=request.user
            )
        )

        serializer = NotificationPreferencesSerializer(
            preferences,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()

            return Response({
                'message': 'Notification preferences updated successfully.',
                'preferences': serializer.data
            })

        return Response(
            serializer.errors,
            status=400
        )

    

class VendorRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        # Only customers can submit vendor requests
        if request.user.role != 'customer':
            return Response({
                'error': 'Only customers can submit vendor requests.'
            }, status=403)

        # Check whether the user already has a pending request
        existing_request = VendorRequest.objects.filter(
            user=request.user,
            status='pending'
        ).first()

        if existing_request:
            return Response({
                'error': 'You already have a pending vendor request.'
            }, status=400)

        serializer = VendorRequestSerializer(
            data=request.data
        )

        if serializer.is_valid():

            serializer.save(user=request.user)

            return Response({
                'message': 'Vendor request submitted successfully.',
                'request': serializer.data
            }, status=201)

        return Response(
            serializer.errors,
            status=400
        )

    def get(self, request):

        # Get vendor requests submitted by the logged-in user
        vendor_requests = VendorRequest.objects.filter(
            user=request.user
        ).order_by('-created_at')

        serializer = VendorRequestSerializer(
            vendor_requests,
            many=True
        )

        return Response(serializer.data)


class AdminVendorRequestListView(generics.ListAPIView):

    queryset = VendorRequest.objects.all().order_by('-created_at')
    serializer_class = VendorRequestSerializer
    permission_classes = [IsAdmin]


class AdminVendorRequestActionView(APIView):

    permission_classes = [IsAdmin]

    def patch(self, request, pk):

        print("REQUEST DATA:", request.data)
        print("ACTION VALUE:", request.data.get('action'))

        action = request.data.get('action')

        if action not in ['approve', 'reject']:
            return Response({
                'error': 'Action must be approve or reject.'
            }, status=400)

        try:
            vendor_request = VendorRequest.objects.get(pk=pk)

        except VendorRequest.DoesNotExist:
            return Response({
                'error': 'Vendor request not found.'
            }, status=404)

        if vendor_request.status != 'pending':
            return Response({
                'error': 'This vendor request has already been processed.'
            }, status=400)

        if action == 'approve':

            vendor_request.status = 'approved'
            vendor_request.save()

            user = vendor_request.user
            user.role = 'vendor'
            user.save()

            return Response({
                'message': 'Vendor request approved successfully.',
                'status': vendor_request.status,
                'user_role': user.role
            }, status=200)

        if action == 'reject':

            vendor_request.status = 'rejected'
            vendor_request.save()

            return Response({
                'message': 'Vendor request rejected successfully.',
                'status': vendor_request.status
            }, status=200)