from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import CustomUser


@receiver(pre_save, sender=CustomUser)
def update_is_staff_on_role_change(sender, instance, **kwargs):
    """
    Automatically set is_staff based on role.
    Admins get is_staff=True, staff get is_staff=False.
    """
    if instance.role == 'admin':
        instance.is_staff = True
    else:
        instance.is_staff = False