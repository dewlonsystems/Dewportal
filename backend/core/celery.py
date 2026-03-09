"""
Celery configuration for Dewlon Portal.

This module initializes the Celery application and loads tasks from all installed apps.
"""

import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Create Celery application
app = Celery('dewportal')

# Load configuration from Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()


# Configure Celery Beat schedules
app.conf.beat_schedule = {
    # Reactivate locked accounts every 15 minutes
    'reactivate-locked-accounts': {
        'task': 'authentication.tasks.reactivate_locked_accounts',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
        'options': {'queue': 'celery'}
    },
    
    # Clean up old WebSocket connections daily
    'cleanup-websocket-connections': {
        'task': 'notifications.tasks.cleanup_websocket_connections',
        'schedule': crontab(hour='2', minute='0'),  # Daily at 2 AM
        'options': {'queue': 'celery'}
    },
    
    # Clean up old notifications weekly
    'cleanup-old-notifications': {
        'task': 'notifications.tasks.cleanup_old_notifications',
        'schedule': crontab(hour='3', minute='0', day_of_week='0'),  # Weekly on Sunday at 3 AM
        'options': {'queue': 'celery'}
    },
    
    # Send daily summary emails to admins (optional)
    'send-daily-admin-summary': {
        'task': 'core.tasks.send_daily_admin_summary',
        'schedule': crontab(hour='8', minute='0'),  # Daily at 8 AM
        'options': {'queue': 'celery'}
    },
    
    # Verify pending Mpesa transactions every 5 minutes
    'verify-pending-mpesa-transactions': {
        'task': 'payments.tasks.verify_pending_mpesa_transactions',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
        'options': {'queue': 'celery'}
    },
}

# Celery task routing
app.conf.task_routes = {
    'authentication.tasks.*': {'queue': 'authentication'},
    'payments.tasks.*': {'queue': 'payments'},
    'notifications.tasks.*': {'queue': 'notifications'},
    'core.tasks.*': {'queue': 'core'},
}

# Task execution settings
app.conf.task_acks_late = True
app.conf.task_reject_on_worker_lost = True
app.conf.worker_prefetch_multiplier = 1
app.conf.worker_max_tasks_per_child = 1000


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """
    Debug task to verify Celery is working.
    """
    print(f'Request: {self.request!r}')
    return 'Celery is working!'