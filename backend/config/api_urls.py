"""Unified API URLs - single router to avoid DRF converter conflict."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from bookings import views as booking_views
from payments import views as payment_views
from notifications import views as notification_views
from bookings import admin_views

router = DefaultRouter()
router.register(r'services', booking_views.ServiceViewSet, basename='service')
router.register(r'bookings', booking_views.BookingViewSet, basename='booking')
router.register(r'payments', payment_views.PaymentViewSet, basename='payment')
router.register(r'notification-logs', notification_views.NotificationLogViewSet, basename='notification-log')

urlpatterns = [
    path('health/', booking_views.health_view),
    path('bookings/guest/', booking_views.GuestBookingCreateView.as_view(), name='guest-booking'),
    path('payments/return/', payment_views.payment_return_view),
    # Admin CRUD API (pymongo-powered, no Djongo)
    path('admin/stats/', admin_views.admin_stats),
    path('admin/bookings/', admin_views.AdminBookingsView.as_view()),
    path('admin/bookings/<int:booking_id>/', admin_views.AdminBookingDetailView.as_view()),
    path('admin/services/', admin_views.AdminServicesView.as_view()),
    path('admin/services/<int:service_id>/', admin_views.AdminServiceDetailView.as_view()),
    path('admin/users/', admin_views.AdminUsersView.as_view()),
    path('admin/users/<int:user_id>/', admin_views.AdminUserDetailView.as_view()),
    path('', include(router.urls)),
]
