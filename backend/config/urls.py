from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def health_check(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
        
    return JsonResponse({
        'status': 'healthy',
        'service': 'dewportal-backend',
        'version': '1.0.0'
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/v1/auth/', include('authentication.urls', namespace='auth')),
    path('api/v1/users/', include('users.urls', namespace='users')),
    path('api/v1/payments/', include('payments.urls', namespace='payments')),
    path('api/v1/ledger/', include('ledger.urls', namespace='ledger')),
    path('api/v1/logs/', include('audit.urls', namespace='logs')),
    path('api/v1/events/', include('notifications.urls', namespace='events')),
    path('api/v1/system/', include('core.urls', namespace='system')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)