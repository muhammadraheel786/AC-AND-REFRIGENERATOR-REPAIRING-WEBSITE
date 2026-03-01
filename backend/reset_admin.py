#!/usr/bin/env python
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.filter(username='admin').first()
if u:
    u.set_password('Admin@2026!')
    u.is_superuser = True
    u.is_staff = True
    try:
        u.role = 'admin'
    except Exception:
        pass
    u.save()
    print('Password updated. is_superuser:', u.is_superuser)
else:
    u = User.objects.create_superuser('admin', 'admin@youracrepair.com', 'Admin@2026!')
    print('Created superuser admin')
