from django.db import models
from django.conf import settings


class NotificationLog(models.Model):
    """Log of sent notifications."""
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    channel = models.CharField(max_length=20)  # whatsapp, sms, email
    type = models.CharField(max_length=50)  # booking-confirmed, payment-received, etc.
    content_ar = models.TextField(blank=True)
    content_en = models.TextField(blank=True)
    content_ur = models.TextField(blank=True)
    status = models.CharField(max_length=20, default='pending')  # pending, sent, failed
    error = models.TextField(blank=True)
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
