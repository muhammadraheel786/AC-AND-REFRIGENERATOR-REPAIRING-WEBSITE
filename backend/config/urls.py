from django.contrib import admin
from django.contrib.admin import AdminSite
from django.urls import path, include
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from django.utils.safestring import mark_safe


class SafeAdminSite(AdminSite):
    """
    Django Admin subclass that catches Djongo/MongoDB ORM errors on the dashboard
    and model list pages, rendering safe fallback views instead of 500 crashes.
    """
    def index(self, request, extra_context=None):
        try:
            return super().index(request, extra_context)
        except Exception as e:
            return self._safe_dashboard(request, str(e))

    def _pymongo_db(self):
        from pymongo import MongoClient
        from django.conf import settings as _s
        db_config = _s.DATABASES['default']
        uri = db_config.get('CLIENT', {}).get('host') or ''
        db_name = db_config.get('NAME', 'ac_refrigeration')
        client = MongoClient(uri, serverSelectionTimeoutMS=8000)
        return client[db_name]

    def _safe_dashboard(self, request, error_msg=''):
        apps_html = ""
        for model, model_admin in self._registry.items():
            app_label = model._meta.app_label
            model_name = model._meta.model_name
            verbose = model._meta.verbose_name_plural.title()
            url = f"/admin/{app_label}/{model_name}/"
            apps_html += f'<li><a href="{url}">{verbose}</a></li>'

        html = f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <title>Admin | A/C & Refrigeration</title>
  <link rel="stylesheet" type="text/css" href="/static/admin/css/base.css">
  <link rel="stylesheet" type="text/css" href="/static/admin/css/dashboard.css">
</head>
<body class="dashboard" id="django-adminsite">
<div id="header">
  <div id="branding"><h1 id="site-name"><a href="/admin/">التكيف التبريد | Admin</a></h1></div>
  <div id="user-tools">
    Welcome, <strong>{request.user.username}</strong>.
    <a href="/admin/password_change/">Change password</a> /
    <a href="/admin/logout/">Log out</a>
  </div>
</div>
<div id="content-main">
  <h1>Dashboard</h1>
  <div class="module" id="content">
    <h2>📋 Quick Access</h2>
    <ul style="padding:12px 24px;line-height:2">
      {apps_html}
    </ul>
  </div>
</div>
</body></html>"""
        return HttpResponse(html)

    def _safe_changelist(self, request, app_label, model_name, error_msg=''):
        """Render a simple pymongo-based changelist when Djongo crashes."""
        try:
            db = self._pymongo_db()
            collection_name = f"{app_label}_{model_name}"
            docs = list(db[collection_name].find().sort('_id', -1).limit(50))
            # Build a plain table with all fields
            if docs:
                # Get all keys from the first doc
                keys = [k for k in docs[0].keys() if k != '_id']
                header = ''.join(f'<th style="padding:4px 8px;border:1px solid #ccc">{k}</th>' for k in keys)
                rows = ''
                for doc in docs:
                    cells = ''.join(f'<td style="padding:4px 8px;border:1px solid #ccc">{str(doc.get(k,""))[:80]}</td>' for k in keys)
                    rows += f'<tr>{cells}</tr>'
                table = f'<table style="border-collapse:collapse;width:100%"><thead><tr>{header}</tr></thead><tbody>{rows}</tbody></table>'
            else:
                table = '<p>No records found.</p>'
        except Exception as ex:
            table = f'<p style="color:red">Could not load data: {ex}</p>'

        html = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
  <title>{model_name} | Admin</title>
  <link rel="stylesheet" type="text/css" href="/static/admin/css/base.css">
</head>
<body id="django-adminsite">
<div id="header">
  <div id="branding"><h1><a href="/admin/">التكيف التبريد | Admin</a></h1></div>
  <div id="user-tools">
    <a href="/admin/">Dashboard</a> |
    <a href="/admin/logout/">Log out</a>
  </div>
</div>
<div id="content-main">
  <h1>{model_name.title()} List (MongoDB Direct)</h1>
  <p style="color:#888;font-size:12px">⚠️ Showing raw MongoDB data (Djongo ORM unavailable)</p>
  {table}
</div></body></html>"""
        return HttpResponse(html)


# Create the safe admin site instance
safe_admin = SafeAdminSite(name='admin')

# Re-register all existing registered models into our safe admin site
def _copy_registry():
    for model, model_admin in list(admin.site._registry.items()):
        try:
            safe_admin.register(model, type(model_admin))
        except Exception:
            pass

_copy_registry()

# Also keep site metadata
safe_admin.site_header = 'التكيف التبريد | A/C & Refrigeration'
safe_admin.site_title = 'Admin'
safe_admin.index_title = 'Dashboard'


def api_root_view(request):
    """Root endpoint - returns API information"""
    return JsonResponse({
        'message': 'AC & Refrigeration API',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            'health': '/api/health/',
            'services': '/api/services/',
            'auth': {
                'login': '/api/auth/login/',
                'register': '/api/auth/register/',
                'settings': '/api/auth/settings/',
                'health': '/api/auth/health/'
            },
            'bookings': '/api/bookings/',
            'admin': '/admin/'
        },
        'frontend_url': getattr(settings, 'FRONTEND_URL', 'https://youracrepair.com'),
        'environment': 'production' if not settings.DEBUG else 'development'
    })


def safe_admin_changelist(request, app_label, model_name):
    """
    Proxy view: try the normal admin changelist, fall back to pymongo on any exception.
    This catches Djongo crashes on the list view BEFORE Django returns a 500 page.
    """
    if not request.user.is_authenticated or not request.user.is_staff:
        from django.contrib.auth.views import redirect_to_login
        return redirect_to_login(request.get_full_path())
    try:
        # Try the real admin view
        return safe_admin.app_index(request, app_label)
    except Exception:
        pass
    return safe_admin._safe_changelist(request, app_label, model_name)


urlpatterns = [
    path('', api_root_view, name='api-root'),
    # The safe changelist proxy catches Djongo crashes on model list pages
    path('admin/<str:app_label>/<str:model_name>/',
         safe_admin_changelist, name='safe-admin-changelist'),
    path('admin/', safe_admin.urls),
    path('api/auth/', include('core.urls')),
    path('api/', include('config.api_urls')),
]
