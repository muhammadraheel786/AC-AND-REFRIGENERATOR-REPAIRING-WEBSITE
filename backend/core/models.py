from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user for customers and admin."""
    ROLE_CHOICES = [
        ('customer', 'Customer'),
        ('admin', 'Admin'),
        ('technician', 'Technician'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=20, blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)
    preferred_language = models.CharField(max_length=5, default='ar', choices=[
        ('ar', 'Arabic'), ('en', 'English'), ('ur', 'Urdu')
    ])

    def __str__(self):
        return self.username


class SiteSettings(models.Model):
    """Admin-editable website details - single row."""
    # Company
    company_name_ar = models.CharField(max_length=200, default='للتكييف والتبريد')
    company_name_en = models.CharField(max_length=200, default='A/C & Refrigeration')
    phone = models.CharField(max_length=20, default='0582618038')
    whatsapp = models.CharField(max_length=20, default='0582618038', blank=True)
    email = models.EmailField(blank=True, default='')
    # Location
    address_ar = models.CharField(max_length=300, default='الصناعية - الدمام، المملكة العربية السعودية')
    address_en = models.CharField(max_length=300, default='Al-Dieya - Dammam, Kingdom of Saudi Arabia')
    # Services line (for invoice)
    services_line_ar = models.CharField(max_length=400, default='إصلاح المكيفات والثلاجات والغسالات أفران - برودة - مركزي وسبليت')
    services_line_en = models.CharField(max_length=400, default='Repairing AC - Refrigerator, Washing Machine - Split - Central A/C')
    # Footer
    footer_text_ar = models.CharField(max_length=200, blank=True, default='جميع الحقوق محفوظة')
    footer_text_en = models.CharField(max_length=200, blank=True, default='All rights reserved')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Site Settings'
        verbose_name_plural = 'Site Settings'

    def __str__(self):
        return self.company_name_en

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1, defaults={})
        return obj
