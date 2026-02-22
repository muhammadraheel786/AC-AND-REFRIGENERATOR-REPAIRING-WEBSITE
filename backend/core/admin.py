from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, SiteSettings


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'role', 'phone', 'whatsapp', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'phone', 'whatsapp')
    ordering = ('-date_joined',)
    date_hierarchy = 'date_joined'
    list_per_page = 25
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Extra', {'fields': ('role', 'phone', 'whatsapp', 'preferred_language')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('username', 'password1', 'password2')}),
        ('Extra', {'fields': ('first_name', 'last_name', 'email', 'role', 'phone', 'whatsapp', 'preferred_language')}),
    )


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ('company_name_en', 'phone', 'address_city_short', 'updated_at')

    def address_city_short(self, obj):
        a = obj.address_en or ''
        return (a[:40] + '...') if len(a) > 40 else a or '-'
    address_city_short.short_description = 'Address'

    fieldsets = (
        ('Company', {'fields': ('company_name_ar', 'company_name_en', 'phone', 'whatsapp', 'email')}),
        ('Location', {'fields': ('address_ar', 'address_en')}),
        ('Services (Invoice)', {'fields': ('services_line_ar', 'services_line_en')}),
        ('Footer', {'fields': ('footer_text_ar', 'footer_text_en')}),
    )

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
