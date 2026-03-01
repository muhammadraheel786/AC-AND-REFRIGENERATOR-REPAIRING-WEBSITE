import logging
from django.db import connection, utils as db_utils
from django.conf import settings
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from .models import Service, Booking, InvoiceLineItem

logger = logging.getLogger(__name__)
from .serializers import (
    ServiceSerializer, ServiceListSerializer, BookingSerializer,
    BookingCreateSerializer, GuestBookingCreateSerializer,
)
from .invoice import generate_invoice_pdf


def _notify_booking_created(booking):
    # Notifications temporarily disabled for deployment
    pass


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_view(request):
    """Health check: verifies app and MongoDB connection. Use for debugging 500s."""
    try:
        connection.ensure_connection()
        # Quick read to confirm DB is usable
        Service.objects.exists()
        return Response({'status': 'ok', 'database': 'connected'}, status=status.HTTP_200_OK)
    except Exception as e:
        err = str(e)
        # Avoid leaking connection details
        if 'password' in err.lower() or '@' in err or 'mongodb' in err.lower():
            msg = 'Database connection failed (check MONGODB_URI and Atlas Network Access)'
        else:
            msg = err[:200]
        return Response(
            {'status': 'error', 'database': 'failed', 'message': msg},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.filter(is_active=True)
    filterset_fields = ['category']
    pagination_class = None  # Avoid pagination .count() issues with djongo/MongoDB

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return ServiceSerializer
        return ServiceListSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        try:
            if self.request.user.is_authenticated and getattr(self.request.user, 'role', None) == 'admin':
                return Service.objects.all()
            return Service.objects.filter(is_active=True)
        except Exception:
            return Service.objects.filter(is_active=True)

    def _services_list_via_pymongo(self, request, lang):
        """Fallback: read services from MongoDB with pymongo when djongo raises DatabaseError."""
        try:
            from pymongo import MongoClient
            db_config = settings.DATABASES['default']
            uri = db_config.get('CLIENT', {}).get('host') or ''
            db_name = db_config.get('NAME', 'ac_refrigeration')
            if not uri:
                return None
            client = MongoClient(uri)
            db = client[db_name]
            coll_name = Service._meta.db_table
            coll = db[coll_name]
            cursor = coll.find({'is_active': True}).sort('_id', 1)
            out = []
            for doc in cursor:
                pk = doc.get('id', doc.get('_id'))
                if hasattr(pk, '__str__') and not isinstance(pk, (int, float)):
                    pk = str(pk)
                name_key = f'name_{lang}' if lang in ('ar', 'en', 'ur') else 'name_en'
                name = doc.get(name_key) or doc.get('name_en') or doc.get('name_ar') or ''
                base = doc.get('base_price', 0)
                duration = doc.get('duration_hours', 1)
                if hasattr(base, '__float__'):
                    base = float(base)
                if hasattr(duration, '__float__'):
                    duration = float(duration)
                out.append({
                    'id': pk,
                    'name': name or '',
                    'category': doc.get('category', ''),
                    'base_price': str(base),
                    'duration_hours': str(duration),
                    'image': doc.get('image') or '',
                })
            return out
        except Exception as e:
            logger.warning('pymongo services fallback failed: %s', e)
            return None

    def list(self, request, *args, **kwargs):
        """List services. Use pymongo fallback if djongo raises DatabaseError."""
        lang = request.query_params.get('lang', 'en')
        if lang not in ['en', 'ar', 'ur']:
            return Response({
                'error': 'Invalid language parameter',
                'message': 'lang must be one of: en, ar, ur',
                'received': lang
            }, status=status.HTTP_400_BAD_REQUEST)
        try:
            # Minimal queryset: no order_by to avoid djongo DatabaseError
            queryset = self.get_queryset()
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            items = list(queryset)
            serializer = self.get_serializer(items, many=True)
            return Response(serializer.data)
        except db_utils.DatabaseError:
            # Djongo DatabaseError (e.g. order_by/filter conversion): use raw pymongo
            payload = self._services_list_via_pymongo(request, lang)
            if payload is not None:
                return Response(payload)
            logger.exception('Services list failed')
            return Response({
                'error': 'Internal server error',
                'message': 'DatabaseError when listing services; pymongo fallback failed',
                'exception_type': 'DatabaseError',
                'debug_info': {'lang': lang, 'method': request.method, 'path': request.path}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.exception('Services list failed')
            msg = str(e).strip() or repr(e) or type(e).__name__
            return Response({
                'error': 'Internal server error',
                'message': msg,
                'exception_type': type(e).__name__,
                'debug_info': {'lang': lang, 'method': request.method, 'path': request.path}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
