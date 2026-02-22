from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'booking', 'amount', 'method', 'status', 'transaction_id', 'created_at')
    list_filter = ('status', 'method')
    search_fields = ('transaction_id', 'booking__id')
    date_hierarchy = 'created_at'
    list_per_page = 25
    readonly_fields = ('booking', 'amount', 'method', 'status', 'transaction_id', 'gateway_response', 'created_at')
