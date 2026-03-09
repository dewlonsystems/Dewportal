from django.apps import AppConfig


class LedgerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ledger'
    verbose_name = 'Financial Ledger'

    def ready(self):
        """
        Called when Django starts. Connect signals for ledger events.
        """
        import ledger.signals  # noqa: F401