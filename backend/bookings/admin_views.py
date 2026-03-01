"""
Admin API Views - Built entirely on PyMongo to bypass Djongo ORM limitations.
Provides full CRUD for Bookings, Services, and Users.
Only accessible by is_staff=True users (admin JWT required).
"""
import logging
from datetime import datetime, date
from django.conf import settings
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes

logger = logging.getLogger(__name__)


def _get_db():
    from pymongo import MongoClient
    db_config = settings.DATABASES['default']
    uri = db_config.get('CLIENT', {}).get('host') or ''
    db_name = db_config.get('NAME', 'ac_refrigeration')
    client = MongoClient(uri, serverSelectionTimeoutMS=10000)
    return client[db_name]


def _serialize(doc):
    """Make a MongoDB document JSON-safe."""
    if doc is None:
        return None
    result = {}
    for k, v in doc.items():
        if k == '_id':
            continue
        if isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, date):
            result[k] = v.isoformat()
        else:
            result[k] = v
    return result


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


# ===========================================================================
# BOOKINGS ADMIN CRUD
# ===========================================================================

class AdminBookingsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        """List all bookings with customer and service info."""
        try:
            db = _get_db()
            page = int(request.query_params.get('page', 1))
            per_page = int(request.query_params.get('per_page', 20))
            search = request.query_params.get('search', '').strip()
            status_filter = request.query_params.get('status', '').strip()

            query = {}
            if status_filter:
                query['status'] = status_filter
            if search:
                query['$or'] = [
                    {'invoice_number': {'$regex': search, '$options': 'i'}},
                    {'address_street': {'$regex': search, '$options': 'i'}},
                ]

            total = db['bookings_booking'].count_documents(query)
            docs = list(
                db['bookings_booking']
                .find(query)
                .sort('created_at', -1)
                .skip((page - 1) * per_page)
                .limit(per_page)
            )

            # Resolve service names & customer names in bulk
            service_ids = list({d.get('service_id') for d in docs if d.get('service_id')})
            customer_ids = list({d.get('customer_id') for d in docs if d.get('customer_id')})

            services_map = {}
            for svc in db['bookings_service'].find({'id': {'$in': service_ids}}):
                services_map[svc['id']] = svc.get('name_en') or svc.get('name_ar') or '-'

            customers_map = {}
            for cust in db['core_user'].find({'id': {'$in': customer_ids}}):
                name = (cust.get('first_name', '') + ' ' + cust.get('last_name', '')).strip()
                customers_map[cust['id']] = {
                    'name': name or cust.get('username', 'Guest'),
                    'phone': cust.get('phone', '') or cust.get('whatsapp', ''),
                }

            results = []
            for doc in docs:
                row = _serialize(doc)
                row['service_name'] = services_map.get(doc.get('service_id'), '-')
                cust_info = customers_map.get(doc.get('customer_id'), {})
                row['customer_name'] = cust_info.get('name', '-')
                row['customer_phone'] = cust_info.get('phone', '-')
                results.append(row)

            return Response({
                'total': total,
                'page': page,
                'per_page': per_page,
                'results': results,
            })
        except Exception as e:
            logger.exception('Admin bookings list failed: %s', e)
            return Response({'error': str(e)}, status=500)

    def post(self, request):
        """Create a new booking directly."""
        try:
            db = _get_db()
            data = request.data
            counter = db['bookings_booking'].find_one(sort=[('id', -1)])
            next_id = (counter.get('id') or 0 if counter else 0) + 1
            invoice_number = f"INV-{next_id:06d}"

            doc = {
                'id': next_id,
                'customer_id': int(data.get('customer_id', 0)),
                'service_id': int(data.get('service_id', 0)),
                'scheduled_date': data.get('scheduled_date', ''),
                'scheduled_time': data.get('scheduled_time', ''),
                'address_street': data.get('address_street', ''),
                'address_city': data.get('address_city', 'Dammam'),
                'address_lat': float(data['address_lat']) if data.get('address_lat') else None,
                'address_lng': float(data['address_lng']) if data.get('address_lng') else None,
                'notes': data.get('notes', ''),
                'status': data.get('status', 'pending'),
                'payment_status': data.get('payment_status', 'pending'),
                'total_price': str(data.get('total_price', '0')),
                'invoice_number': invoice_number,
                'technician_id': None,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            }
            db['bookings_booking'].insert_one(doc)
            return Response(_serialize(doc), status=201)
        except Exception as e:
            logger.exception('Admin booking create failed: %s', e)
            return Response({'error': str(e)}, status=500)


class AdminBookingDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, booking_id):
        try:
            db = _get_db()
            doc = db['bookings_booking'].find_one({'id': int(booking_id)})
            if not doc:
                return Response({'error': 'Not found'}, status=404)
            return Response(_serialize(doc))
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def put(self, request, booking_id):
        try:
            db = _get_db()
            data = request.data
            update = {
                'status': data.get('status'),
                'payment_status': data.get('payment_status'),
                'scheduled_date': data.get('scheduled_date'),
                'scheduled_time': data.get('scheduled_time'),
                'address_street': data.get('address_street'),
                'address_city': data.get('address_city'),
                'notes': data.get('notes'),
                'total_price': str(data.get('total_price', '0')),
                'updated_at': datetime.utcnow(),
            }
            # Remove None values
            update = {k: v for k, v in update.items() if v is not None}
            db['bookings_booking'].update_one({'id': int(booking_id)}, {'$set': update})
            doc = db['bookings_booking'].find_one({'id': int(booking_id)})
            return Response(_serialize(doc))
        except Exception as e:
            logger.exception('Admin booking update failed: %s', e)
            return Response({'error': str(e)}, status=500)

    def delete(self, request, booking_id):
        try:
            db = _get_db()
            result = db['bookings_booking'].delete_one({'id': int(booking_id)})
            if result.deleted_count == 0:
                return Response({'error': 'Not found'}, status=404)
            return Response({'success': True})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


