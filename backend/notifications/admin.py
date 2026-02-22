from django.contrib import admin
from .models import NotificationLog


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'channel', 'type', 'status', 'created_at')
    list_filter = ('channel', 'type', 'status')
    search_fields = ('content_ar', 'content_en')
    readonly_fields = ('recipient', 'channel', 'type', 'content_ar', 'content_en', 'status', 'error', 'metadata', 'created_at', 'sent_at')
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False
