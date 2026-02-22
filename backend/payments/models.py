from django.db import models
from django.conf import settings


class Payment(models.Model):
    """Payment record linked to a booking."""
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    METHOD_CHOICES = [
        ('mada', 'Mada'),
        ('stc_pay', 'STC Pay'),
        ('credit_card', 'Credit/Debit Card'),
        ('cash', 'Cash'),
    ]
    method = models.CharField(max_length=20, choices=METHOD_CHOICES)
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=255, blank=True)
    gateway_response = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
