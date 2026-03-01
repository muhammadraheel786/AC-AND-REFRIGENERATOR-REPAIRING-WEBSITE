from django.db import models
from django.conf import settings


class Service(models.Model):
    """Service catalog - AC, Refrigerator, Washing Machine, etc."""
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200)
    name_ur = models.CharField(max_length=200, blank=True)
    description_ar = models.TextField(blank=True)
    description_en = models.TextField(blank=True)
    description_ur = models.TextField(blank=True)
    CATEGORY_CHOICES = [
        ('ac', 'AC Repair/Installation'),
        ('refrigerator', 'Refrigerator'),
        ('washing_machine', 'Washing Machine'),
        ('appliance', 'Appliance Fitting'),
        ('oven', 'Oven'),
        ('cold_storage', 'Cold Storage / Chillers'),  # بردة from invoice
    ]
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_hours = models.DecimalField(max_digits=4, decimal_places=1, default=1)
    is_active = models.BooleanField(default=True)
    image = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name_en

    def get_name(self, lang='ar'):
        val = getattr(self, f'name_{lang}', None) or getattr(self, 'name_ar', None)
        return val if val is not None else ''


class Booking(models.Model):
    """Customer booking for a service."""
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings')
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    scheduled_date = models.DateField()
    scheduled_time = models.CharField(max_length=10)  # e.g. "09:00", "14:30"
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    address_street = models.CharField(max_length=500)
    address_city = models.CharField(max_length=100, default='Dammam')
    address_lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    address_lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    notes = models.TextField(blank=True)
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_jobs'
    )
    invoice_number = models.CharField(max_length=50, blank=True, unique=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"#{self.id} - {self.service.name_en} - {self.customer.get_full_name() or self.customer.username}"


class InvoiceLineItem(models.Model):
    """Line item for invoice - matches the invoice template (DESCRIPTION, QTY, UNIT PRICE, TOTAL)."""
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='line_items')
    description_ar = models.CharField(max_length=300)
    description_en = models.CharField(max_length=300)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        self.total_amount = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return self.description_en


class Review(models.Model):
    """Customer reviews and ratings for services/bookings."""
    booking = models.OneToOneField(
        Booking, on_delete=models.CASCADE, related_name='review', null=True, blank=True
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews'
    )
    service = models.ForeignKey(
        Service, on_delete=models.CASCADE, related_name='reviews', null=True, blank=True
    )
    rating = models.PositiveSmallIntegerField()  # 1-5
    comment_ar = models.TextField(blank=True)
    comment_en = models.TextField(blank=True)
    comment_ur = models.TextField(blank=True)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
