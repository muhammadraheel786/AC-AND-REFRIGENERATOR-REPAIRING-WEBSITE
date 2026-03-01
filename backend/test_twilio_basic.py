#!/usr/bin/env python
"""
Basic Twilio test to check credentials
"""
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings

def test_twilio_credentials():
    """Test basic Twilio connection"""
    
    # Check configuration
    sid = getattr(settings, 'TWILIO_ACCOUNT_SID', '')
    token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    number = getattr(settings, 'TWILIO_SMS_NUMBER', '')
    
    print(f"Account SID: {sid}")
    print(f"Auth Token: {token[:10]}..." if token else "No Auth Token")
    print(f"Phone Number: {number}")
    
    if not sid or not token:
        print("❌ Missing credentials")
        return
    
    try:
        from twilio.rest import Client
        client = Client(sid, token)
        
        # Test by fetching account info
        account = client.api.accounts(sid).fetch()
        print(f"✅ Account found: {account.friendly_name}")
        
        # Check if WhatsApp is enabled
        phone_numbers = client.incoming_phone_numbers.list()
        whatsapp_numbers = [p for p in phone_numbers if 'whatsapp' in p.capabilities.get('capabilities', {})]
        
        if whatsapp_numbers:
            print(f"✅ WhatsApp enabled numbers: {len(whatsapp_numbers)}")
            for p in whatsapp_numbers:
                print(f"   - {p.phone_number}")
        else:
            print("❌ No WhatsApp-enabled numbers found")
            print("Available numbers:")
            for p in phone_numbers:
                print(f"   - {p.phone_number}: {p.capabilities}")
        
    except Exception as e:
        print(f"❌ Twilio error: {e}")

if __name__ == "__main__":
    test_twilio_credentials()
