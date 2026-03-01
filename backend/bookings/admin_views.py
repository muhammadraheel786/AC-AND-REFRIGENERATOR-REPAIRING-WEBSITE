"""
Admin API Views — built entirely on PyMongo, bypasses Djongo ORM.
Provides full CRUD for Bookings, Services, Users, Payments, Notifications, Settings.
"""
import logging
from datetime import datetime, date
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes

logger = logging.getLogger(__name__)


def _get_db():
    from pymongo import MongoClient
    db_config = settings.DATABASES['default']
    uri = db_config.get('CLIENT', {}).get('host') or ''
    db_name = db_config.get('NAME', 'ac_refrigeration')
    client = MongoClient(uri, serverSelectionTimeoutMS=10000)
    return client[db_name]


def _serial(doc):
    """Make MongoDB doc JSON-safe."""
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if k == '_id':
            continue
        if isinstance(v, (datetime, date)):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def _notnone(d: dict) -> dict:
    """Filter dict keeping keys whose value is not None (but keeps False/0/'')."""
    return {k: v for k, v in d.items() if v is not None}


# ─── Permission ───────────────────────────────────────────────────────────────
class IsAdminUser(permissions.BasePermission):
    """
    Decodes JWT and checks MongoDB directly — never touches Djongo ORM.
    Grants access if user has is_staff=True OR role='admin'.
    """
    def has_permission(self, request, view):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return False
        token = auth.split(' ', 1)[1]
        try:
            import jwt
            decoded = jwt.decode(token, options={"verify_signature": False})
            user_id = decoded.get('user_id') or decoded.get('id')
            if not user_id:
                return False
            db = _get_db()
            user = db['core_user'].find_one({'id': int(user_id)})
            if not user:
                return False
            return bool(user.get('is_staff') or user.get('role') == 'admin')
        except Exception as e:
            logger.warning('Admin permission check error: %s', e)
            return False


# ─── Helper: resolve service + customer names ─────────────────────────────────
def _enrich_bookings(db, docs):
    service_ids = list({d.get('service_id') for d in docs if d.get('service_id')})
    customer_ids = list({d.get('customer_id') for d in docs if d.get('customer_id')})

    svc_map = {}
    for s in db['bookings_service'].find({'id': {'$in': service_ids}}):
        svc_map[s['id']] = s.get('name_en') or s.get('name_ar') or '—'

    cust_map = {}
    for c in db['core_user'].find({'id': {'$in': customer_ids}}):
        name = (c.get('first_name', '') + ' ' + c.get('last_name', '')).strip()
        cust_map[c['id']] = {
            'name': name or c.get('username', 'Guest'),
            'phone': c.get('phone') or c.get('whatsapp') or '—',
        }

    results = []
    for doc in docs:
        row = _serial(doc)
        row['service_name'] = svc_map.get(doc.get('service_id'), '—')
        ci = cust_map.get(doc.get('customer_id'), {})
        row['customer_name'] = ci.get('name', '—')
        row['customer_phone'] = ci.get('phone', '—')
        results.append(row)
    return results


# ===========================================================================
# DASHBOARD STATS
# ===========================================================================
@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_stats(request):
    try:
        db = _get_db()
        bk = db['bookings_booking']
        recent_raw = list(bk.find().sort('created_at', -1).limit(8))
        recent = _enrich_bookings(db, recent_raw)

        # Revenue: sum total_price of paid bookings
        revenue = 0
        for doc in bk.find({'payment_status': 'paid'}, {'total_price': 1}):
            try:
                revenue += float(doc.get('total_price') or 0)
            except Exception:
                pass

        return Response({
            'bookings': {
                'total':     bk.count_documents({}),
                'pending':   bk.count_documents({'status': 'pending'}),
                'confirmed': bk.count_documents({'status': 'confirmed'}),
                'in_progress': bk.count_documents({'status': 'in_progress'}),
                'completed': bk.count_documents({'status': 'completed'}),
                'cancelled': bk.count_documents({'status': 'cancelled'}),
            },
            'users': {'total': db['core_user'].count_documents({})},
            'services': {
                'total':  db['bookings_service'].count_documents({}),
                'active': db['bookings_service'].count_documents({'is_active': True}),
            },
            'payments': {
                'total':   db['payments_payment'].count_documents({}),
                'paid':    db['payments_payment'].count_documents({'status': 'paid'}),
                'pending': db['payments_payment'].count_documents({'status': 'pending'}),
                'revenue': round(revenue, 2),
            },
            'notifications': {
                'total': db['notifications_notificationlog'].count_documents({}),
                'sent':  db['notifications_notificationlog'].count_documents({'status': 'sent'}),
            },
            'recent_bookings': recent,
        })
    except Exception as e:
        logger.exception('admin_stats error: %s', e)
        return Response({'error': str(e)}, status=500)