# ===========================================================================
# SERVICES ADMIN CRUD
# ===========================================================================

class AdminServicesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            db = _get_db()
            docs = list(db['bookings_service'].find().sort('id', 1))
            return Response([_serialize(d) for d in docs])
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def post(self, request):
        try:
            db = _get_db()
            data = request.data
            counter = db['bookings_service'].find_one(sort=[('id', -1)])
            next_id = (counter.get('id') or 0 if counter else 0) + 1
            doc = {
                'id': next_id,
                'name_ar': data.get('name_ar', ''),
                'name_en': data.get('name_en', ''),
                'description_ar': data.get('description_ar', ''),
                'description_en': data.get('description_en', ''),
                'category': data.get('category', 'ac'),
                'base_price': str(data.get('base_price', '0')),
                'duration_hours': float(data.get('duration_hours', 1)),
                'is_active': bool(data.get('is_active', True)),
                'created_at': datetime.utcnow(),
            }
            db['bookings_service'].insert_one(doc)
            return Response(_serialize(doc), status=201)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class AdminServiceDetailView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, service_id):
        try:
            db = _get_db()
            data = request.data
            update = {k: v for k, v in {
                'name_ar': data.get('name_ar'),
                'name_en': data.get('name_en'),
                'description_ar': data.get('description_ar'),
                'description_en': data.get('description_en'),
                'category': data.get('category'),
                'base_price': str(data.get('base_price', '0')),
                'duration_hours': float(data.get('duration_hours', 1)) if data.get('duration_hours') else None,
                'is_active': data.get('is_active'),
            }.items() if v is not None}
            db['bookings_service'].update_one({'id': int(service_id)}, {'$set': update})
            doc = db['bookings_service'].find_one({'id': int(service_id)})
            return Response(_serialize(doc))
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def delete(self, request, service_id):
        try:
            db = _get_db()
            db['bookings_service'].delete_one({'id': int(service_id)})
            return Response({'success': True})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


# ===========================================================================
# USERS ADMIN CRUD
# ===========================================================================

class AdminUsersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            db = _get_db()
            page = int(request.query_params.get('page', 1))
            per_page = int(request.query_params.get('per_page', 20))
            search = request.query_params.get('search', '').strip()
            query = {}
            if search:
                query['$or'] = [
                    {'username': {'$regex': search, '$options': 'i'}},
                    {'first_name': {'$regex': search, '$options': 'i'}},
                    {'phone': {'$regex': search, '$options': 'i'}},
                    {'email': {'$regex': search, '$options': 'i'}},
                ]
            total = db['core_user'].count_documents(query)
            docs = list(
                db['core_user']
                .find(query, {'password': 0})  # Never return password hashes
                .sort('date_joined', -1)
                .skip((page - 1) * per_page)
                .limit(per_page)
            )
            return Response({'total': total, 'page': page, 'per_page': per_page, 'results': [_serialize(d) for d in docs]})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, user_id):
        try:
            db = _get_db()
            data = request.data
            update = {k: v for k, v in {
                'first_name': data.get('first_name'),
                'last_name': data.get('last_name'),
                'email': data.get('email'),
                'phone': data.get('phone'),
                'whatsapp': data.get('whatsapp'),
                'role': data.get('role'),
                'is_active': data.get('is_active'),
            }.items() if v is not None}
            db['core_user'].update_one({'id': int(user_id)}, {'$set': update})
            doc = db['core_user'].find_one({'id': int(user_id)}, {'password': 0})
            return Response(_serialize(doc))
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def delete(self, request, user_id):
        try:
            db = _get_db()
            db['core_user'].delete_one({'id': int(user_id)})
            return Response({'success': True})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


# ===========================================================================
# DASHBOARD STATS
# ===========================================================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_stats(request):
    """Return summary stats for the admin dashboard."""
    try:
        db = _get_db()
        bookings_total = db['bookings_booking'].count_documents({})
        bookings_pending = db['bookings_booking'].count_documents({'status': 'pending'})
        bookings_confirmed = db['bookings_booking'].count_documents({'status': 'confirmed'})
        bookings_completed = db['bookings_booking'].count_documents({'status': 'completed'})
        users_total = db['core_user'].count_documents({})
        services_total = db['bookings_service'].count_documents({})
        services_active = db['bookings_service'].count_documents({'is_active': True})

        # Recent bookings
        recent = list(db['bookings_booking'].find().sort('created_at', -1).limit(5))

        return Response({
            'bookings': {
                'total': bookings_total,
                'pending': bookings_pending,
                'confirmed': bookings_confirmed,
                'completed': bookings_completed,
            },
            'users': {'total': users_total},
            'services': {'total': services_total, 'active': services_active},
            'recent_bookings': [_serialize(d) for d in recent],
        })
    except Exception as e:
        logger.exception('Admin stats failed: %s', e)
        return Response({'error': str(e)}, status=500)
