#!/usr/bin/env python
"""
Seed production database with initial data
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from bookings.models import Service
from django.contrib.auth import get_user_model

def seed_services():
    """Create initial services if they don't exist"""
    services_data = [
        {
            'name_ar': 'إصلاح المكيفات',
            'name_en': 'AC Repair',
            'category': 'repair',
            'base_price': 150.00,
            'duration_hours': 2.0,
            'description_ar': 'إصلاح جميع أنواع المكيفات',
            'description_en': 'Repair all types of air conditioners',
            'is_active': True
        },
        {
            'name_ar': 'تركيب المكيفات',
            'name_en': 'AC Installation',
            'category': 'installation',
            'base_price': 200.00,
            'duration_hours': 3.0,
            'description_ar': 'تركيب مكيفات جديدة',
            'description_en': 'Install new air conditioners',
            'is_active': True
        },
        {
            'name_ar': 'صيانة دورية',
            'name_en': 'Regular Maintenance',
            'category': 'maintenance',
            'base_price': 100.00,
            'duration_hours': 1.5,
            'description_ar': 'صيانة دورية للمكيفات',
            'description_en': 'Regular maintenance for air conditioners',
            'is_active': True
        },
        {
            'name_ar': 'تنظيف المكيفات',
            'name_en': 'AC Cleaning',
            'category': 'cleaning',
            'base_price': 80.00,
            'duration_hours': 1.0,
            'description_ar': 'تنظيف وتعقيم المكيفات',
            'description_en': 'Clean and sanitize air conditioners',
            'is_active': True
        }
    ]
    
    created_count = 0
    for service_data in services_data:
        service, created = Service.objects.get_or_create(
            name_en=service_data['name_en'],
            defaults=service_data
        )
        if created:
            print(f"✅ Created service: {service.name_en}")
            created_count += 1
        else:
            print(f"ℹ️  Service already exists: {service.name_en}")
    
    return created_count

def create_admin_user():
    """Create admin user if it doesn't exist"""
    User = get_user_model()
    
    admin_data = {
        'username': 'admin',
        'email': 'admin@ac-refrigeration.sa',
        'first_name': 'Admin',
        'last_name': 'User',
        'role': 'admin',
        'is_staff': True,
        'is_superuser': True
    }
    
    try:
        admin, created = User.objects.get_or_create(
            username='admin',
            defaults=admin_data
        )
        if created:
            admin.set_password('admin123')
            admin.save()
            print(f"✅ Created admin user: {admin.username}")
            print(f"   Password: admin123")
        else:
            print(f"ℹ️  Admin user already exists: {admin.username}")
        return created
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        return False

def main():
    print("=== Seeding Production Database ===")
    
    # Seed services
    print("\n--- Creating Services ---")
    services_created = seed_services()
    print(f"Services created: {services_created}")
    
    # Create admin user
    print("\n--- Creating Admin User ---")
    admin_created = create_admin_user()
    
    print(f"\n✅ Database seeding complete!")
    print(f"   Services: {Service.objects.count()}")
    print(f"   Users: {get_user_model().objects.count()}")

if __name__ == "__main__":
    main()
