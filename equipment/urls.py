from django.urls import path

from .views import (
    EquipmentListCreateView,
    EquipmentDetailView,
    AdminEquipmentListCreateView,
    AdminEquipmentDetailView
)

urlpatterns = [

    path('admin/', AdminEquipmentListCreateView.as_view()),

    path(
        'admin/<int:pk>/',
        AdminEquipmentDetailView.as_view()
    ),

    path('', EquipmentListCreateView.as_view()),

    path(
        '<int:pk>/',
        EquipmentDetailView.as_view()
    ),
]