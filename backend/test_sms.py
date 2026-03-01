#!/usr/bin/env python
"""
Test SMS instead of WhatsApp
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from notifications.services import send_sms_saudi

def test_sms():
    """Test SMS sending"""
    
    test_phone = "+923204179128"
    message = "Test SMS from AC & Refrigeration system"
    
    print(f"Testing SMS to: {test_phone}")
    print(f"Message: {message}")
    
    result = send_sms_saudi(test_phone, message)
    
    if result.get('success'):
        print("✅ SMS test sent successfully!")
    else:
        print(f"❌ SMS test failed: {result.get('error')}")

if __name__ == "__main__":
    test_sms()
