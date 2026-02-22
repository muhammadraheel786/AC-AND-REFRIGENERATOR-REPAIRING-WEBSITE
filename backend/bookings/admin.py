from django.contrib import admin
from .models import Service, Booking, InvoiceLineItem, Review


class InvoiceLineItemInline(admin.TabularInline):
    model = InvoiceLineItem
    extra = 1
    fields = ('description_ar', 'description_en', 'quantity', 'unit_price', 'total_amount')


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name_en', 'name_ar', 'category', 'base_price', 'duration_hours', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('name_en', 'name_ar')
    list_editable = ('base_price', 'is_active')
    list_per_page = 25


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'invoice_number', 'customer', 'service', 'scheduled_date', 'scheduled_time',
        'status', 'payment_status', 'total_price', 'address_city', 'created_at'
    )
    list_filter = ('status', 'payment_status', 'address_city')
    search_fields = ('invoice_number', 'customer__username', 'customer__phone', 'customer__first_name')
    list_per_page = 25
    date_hierarchy = 'scheduled_date'
    inlines = [InvoiceLineItemInline]
    readonly_fields = ('invoice_number', 'created_at', 'updated_at')
    fieldsets = (
        (None, {'fields': ('customer', 'service', 'invoice_number')}),
        ('Schedule', {'fields': ('scheduled_date', 'scheduled_time')}),
        ('Status', {'fields': ('status', 'payment_status', 'technician')}),
        ('Amount', {'fields': ('total_price',)}),
        ('Address', {'fields': ('address_street', 'address_city', 'address_lat', 'address_lng')}),
        ('Other', {'fields': ('notes', 'created_at', 'updated_at')}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('customer', 'service')

    @admin.action(description='Mark as Confirmed')
    def mark_confirmed(self, request, queryset):
        queryset.update(status='confirmed')

    @admin.action(description='Mark as Completed')
    def mark_completed(self, request, queryset):
        queryset.update(status='completed')

    @admin.action(description='Mark as Cancelled')
    def mark_cancelled(self, request, queryset):
        queryset.update(status='cancelled')

    actions = [mark_confirmed, mark_completed, mark_cancelled]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'service', 'rating', 'is_visible', 'created_at')
    list_filter = ('rating', 'is_visible')
    search_fields = ('comment_ar', 'comment_en')
    date_hierarchy = 'created_at'
    list_per_page = 25
