#!/usr/bin/env python
"""
Test WhatsApp notifications
Run: python test_whatsapp.py
"""
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from notifications.services import send_whatsapp

def test_whatsapp():
    """Test WhatsApp sending functionality"""
    
    # Test phone number (replace with actual number for testing)
    test_phone = "+923204179128"  # Your test number from curl
    
    # Test message
    content_ar = "اختبار رسالة واتساب من نظام التكييف والتبريد"
    content_en = "Test WhatsApp message from AC & Refrigeration system"
    
    print(f"Testing WhatsApp to: {test_phone}")
    print(f"Message AR: {content_ar}")
    print(f"Message EN: {content_en}")
    
    # Check configuration
    from django.conf import settings
    phone_id = getattr(settings, 'WHATSAPP_PHONE_ID', '')
    token = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', '')
    twilio_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    twilio_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    twilio_number = getattr(settings, 'TWILIO_SMS_NUMBER', '')
    
    print(f"Meta Phone ID configured: {'Yes' if phone_id else 'No'}")
    print(f"Meta Access Token configured: {'Yes' if token else 'No'}")
    print(f"Twilio Account SID configured: {'Yes' if twilio_sid else 'No'}")
    print(f"Twilio Auth Token configured: {'Yes' if twilio_token else 'No'}")
    print(f"Twilio Number configured: {'Yes' if twilio_number else 'No'}")
    
    if not twilio_sid and not phone_id:
        print("❌ WhatsApp not configured. Please add Twilio or Meta credentials to .env")
        return
    
    # Send test message
    result = send_whatsapp(test_phone, content_ar, content_en, 'test_message')
    
    if result.get('success'):
        print("✅ WhatsApp test sent successfully!")
    else:
        print(f"❌ WhatsApp test failed: {result.get('error')}")

if __name__ == "__main__":
    test_whatsapp()
