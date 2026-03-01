"""Unified API URLs - single router to avoid DRF converter conflict."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from bookings import views as booking_views
from payments import views as payment_views
from notifications import views as notification_views

router = DefaultRouter()
router.register(r'services', booking_views.ServiceViewSet, basename='service')
router.register(r'bookings', booking_views.BookingViewSet, basename='booking')
router.register(r'payments', payment_views.PaymentViewSet, basename='payment')
router.register(r'notification-logs', notification_views.NotificationLogViewSet, basename='notification-log')

urlpatterns = [
    path('health/', booking_views.health_view),
    path('bookings/guest/', booking_views.GuestBookingCreateView.as_view(), name='guest-booking'),
    path('payments/return/', payment_views.payment_return_view),
    path('', include(router.urls)),
]
