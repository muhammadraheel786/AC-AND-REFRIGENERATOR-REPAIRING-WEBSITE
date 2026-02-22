from django.db import migrations


def seed_services(apps, schema_editor):
    Service = apps.get_model('bookings', 'Service')
    services = [
        {
            'name_ar': 'إصلاح وتنظيف وتركيب المكيفات',
            'name_en': 'AC Repair, Washing & Installation',
            'name_ur': 'AC مرمت اور انسٹالیشن',
            'description_ar': 'إصلاح جميع أنواع المكيفات - سبليت ومركزي',
            'description_en': 'Repair all types of AC - Split and Central',
            'description_ur': 'ہر قسم کے AC کی مرمت',
            'category': 'ac',
            'base_price': 150,
            'duration_hours': 2,
            'is_active': True,
            'image': '',
        },
        {
            'name_ar': 'إصلاح الثلاجات',
            'name_en': 'Refrigerator Repair',
            'name_ur': 'فریج مرمت',
            'description_ar': 'إصلاح الثلاجات وجميع أعطال التبريد',
            'description_en': 'Refrigerator repair and cooling issues',
            'description_ur': 'فریج مرمت',
            'category': 'refrigerator',
            'base_price': 120,
            'duration_hours': 1.5,
            'is_active': True,
            'image': '',
        },
        {
            'name_ar': 'إصلاح الغسالات',
            'name_en': 'Washing Machine Repair',
            'name_ur': 'واشنگ مشین مرمت',
            'description_ar': 'إصلاح الغسالات الأوتوماتيكية والعادية',
            'description_en': 'Automatic and manual washing machine repair',
            'description_ur': 'واشنگ مشین مرمت',
            'category': 'washing_machine',
            'base_price': 100,
            'duration_hours': 1,
            'is_active': True,
            'image': '',
        },
        {
            'name_ar': 'تركيب وصيانة الأجهزة',
            'name_en': 'Appliance Fitting & Maintenance',
            'name_ur': 'آلہ فٹنگ',
            'description_ar': 'تركيب وصيانة جميع الأجهزة المنزلية',
            'description_en': 'Installation and maintenance of household appliances',
            'description_ur': 'گھریلو آلات کی تنصیب',
            'category': 'appliance',
            'base_price': 80,
            'duration_hours': 1,
            'is_active': True,
            'image': '',
        },
        {
            'name_ar': 'إصلاح الأفران',
            'name_en': 'Oven Repair',
            'name_ur': 'اوون مرمت',
            'description_ar': 'إصلاح أفران الغاز والكهرباء',
            'description_en': 'Gas and electric oven repair',
            'description_ur': 'اوون مرمت',
            'category': 'oven',
            'base_price': 90,
            'duration_hours': 1,
            'is_active': True,
            'image': '',
        },
        {
            'name_ar': 'إصلاح البرادات والتبريد',
            'name_en': 'Cold Storage / Chillers Repair',
            'name_ur': 'کولڈ اسٹوریج مرمت',
            'description_ar': 'إصلاح البرادات وغرف التبريد - برودة',
            'description_en': 'Cold storage and chillers repair',
            'description_ur': 'کولڈ اسٹوریج مرمت',
            'category': 'cold_storage',
            'base_price': 200,
            'duration_hours': 2,
            'is_active': True,
            'image': '',
        },
    ]

    for service in services:
        Service.objects.update_or_create(
            name_en=service['name_en'],
            defaults=service,
        )


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0002_initial'),
    ]

    operations = [
        migrations.RunPython(seed_services, reverse_code=noop_reverse),
    ]
