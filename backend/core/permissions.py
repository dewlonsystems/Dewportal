from rest_framework import permissions


class IsAdminUser(permissions.BasePermission):
    """
    Custom permission to allow only admin users to access certain views.
    """
    message = 'You do not have permission to perform this action. Admin access required.'

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsStaffOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow staff and admin users to access certain views.
    """
    message = 'You do not have permission to perform this action. Staff or admin access required.'

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['staff', 'admin']


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow only owners of an object or admins to access it.
    Requires the object to have a 'user' or 'owner' attribute.
    """
    message = 'You do not have permission to access this resource.'

    def has_object_permission(self, request, view, obj):
        # Admin can access everything
        if request.user.role == 'admin':
            return True

        # Check if user owns the object
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'owner'):
            return obj.owner == request.user

        return False


class ReadOnly(permissions.BasePermission):
    """
    Custom permission to allow read-only access to authenticated users.
    """
    message = 'You do not have permission to perform this action.'

    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS and request.user and request.user.is_authenticated


class IsM2MAuthenticated(permissions.BasePermission):
    """
    Custom permission to verify M2M authentication for internal system calls.
    Used for webhook callbacks and internal service communication.
    """
    message = 'M2M authentication required.'

    def has_permission(self, request, view):
        return hasattr(request, 'm2m_payload') and request.m2m_payload is not None