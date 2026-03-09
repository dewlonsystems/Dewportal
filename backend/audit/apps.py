from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'audit'
    verbose_name = 'Audit & Compliance'

    def ready(self):
        """
        Called when Django starts. Connect signals for audit events.
        """
        import audit.signals  # noqa: F401