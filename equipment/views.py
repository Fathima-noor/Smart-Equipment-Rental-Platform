from rest_framework import generics
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import Equipment
from .serializers import (
    EquipmentSerializer,
    AdminEquipmentSerializer
)

from .permissions import IsVendorOrReadOnly
from accounts.permissions import IsAdmin


class EquipmentListCreateView(generics.ListCreateAPIView):

    serializer_class = EquipmentSerializer
    permission_classes = [IsVendorOrReadOnly]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter
    ]

    filterset_fields = [
        'category',
        'is_available'
    ]

    search_fields = [
        'name',
        'description',
        'category'
    ]

    def get_queryset(self):

        user = self.request.user

        # Vendor sees only their own equipment
        if user.role == 'vendor':
            return Equipment.objects.filter(
                vendor=user
            )

        # Customer and admin can see all equipment
        return Equipment.objects.all()

    def perform_create(self, serializer):

        serializer.save(
            vendor=self.request.user
        )


class EquipmentDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    queryset = Equipment.objects.all()
    serializer_class = EquipmentSerializer
    permission_classes = [IsVendorOrReadOnly]


# =========================
# ADMIN EQUIPMENT
# =========================

class AdminEquipmentListCreateView(
    generics.ListCreateAPIView
):

    queryset = Equipment.objects.all()
    serializer_class = AdminEquipmentSerializer
    permission_classes = [IsAdmin]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter
    ]

    filterset_fields = [
        'category',
        'is_available',
        'vendor'
    ]

    search_fields = [
        'name',
        'description',
        'category',
        'vendor__username',
        'vendor__first_name',
        'vendor__last_name',
        'vendor__email'
    ]


class AdminEquipmentDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    queryset = Equipment.objects.all()
    serializer_class = AdminEquipmentSerializer
    permission_classes = [IsAdmin]