# ===========================================================================
# BOOKINGS CRUD
# ===========================================================================
class AdminBookingsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            db = _get_db()
            page = int(request.query_params.get('page', 1))
            per_page = int(request.query_params.get('per_page', 15))
            search = request.query_params.get('search', '').strip()
            status_filter = request.query_params.get('status', '').strip()
            pay_filter = request.query_params.get('payment', '').strip()

            q = {}
            if status_filter:
                q['status'] = status_filter
            if pay_filter:
                q['payment_status'] = pay_filter
            if search:
                q['$or'] = [
                    {'invoice_number': {'$regex': search, '$options': 'i'}},
                    {'address_street': {'$regex': search, '$options': 'i'}},
                    {'address_city': {'$regex': search, '$options': 'i'}},
                    {'customer_phone': {'$regex': search, '$options': 'i'}},
                    {'customer_name': {'$regex': search, '$options': 'i'}},
                ]

            total = db['bookings_booking'].count_documents(q)
            docs = list(
                db['bookings_booking']
                .find(q).sort('created_at', -1)
                .skip((page - 1) * per_page).limit(per_page)
            )
            return Response({'total': total, 'page': page, 'per_page': per_page,
                             'results': _enrich_bookings(db, docs)})
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def post(self, request):
        try:
            db = _get_db()
            data = request.data
            last = db['bookings_booking'].find_one(sort=[('id', -1)])
            next_id = ((last.get('id') or 0) if last else 0) + 1
            doc = {
                'id': next_id,
                'customer_id': int(data.get('customer_id', 0)),
                'service_id': int(data.get('service_id', 0)),
                'scheduled_date': data.get('scheduled_date', ''),
                'scheduled_time': data.get('scheduled_time', ''),
                'address_street': data.get('address_street', ''),
                'address_city': data.get('address_city', 'Dammam'),
                'notes': data.get('notes', ''),
                'status': data.get('status', 'pending'),
                'payment_status': data.get('payment_status', 'pending'),
                'total_price': str(data.get('total_price', '0')),
                'invoice_number': f'INV-{next_id:06d}',
                'technician_id': None,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            }
            db['bookings_booking'].insert_one(doc)
            return Response(_serial(doc), status=201)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class AdminBookingDetailView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, booking_id):
        try:
            db = _get_db()
            d = request.data
            update = _notnone({
                'status': d.get('status'),
                'payment_status': d.get('payment_status'),
                'scheduled_date': d.get('scheduled_date'),
                'scheduled_time': d.get('scheduled_time'),
                'address_street': d.get('address_street'),
                'address_city': d.get('address_city'),
                'notes': d.get('notes'),
                'total_price': str(d['total_price']) if d.get('total_price') is not None else None,
                'updated_at': datetime.utcnow(),
            })
            db['bookings_booking'].update_one({'id': int(booking_id)}, {'$set': update})
            doc = db['bookings_booking'].find_one({'id': int(booking_id)})
            return Response(_serial(doc))
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def delete(self, request, booking_id):
        try:
            db = _get_db()
            r = db['bookings_booking'].delete_one({'id': int(booking_id)})
            if r.deleted_count == 0:
                return Response({'error': 'Not found'}, status=404)
            return Response({'success': True})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


# ===========================================================================
# SERVICES CRUD
# ===========================================================================
class AdminServicesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            db = _get_db()
            docs = list(db['bookings_service'].find().sort('id', 1))
            return Response([_serial(d) for d in docs])
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    def post(self, request):
        try:
            db = _get_db()
            d = request.data
            last = db['bookings_service'].find_one(sort=[('id', -1)])
            next_id = ((last.get('id') or 0) if last else 0) + 1
            doc = {
                'id': next_id,
                'name_ar': d.get('name_ar', ''),
                'name_en': d.get('name_en', ''),
                'description_ar': d.get('description_ar', ''),
                'description_en': d.get('description_en', ''),
                'category': d.get('category', 'ac'),
                'base_price': str(d.get('base_price', '0')),
                'duration_hours': float(d.get('duration_hours', 1)),
                'is_active': bool(d.get('is_active', True)),
                'created_at': datetime.utcnow(),
            }
            db['bookings_service'].insert_one(doc)
            return Response(_serial(doc), status=201)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class AdminServiceDetailView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, service_id):
        try:
            db = _get_db()
            d = request.data
            # Build update manually — must keep False for is_active
            update = {'updated_at': datetime.utcnow()}
            for field in ['name_ar', 'name_en', 'description_ar', 'description_en', 'category']:
                if d.get(field) is not None:
                    update[field] = d[field]
            if d.get('base_price') is not None:
                update['base_price'] = str(d['base_price'])
            if d.get('duration_hours') is not None:
                update['duration_hours'] = float(d['duration_hours'])
            # is_active can be False — check key presence not truthiness
            if 'is_active' in d:
                update['is_active'] = bool(d['is_active'])

            db['bookings_service'].update_one({'id': int(service_id)}, {'$set': update})
            doc = db['bookings_service'].find_one({'id': int(service_id)})
            return Response(_serial(doc))
        except Exception as e:
            logger.exception('service update error: %s', e)
            return Response({'error': str(e)}, status=500)

    def delete(self, request, service_id):
        try:
            db = _get_db()
            db['bookings_service'].delete_one({'id': int(service_id)})
            return Response({'success': True})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


