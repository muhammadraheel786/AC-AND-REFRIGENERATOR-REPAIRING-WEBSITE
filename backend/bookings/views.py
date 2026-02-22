from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from .models import Service, Booking, InvoiceLineItem
from .serializers import (
    ServiceSerializer, ServiceListSerializer, BookingSerializer,
    BookingCreateSerializer, GuestBookingCreateSerializer,
)
from .invoice import generate_invoice_pdf


def _notify_booking_created(booking):
    try:
        from notifications.services import notify_booking_confirmed, notify_admin_new_order
        notify_booking_confirmed(booking, booking.customer)
        notify_admin_new_order(booking)
    except Exception:
        pass


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.filter(is_active=True).order_by('id')
    filterset_fields = ['category']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ServiceSerializer
        return ServiceListSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        if self.request.user.is_authenticated and getattr(self.request.user, 'role', None) == 'admin':
            return Service.objects.all().order_by('id')
        return Service.objects.filter(is_active=True).order_by('id')


class BookingViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'admin':
            return Booking.objects.all().select_related('service', 'customer').order_by('-created_at')
        return Booking.objects.filter(customer=user).select_related('service').order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        return BookingSerializer

    def perform_create(self, serializer):
        booking = serializer.save(customer=self.request.user)
        _notify_booking_created(booking)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save(customer=request.user)
        _notify_booking_created(booking)
        # Return full booking payload (including id) so clients can immediately download receipt.
        output = BookingSerializer(booking, context={'request': request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='invoice')
    def invoice(self, request, pk=None):
        """Download invoice PDF for a booking."""
        booking = self.get_object()
        if booking.customer != request.user and getattr(request.user, 'role', None) != 'admin':
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        pdf = generate_invoice_pdf(booking)
        response = HttpResponse(pdf.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice-{booking.id}.pdf"'
        return response


class GuestBookingCreateView(APIView):
    """Create booking without login. Accepts phone, WhatsApp, email, customer_name. Returns token so guest can pay."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GuestBookingCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        booking = serializer.save()
        _notify_booking_created(booking)
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(booking.customer)
        return Response({
            'id': booking.id,
            'total_price': str(booking.total_price),
            'invoice_number': booking.invoice_number or '',
            'token': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)
