from django.contrib import admin
from django.urls import path, include

admin.site.site_header = 'التكيف التبريد | A/C & Refrigeration'
admin.site.site_title = 'Admin'
admin.site.index_title = 'Dashboard'

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('core.urls')),
    path('api/', include('config.api_urls')),
]
