from rest_framework import serializers
from decimal import Decimal, ROUND_HALF_UP
from .models import Service, Booking, InvoiceLineItem
from core.serializers import UserSerializer


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'


class ServiceListSerializer(serializers.ModelSerializer):
    """Light serializer for listing - includes localized name based on query param."""
    name = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = ('id', 'name', 'category', 'base_price', 'duration_hours', 'image')

    def get_name(self, obj):
        request = self.context.get('request')
        params = getattr(request, 'query_params', None) if request else None
        lang = params.get('lang', 'ar') if params else 'ar'
        return obj.get_name(lang)


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLineItem
        fields = ('id', 'description_ar', 'description_en', 'quantity', 'unit_price', 'total_amount')
        read_only_fields = ('total_amount',)


class BookingSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name_en', read_only=True)
    customer_name = serializers.SerializerMethodField()
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = Booking
        fields = (
            'id', 'customer', 'service', 'service_name', 'customer_name',
            'scheduled_date', 'scheduled_time', 'status', 'payment_status',
            'total_price', 'address_street', 'address_city', 'address_lat', 'address_lng',
            'notes', 'technician', 'invoice_number', 'line_items',
            'created_at', 'updated_at'
        )
        read_only_fields = ('payment_status', 'invoice_number')

    def get_customer_name(self, obj):
        return obj.customer.get_full_name() or obj.customer.username


class BookingCreateSerializer(serializers.ModelSerializer):
    """For authenticated customer booking."""
    service_id = serializers.PrimaryKeyRelatedField(queryset=Service.objects.filter(is_active=True), source='service')
    # Accept high-precision input, then normalize to model precision (10,7)
    address_lat = serializers.DecimalField(max_digits=20, decimal_places=12, required=False, allow_null=True)
    address_lng = serializers.DecimalField(max_digits=20, decimal_places=12, required=False, allow_null=True)

    class Meta:
        model = Booking
        fields = (
            'service_id', 'scheduled_date', 'scheduled_time',
            'address_street', 'address_city', 'address_lat', 'address_lng', 'notes'
        )

    def create(self, validated_data):
        service = validated_data['service']
        validated_data['total_price'] = service.base_price
        validated_data['customer'] = self.context['request'].user
        return super().create(validated_data)

    def _normalize_coord(self, value, *, min_value, max_value, field_name):
        if value is None:
            return None
        v = Decimal(value)
        if v < Decimal(str(min_value)) or v > Decimal(str(max_value)):
            raise serializers.ValidationError(f"{field_name} is out of range.")
        return v.quantize(Decimal('0.0000001'), rounding=ROUND_HALF_UP)

    def validate_address_lat(self, value):
        return self._normalize_coord(value, min_value=-90, max_value=90, field_name='Latitude')

    def validate_address_lng(self, value):
        return self._normalize_coord(value, min_value=-180, max_value=180, field_name='Longitude')


class GuestBookingCreateSerializer(serializers.Serializer):
    """Guest booking: contact info + booking details. Creates or gets customer by phone."""
    service_id = serializers.PrimaryKeyRelatedField(queryset=Service.objects.filter(is_active=True), source='service')
    scheduled_date = serializers.DateField()
    scheduled_time = serializers.CharField(max_length=10)
    address_street = serializers.CharField(max_length=500)
    address_city = serializers.CharField(max_length=100, default='Dammam')
    # Accept high-precision input, then normalize to model precision (10,7)
    address_lat = serializers.DecimalField(max_digits=20, decimal_places=12, required=False, allow_null=True)
    address_lng = serializers.DecimalField(max_digits=20, decimal_places=12, required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    # Contact (from invoice: customer = Mr./Messers + phone)
    customer_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=20)
    whatsapp = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    email = serializers.EmailField(required=False, allow_blank=True, default='')

    def create(self, validated_data):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        service = validated_data.pop('service')
        customer_name = validated_data.pop('customer_name')
        phone = validated_data.pop('phone')
        whatsapp = validated_data.pop('whatsapp', '') or phone
        email = validated_data.pop('email', '')
        # Normalize phone for username (unique per guest)
        phone_clean = ''.join(c for c in str(phone) if c.isdigit())[-15:]
        username = f"guest_{phone_clean}" if phone_clean else f"guest_{id(self)}"
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'first_name': customer_name[:30],
                'phone': phone,
                'whatsapp': whatsapp or phone,
                'email': email or f'{username}@guest.local',
                'role': 'customer',
                'is_active': True,
            }
        )
        if not created:
            user.first_name = customer_name[:30]
            user.phone = phone
            user.whatsapp = whatsapp or phone
            if email:
                user.email = email
            user.save(update_fields=['first_name', 'phone', 'whatsapp', 'email'])
        validated_data['customer'] = user
        validated_data['service'] = service
        validated_data['total_price'] = service.base_price
        return Booking.objects.create(**validated_data)

    def _normalize_coord(self, value, *, min_value, max_value, field_name):
        if value is None:
            return None
        v = Decimal(value)
        if v < Decimal(str(min_value)) or v > Decimal(str(max_value)):
            raise serializers.ValidationError(f"{field_name} is out of range.")
        return v.quantize(Decimal('0.0000001'), rounding=ROUND_HALF_UP)

    def validate_address_lat(self, value):
        return self._normalize_coord(value, min_value=-90, max_value=90, field_name='Latitude')

    def validate_address_lng(self, value):
        return self._normalize_coord(value, min_value=-180, max_value=180, field_name='Longitude')
