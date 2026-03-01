import logging
from django.db import utils as db_utils
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
        from pymongo import MongoClient
        db_config = settings.DATABASES['default']
        uri = db_config.get('CLIENT', {}).get('host') or ''
        db_name = db_config.get('NAME', 'ac_refrigeration')
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        # Actually ping the server
        client.admin.command('ping')
        # Try a simple count on services
        count = client[db_name]['bookings_service'].count_documents({})
        return Response({
            'status': 'ok',
            'database': 'connected',
            'services_count': count
        }, status=status.HTTP_200_OK)
    except Exception as e:
        err = str(e)
        if 'password' in err.lower() or '@' in err or 'mongodb' in err.lower():
            msg = 'Database connection failed (check MONGODB_URI and Atlas Network Access whitelist)'
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

    def _list_bookings_via_pymongo(self, user_id, is_admin=False):
        """Fetch bookings directly from MongoDB for when Djongo ORM fails."""
        try:
            from pymongo import MongoClient
            db_config = settings.DATABASES['default']
            uri = db_config.get('CLIENT', {}).get('host') or ''
            db_name = db_config.get('NAME', 'ac_refrigeration')
            client = MongoClient(uri, serverSelectionTimeoutMS=10000)
            db = client[db_name]
            query = {} if is_admin else {'customer_id': user_id}
            docs = list(db['bookings_booking'].find(query).sort('created_at', -1).limit(100))
            # Map service names from service collection
            service_cache = {}
            result = []
            for doc in docs:
                sid = doc.get('service_id')
                if sid and sid not in service_cache:
                    svc = db['bookings_service'].find_one({'id': sid}) or {}
                    service_cache[sid] = svc.get('name_en') or svc.get('name_ar') or str(sid)
                result.append({
                    'id': doc.get('id'),
                    'invoice_number': doc.get('invoice_number', ''),
                    'service_name': service_cache.get(sid, '-'),
                    'scheduled_date': doc.get('scheduled_date', ''),
                    'scheduled_time': doc.get('scheduled_time', ''),
                    'status': doc.get('status', 'pending'),
                    'payment_status': doc.get('payment_status', 'pending'),
                    'total_price': str(doc.get('total_price', '0')),
                    'address_street': doc.get('address_street', ''),
                    'address_city': doc.get('address_city', ''),
                    'notes': doc.get('notes', ''),
                    'created_at': str(doc.get('created_at', '')),
                })
            return result
        except Exception as e:
            logger.exception('pymongo booking list fallback failed: %s', e)
            return None

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            logger.warning('Djongo booking list failed, trying pymongo fallback: %s', type(e).__name__)
            is_admin = getattr(request.user, 'role', None) == 'admin'
            result = self._list_bookings_via_pymongo(request.user.pk, is_admin)
            if result is not None:
                return Response(result)
            return Response({'error': 'Failed to load bookings'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _create_booking_via_pymongo(self, validated_data, user):
        """Fallback: write booking to MongoDB directly with pymongo when djongo fails."""
        try:
            from pymongo import MongoClient
            from datetime import datetime
            from decimal import Decimal
            import re
            db_config = settings.DATABASES['default']
            uri = db_config.get('CLIENT', {}).get('host') or ''
            db_name = db_config.get('NAME', 'ac_refrigeration')
            client = MongoClient(uri, serverSelectionTimeoutMS=10000)
            db = client[db_name]

            # Resolve service object
            service = validated_data.get('service')
            service_id = service.pk if hasattr(service, 'pk') else int(service)

            # Get next booking id (auto-increment style)
            counter = db['bookings_booking'].find_one(sort=[('id', -1)])
            next_id = (counter.get('id') or 0 if counter else 0) + 1

            # Generate invoice number
            invoice_number = f"INV-{next_id:06d}"

            lat = validated_data.get('address_lat')
            lng = validated_data.get('address_lng')
            total_price = service.base_price if hasattr(service, 'base_price') else Decimal('0')

            doc = {
                'id': next_id,
                'customer_id': user.pk,
                'service_id': service_id,
                'scheduled_date': str(validated_data.get('scheduled_date', '')),
                'scheduled_time': str(validated_data.get('scheduled_time', '')),
                'address_street': str(validated_data.get('address_street', '')),
                'address_city': str(validated_data.get('address_city', 'Dammam')),
                'address_lat': float(lat) if lat is not None else None,
                'address_lng': float(lng) if lng is not None else None,
                'notes': str(validated_data.get('notes', '')),
                'status': 'pending',
                'payment_status': 'pending',
                'total_price': str(total_price),
                'invoice_number': invoice_number,
                'technician_id': None,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            }
            db['bookings_booking'].insert_one(doc)
            return {
                'id': next_id,
                'invoice_number': invoice_number,
                'total_price': str(total_price),
                'status': 'pending',
                'payment_status': 'pending',
                'service': service_id,
                'scheduled_date': doc['scheduled_date'],
                'scheduled_time': doc['scheduled_time'],
                'address_street': doc['address_street'],
                'address_city': doc['address_city'],
            }
        except Exception as e:
            logger.exception('pymongo booking fallback failed: %s', e)
            return None

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            try:
                booking = serializer.save(customer=request.user)
                _notify_booking_created(booking)
                output = BookingSerializer(booking, context={'request': request})
                return Response(output.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                logger.warning('djongo booking create failed, trying pymongo fallback: %s', type(e).__name__)
                result = self._create_booking_via_pymongo(serializer.validated_data, request.user)
                if result:
                    return Response(result, status=status.HTTP_201_CREATED)
                return Response(
                    {'error': 'Booking failed', 'message': 'Database error creating booking. Please try again.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as outside_err:
            import traceback
            logger.exception('Auth booking crashed before fallback: %s', outside_err)
            raw_data = request.data
            fallback_data = {
                'service': Service(pk=raw_data.get('service_id')),
                'scheduled_date': raw_data.get('scheduled_date', ''),
                'scheduled_time': raw_data.get('scheduled_time', ''),
                'address_street': raw_data.get('address_street', ''),
                'address_city': raw_data.get('address_city', 'Dammam'),
                'address_lat': raw_data.get('address_lat'),
                'address_lng': raw_data.get('address_lng'),
                'notes': raw_data.get('notes', ''),
            }
            result = self._create_booking_via_pymongo(fallback_data, request.user)
            if result:
                return Response(result, status=status.HTTP_201_CREATED)
            return Response(
                {'error': 'Severe DB Error', 'detail': str(outside_err), 'trace': traceback.format_exc()},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='invoice')
    def invoice(self, request, pk=None):
        """Download invoice PDF for a booking."""
        try:
            booking = self.get_object()
            if booking.customer != request.user and getattr(request.user, 'role', None) != 'admin':
                return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
            pdf = generate_invoice_pdf(booking)
            response = HttpResponse(pdf.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="invoice-{booking.id}.pdf"'
            return response
        except Exception as e:
            logger.warning('Djongo invoice failed, trying pymongo fallback: %s', type(e).__name__)
            return self._invoice_via_pymongo(request, pk)

    def _invoice_via_pymongo(self, request, pk):
        """Generate invoice PDF directly from MongoDB when Djongo ORM fails."""
        try:
            from pymongo import MongoClient
            from io import BytesIO
            db_config = settings.DATABASES['default']
            uri = db_config.get('CLIENT', {}).get('host') or ''
            db_name = db_config.get('NAME', 'ac_refrigeration')
            client = MongoClient(uri, serverSelectionTimeoutMS=10000)
            db = client[db_name]
            # Try integer id first, fallback to ObjectId string
            try:
                doc = db['bookings_booking'].find_one({'id': int(pk)})
            except Exception:
                doc = db['bookings_booking'].find_one({'_id': pk})
            if not doc:
                return Response({'error': 'Booking not found'}, status=404)
            # Security: Only owner or admin can download
            user_id = request.user.pk
            is_admin = getattr(request.user, 'role', None) == 'admin'
            if not is_admin and doc.get('customer_id') != user_id:
                return Response({'error': 'Forbidden'}, status=403)
            # Fetch service name
            sid = doc.get('service_id')
            svc = db['bookings_service'].find_one({'id': sid}) or {}
            service_name = svc.get('name_en') or svc.get('name_ar') or 'Service'
            # Fetch customer info
            cid = doc.get('customer_id')
            cust = db['core_user'].find_one({'id': cid}) or {}
            cust_name = (cust.get('first_name', '') + ' ' + cust.get('last_name', '')).strip() or cust.get('username', 'Guest')
            phone = cust.get('phone', '') or cust.get('whatsapp', '') or '-'
            email = cust.get('email', '') or ''
            if not email or email.endswith('@guest.local'):
                email = '-'
            # Build minimal booking proxy object for generate_invoice_pdf
            class BookingProxy:
                id = doc.get('id')
                invoice_number = doc.get('invoice_number', '')
                scheduled_date = doc.get('scheduled_date', '')
                scheduled_time = doc.get('scheduled_time', '')
                address_street = doc.get('address_street', '')
                address_city = doc.get('address_city', 'Dammam')
                notes = doc.get('notes', '')
                total_price = doc.get('total_price', '0')
                class line_items:
                    @staticmethod
                    def all(): return []
                class service:
                    name_en = service_name
                    name_ar = service_name
                class customer:
                    pass
            BookingProxy.customer.get_full_name = lambda self=None: cust_name
            BookingProxy.customer.username = cust.get('username', 'guest')
            BookingProxy.customer.phone = phone
            BookingProxy.customer.whatsapp = phone
            BookingProxy.customer.email = email
            from .invoice import generate_invoice_pdf
            from django.utils.dateparse import parse_date
            # Convert string date to date object if needed
            try:
                BookingProxy.scheduled_date = parse_date(str(doc.get('scheduled_date', ''))) or doc.get('scheduled_date', '')
            except Exception:
                pass
            pdf = generate_invoice_pdf(BookingProxy())
            resp = HttpResponse(pdf.read(), content_type='application/pdf')
            resp['Content-Disposition'] = f'attachment; filename="invoice-{BookingProxy.id}.pdf"'
            return resp
        except Exception as e:
            logger.exception('pymongo invoice fallback failed: %s', e)
            return Response({'error': 'Invoice generation failed', 'detail': str(e)}, status=500)



class GuestBookingCreateView(APIView):
    """Create booking without login. Accepts phone, WhatsApp, email, customer_name. Returns token so guest can pay."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'message': 'This endpoint is for creating guest bookings via POST.'})

    def _create_guest_booking_via_pymongo(self, validated_data):
        try:
            from pymongo import MongoClient
            from datetime import datetime
            from decimal import Decimal
            import hashlib
            from django.contrib.auth.hashers import make_password

            db_config = settings.DATABASES['default']
            uri = db_config.get('CLIENT', {}).get('host') or ''
            db_name = db_config.get('NAME', 'ac_refrigeration')
            client = MongoClient(uri, serverSelectionTimeoutMS=10000)
            db = client[db_name]

            service = validated_data.get('service')
            service_id = service.pk if hasattr(service, 'pk') else int(service)
            customer_name = validated_data.get('customer_name')
            phone = validated_data.get('phone')
            whatsapp = validated_data.get('whatsapp') or phone
            email = validated_data.get('email') or ''

            phone_clean = ''.join(c for c in str(phone) if c.isdigit())[-15:]
            username = f"guest_{phone_clean}" if phone_clean else f"guest_{hashlib.md5(str(datetime.now()).encode()).hexdigest()[:8]}"

            user_doc = db['core_user'].find_one({"username": username})
            if not user_doc:
                # Get next user ID safely
                user_counter = db['core_user'].find_one(sort=[('id', -1)])
                new_user_id = (user_counter.get('id') or 0 if user_counter else 0) + 1
                
                user_doc = {
                    'id': new_user_id,
                    'password': make_password(None),
                    'is_superuser': False,
                    'username': username,
                    'first_name': customer_name[:30],
                    'last_name': '',
                    'email': email or f'{username}@guest.local',
                    'is_staff': False,
                    'is_active': True,
                    'date_joined': datetime.utcnow(),
                    'role': 'customer',
                    'phone': phone,
                    'whatsapp': whatsapp,
                    'preferred_language': 'en'
                }
                db['core_user'].insert_one(user_doc)
            else:
                new_user_id = user_doc.get('id')
                if new_user_id is None:
                    user_counter = db['core_user'].find_one(sort=[('id', -1)])
                    new_user_id = (user_counter.get('id') or 0 if user_counter else 0) + 1
                    user_doc['id'] = new_user_id

                db['core_user'].update_one(
                    {'_id': user_doc['_id']},
                    {'$set': {
                        'id': new_user_id,
                        'first_name': customer_name[:30],
                        'phone': phone,
                        'whatsapp': whatsapp,
                        'email': email or user_doc.get('email', '')
                    }}
                )

            # Get next booking ID
            booking_counter = db['bookings_booking'].find_one(sort=[('id', -1)])
            next_booking_id = (booking_counter.get('id') or 0 if booking_counter else 0) + 1
            invoice_number = f"INV-{next_booking_id:06d}"

            lat = validated_data.get('address_lat')
            lng = validated_data.get('address_lng')
            total_price = service.base_price if hasattr(service, 'base_price') else Decimal('0')

            booking_doc = {
                'id': next_booking_id,
                'customer_id': new_user_id,
                'service_id': service_id,
                'scheduled_date': str(validated_data.get('scheduled_date', '')),
                'scheduled_time': str(validated_data.get('scheduled_time', '')),
                'address_street': str(validated_data.get('address_street', '')),
                'address_city': str(validated_data.get('address_city', 'Dammam')),
                'address_lat': float(lat) if lat is not None else None,
                'address_lng': float(lng) if lng is not None else None,
                'notes': str(validated_data.get('notes', '')),
                'status': 'pending',
                'payment_status': 'pending',
                'total_price': str(total_price),
                'invoice_number': invoice_number,
                'technician_id': None,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            }
            db['bookings_booking'].insert_one(booking_doc)

            # Generate JWT token manually since we bypassed Django logic
            from rest_framework_simplejwt.tokens import RefreshToken
            from django.contrib.auth import get_user_model
            User = get_user_model()
            # Try to get the user as a Django model wrapper so DRF can generate the token
            try:
                # We do this because SimpleJWT expects a Django User model instance
                django_user = User.objects.get(id=new_user_id)
                refresh = RefreshToken.for_user(django_user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)
            except Exception:
                access_token = "dummy_token_pymongo_fallback"
                refresh_token = "dummy_refresh_pymongo_fallback"

            return {
                'id': next_booking_id,
                'total_price': str(total_price),
                'invoice_number': invoice_number,
                'token': access_token,
                'refresh': refresh_token,
            }
        except Exception as e:
            logger.exception('pymongo guest booking fallback failed: %s', e)
            return None

    def post(self, request):
        try:
            serializer = GuestBookingCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            try:
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
            except Exception as e:
                logger.warning('djongo guest booking create failed, trying pymongo fallback: %s', type(e).__name__)
                result = self._create_guest_booking_via_pymongo(serializer.validated_data)
                if result:
                    return Response(result, status=status.HTTP_201_CREATED)
                return Response(
                    {'error': 'Booking failed', 'message': 'Could not save booking via fallback. Please call.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as outside_err:
            # If Djongo crashes during is_valid() (e.g., PrimaryKeyRelatedField lookup)
            import traceback
            logger.exception('Guest booking crashed before fallback: %s', outside_err)
            
            # Since validation failed, we have to construct validated_data manually to try the fallback anyway
            raw_data = request.data
            fallback_data = {
                'service': Service(pk=raw_data.get('service_id')), # Dummy service object for fallback
                'customer_name': raw_data.get('customer_name', 'Guest'),
                'phone': raw_data.get('phone', ''),
                'whatsapp': raw_data.get('whatsapp', ''),
                'email': raw_data.get('email', ''),
                'scheduled_date': raw_data.get('scheduled_date', ''),
                'scheduled_time': raw_data.get('scheduled_time', ''),
                'address_street': raw_data.get('address_street', ''),
                'address_city': raw_data.get('address_city', 'Dammam'),
                'address_lat': raw_data.get('address_lat'),
                'address_lng': raw_data.get('address_lng'),
                'notes': raw_data.get('notes', ''),
            }
            # Manually trigger fallback since serializer validation crashed Djongo
            result = self._create_guest_booking_via_pymongo(fallback_data)
            if result:
                return Response(result, status=status.HTTP_201_CREATED)
                
            return Response(
                {'error': 'Severe DB Error', 'detail': str(outside_err), 'trace': traceback.format_exc()},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
