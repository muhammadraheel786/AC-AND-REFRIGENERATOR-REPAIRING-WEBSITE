from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'services', views.ServiceViewSet, basename='service')
router.register(r'bookings', views.BookingViewSet, basename='booking')

urlpatterns = [
    path('bookings/guest/', views.GuestBookingCreateView.as_view(), name='guest-booking'),
    path('', include(router.urls)),
]
