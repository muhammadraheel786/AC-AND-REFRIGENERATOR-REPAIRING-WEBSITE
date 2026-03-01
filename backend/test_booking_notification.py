#!/usr/bin/env python
"""
Test booking notification system
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from notifications.services import notify_booking_confirmed
from bookings.models import Booking, Service
from django.contrib.auth import get_user_model

def test_booking_notification():
    """Test the complete booking notification flow"""
    
    print("=== TESTING BOOKING NOTIFICATION SYSTEM ===")
    
    # Get or create a test user
    User = get_user_model()
    user, created = User.objects.get_or_create(
        username='test_user',
        defaults={
            'email': 'test@example.com',
            'phone': '+923204179128',
            'whatsapp': '+923204179128',
            'first_name': 'Test',
            'last_name': 'User',
        }
    )
    
    if created:
        print(f"✅ Created test user: {user.username}")
    else:
        print(f"✅ Using existing user: {user.username}")
    
    # Get a service
    service = Service.objects.first()
    if not service:
        print("❌ No services found. Please create a service first.")
        return
    
    print(f"✅ Using service: {service.name_en}")
    
    # Create a test booking
    booking = Booking.objects.create(
        customer=user,
        service=service,
        scheduled_date='2024-12-25',
        scheduled_time='10:00',
        address_street='Test Address, Dammam',
        address_city='Dammam',
        total_price=100.00,
        status='pending'
    )
    
    print(f"✅ Created booking: #{booking.id}")
    
    # Test notification
    print("\n--- Sending Notification ---")
    try:
        notify_booking_confirmed(booking, user)
        print("✅ Booking notification sent successfully!")
    except Exception as e:
        print(f"❌ Notification failed: {e}")
    
    # Check notification logs
    from notifications.models import NotificationLog
    logs = NotificationLog.objects.filter(recipient=user).order_by('-created_at')[:3]
    
    print(f"\n--- Recent Notification Logs ---")
    for log in logs:
        print(f"Channel: {log.channel}")
        print(f"Status: {log.status}")
        print(f"Content: {log.content_ar}")
        if log.error:
            print(f"Error: {log.error}")
        print("---")

if __name__ == "__main__":
    test_booking_notification()
