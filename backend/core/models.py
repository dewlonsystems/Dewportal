import uuid
from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    """
    Abstract base model that provides self-updating created_at and updated_at fields.
    All models in the system should inherit from this for consistent timestamping.
    """
    created_at = models.DateTimeField(
        default=timezone.now,
        editable=False,
        db_index=True,
        help_text="Timestamp when the record was created."
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        db_index=True,
        help_text="Timestamp when the record was last updated."
    )

    class Meta:
        abstract = True
        ordering = ['-created_at']


class SoftDeleteModel(models.Model):
    """
    Abstract base model that provides soft delete functionality.
    Records are marked as deleted rather than being removed from the database.
    """
    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Soft delete flag. True means the record is logically deleted."
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Timestamp when the record was soft deleted."
    )

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """
        Override delete to perform soft delete instead of hard delete.
        """
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])
        return self


class UUIDModel(models.Model):
    """
    Abstract base model that provides a UUID primary key.
    Use this for models where predictable integer IDs are a security concern.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the record."
    )

    class Meta:
        abstract = True