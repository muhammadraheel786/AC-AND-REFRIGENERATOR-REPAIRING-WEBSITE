from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings

admin.site.site_header = 'التكيف التبريد | A/C & Refrigeration'
admin.site.site_title = 'Admin'
admin.site.index_title = 'Dashboard'


def api_root_view(request):
    """Root endpoint - returns API information"""
    return JsonResponse({
        'message': 'AC & Refrigeration API',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
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
    path('admin/', admin.site.urls),
    path('api/auth/', include('core.urls')),
    path('api/', include('config.api_urls')),
]
