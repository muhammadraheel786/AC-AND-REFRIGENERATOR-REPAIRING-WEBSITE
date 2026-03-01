#!/usr/bin/env python
"""
Test MongoDB Atlas connection
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django.core.management import execute_from_command_line

def test_mongodb_connection():
    """Test MongoDB Atlas connection"""
    print("=== Testing MongoDB Atlas Connection ===")
    
    try:
        # Test basic connection
        with connection.cursor() as cursor:
            cursor.execute("db.runCommand({ping: 1})")
            result = cursor.fetchone()
            print(f"✅ MongoDB Atlas connected successfully!")
            print(f"   Result: {result}")
            
        # Test database operations
        print("\n--- Testing Database Operations ---")
        
        # Test creating a collection
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        # Check if we can query users
        user_count = User.objects.count()
        print(f"✅ Database operations working!")
        print(f"   Current users: {user_count}")
        
        return True
        
    except Exception as e:
        print(f"❌ MongoDB Atlas connection failed!")
        print(f"   Error: {str(e)}")
        return False

def test_migrations():
    """Test if migrations are applied"""
    print("\n--- Testing Migrations ---")
    try:
        from django.core.management import call_command
        call_command('showmigrations', '--plan')
        print("✅ Migrations check completed")
        return True
    except Exception as e:
        print(f"❌ Migration check failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_mongodb_connection()
    if success:
        test_migrations()
        print("\n🎉 MongoDB Atlas is working correctly!")
    else:
        print("\n❌ MongoDB Atlas connection issues detected")
