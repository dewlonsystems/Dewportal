from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    verbose_name = 'Core System'

    def ready(self):
        """
        Called when Django starts. Use this for startup checks or signal connections.
        """
        import core.signals  # noqa: F401