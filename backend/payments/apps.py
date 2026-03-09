from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'payments'
    verbose_name = 'Payment Processing'

    def ready(self):
        """
        Called when Django starts. Connect signals for payment events.
        """
        import payments.signals  # noqa: F401