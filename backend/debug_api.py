#!/usr/bin/env python
"""
Debug API endpoints to identify 400 errors
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.urls import reverse
import json

def test_api_endpoints():
    """Test API endpoints to identify issues"""
    
    client = Client()
    
    print("=== Testing API Endpoints ===")
    
    # Test services endpoint
    print("\n1. Testing /api/services/")
    try:
        response = client.get('/api/services/')
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.content.decode()}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test settings endpoint
    print("\n2. Testing /api/auth/settings/")
    try:
        response = client.get('/api/auth/settings/')
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.content.decode()}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test login endpoint
    print("\n3. Testing /api/auth/login/")
    try:
        response = client.post('/api/auth/login/', 
                           json.dumps({'username': 'test', 'password': 'test'}),
                           content_type='application/json')
        print(f"Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.content.decode()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api_endpoints()
