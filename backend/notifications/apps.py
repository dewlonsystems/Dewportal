from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'
    verbose_name = 'Real-Time Notifications'

    def ready(self):
        """
        Called when Django starts. Connect signals for notification events.
        """
        import notifications.signals  # noqa: F401