# ===========================================================================
# USERS CRUD
# ===========================================================================
class AdminUsersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            db = _get_db()
            page = int(request.query_params.get('page', 1))
            per_page = int(request.query_params.get('per_page', 15))
            search = request.query_params.get('search', '').strip()
            q = {}
            if search:
                q['$or'] = [
                    {'username': {'$regex': search, '$options': 'i'}},
                    {'first_name': {'$regex': search, '$options': 'i'}},
                    {'last_name': {'$regex': search, '$options': 'i'}},
                    {'phone': {'$regex': search, '$options': 'i'}},
                    {'email': {'$regex': search, '$options': 'i'}},
                ]
            total = db['core_user'].count_documents(q)
            docs = list(
                db['core_user'].find(q, {'password': 0})
                .sort('date_joined', -1)
                .skip((page - 1) * per_page).limit(per_page)
            )
            return Response({'total': total, 'page': page, 'per_page': per_page,
                             'results': [_serial(d) for d in docs]})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request, user_id):
        try:
            db = _get_db()
            d = request.data
            update = _notnone({
                'first_name': d.get('first_name'),
                'last_name': d.get('last_name'),
                'email': d.get('email'),
                'phone': d.get('phone'),
                'role': d.get('role'),
            })
            # is_active can be False
            if 'is_active' in d:
                update['is_active'] = bool(d['is_active'])
            db['core_user'].update_one({'id': int(user_id)}, {'$set': update})
            doc = db['core_user'].find_one({'id': int(user_id)}, {'password': 0})
            return Response(_serial(doc))
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
# PAYMENTS (read-only list + detail)
# ===========================================================================
class AdminPaymentsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            db = _get_db()
            page = int(request.query_params.get('page', 1))
            per_page = int(request.query_params.get('per_page', 15))
            status_filter = request.query_params.get('status', '').strip()
            q = {}
            if status_filter:
                q['status'] = status_filter
            total = db['payments_payment'].count_documents(q)
            docs = list(
                db['payments_payment'].find(q)
                .sort('created_at', -1)
                .skip((page - 1) * per_page).limit(per_page)
            )
            return Response({'total': total, 'page': page, 'per_page': per_page,
                             'results': [_serial(d) for d in docs]})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


# ===========================================================================
# NOTIFICATIONS (read-only log)
# ===========================================================================
class AdminNotificationsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            db = _get_db()
            page = int(request.query_params.get('page', 1))
            per_page = int(request.query_params.get('per_page', 20))
            q = {}
            ch = request.query_params.get('channel', '').strip()
            if ch:
                q['channel'] = ch
            total = db['notifications_notificationlog'].count_documents(q)
            docs = list(
                db['notifications_notificationlog'].find(q)
                .sort('created_at', -1)
                .skip((page - 1) * per_page).limit(per_page)
            )
            return Response({'total': total, 'page': page, 'per_page': per_page,
                             'results': [_serial(d) for d in docs]})
        except Exception as e:
            return Response({'error': str(e)}, status=500)


# ===========================================================================
# SITE SETTINGS (read + update)
# ===========================================================================
@api_view(['GET', 'PUT'])
@permission_classes([IsAdminUser])
def admin_settings(request):
    try:
        db = _get_db()
        col = db['core_sitesettings']
        doc = col.find_one() or {}

        if request.method == 'GET':
            return Response(_serial(doc) or {})

        # PUT — update/create
        d = request.data
        fields = [
            'company_name_ar', 'company_name_en',
            'phone', 'whatsapp', 'email',
            'address_ar', 'address_en',
            'footer_text_ar', 'footer_text_en',
            'facebook_url', 'instagram_url', 'twitter_url',
            'about_ar', 'about_en',
        ]
        update = {f: d[f] for f in fields if f in d}
        if doc:
            col.update_one({'_id': doc['_id']}, {'$set': update})
        else:
            col.insert_one(update)
        updated = col.find_one()
        return Response(_serial(updated))
    except Exception as e:
        logger.exception('admin_settings error: %s', e)
        return Response({'error': str(e)}, status=500)
