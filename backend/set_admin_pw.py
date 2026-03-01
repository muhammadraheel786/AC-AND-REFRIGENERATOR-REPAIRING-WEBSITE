from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.filter(username='admin').first()
if u:
    u.set_password('Admin@2026!')
    u.is_superuser = True
    u.is_staff = True
    u.role = 'admin'
    u.save(update_fields=['password', 'is_superuser', 'is_staff', 'role'])
    print('Password updated OK, is_superuser:', u.is_superuser)
else:
    u = User.objects.create_superuser(
        username='admin',
        email='admin@youracrepair.com',
        password='Admin@2026!',
        role='admin',
        is_staff=True,
        is_superuser=True,
    )
    print('Superuser created:', u.username)
