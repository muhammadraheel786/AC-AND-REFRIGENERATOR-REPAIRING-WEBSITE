from django.contrib import admin
from django.contrib.admin import AdminSite
from django.urls import path, include
from django.http import JsonResponse, HttpResponse
from django.conf import settings
from django.utils.safestring import mark_safe


class SafeAdminSite(AdminSite):
    """
    Django Admin subclass that catches Djongo/MongoDB ORM errors on the dashboard
    and renders a safe fallback page instead of a 500 crash.
    """
    def index(self, request, extra_context=None):
        try:
            return super().index(request, extra_context)
        except Exception as e:
            # Djongo crashed during ORM query - show a safe static dashboard
            return self._safe_dashboard(request, str(e))

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


urlpatterns = [
    path('', api_root_view, name='api-root'),
    path('admin/', safe_admin.urls),
    path('api/auth/', include('core.urls')),
    path('api/', include('config.api_urls')),
]
