import secrets
import string
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone


logger = logging.getLogger('core')


def generate_secure_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure random token.
    
    Args:
        length: Length of the token in characters (default: 32)
    
    Returns:
        Secure random token string
    """
    return secrets.token_urlsafe(length)


def generate_temporary_password(length: int = 12) -> str:
    """
    Generate a temporary password that meets security requirements.
    Password contains: uppercase, lowercase, digits, and special characters.
    
    Args:
        length: Length of the password (default: 12, minimum: 8)
    
    Returns:
        Temporary password string
    """
    length = max(length, 8)
    
    # Ensure at least one of each required character type
    uppercase = secrets.choice(string.ascii_uppercase)
    lowercase = secrets.choice(string.ascii_lowercase)
    digit = secrets.choice(string.digits)
    special = secrets.choice('!@#$%^&*()_+-=[]{}|;:,.<>?')
    
    # Fill the rest with random characters from all types
    all_chars = string.ascii_letters + string.digits + '!@#$%^&*()_+-=[]{}|;:,.<>?'
    remaining_length = length - 4
    remaining = ''.join(secrets.choice(all_chars) for _ in range(remaining_length))
    
    # Combine and shuffle
    password_list = list(uppercase + lowercase + digit + special + remaining)
    secrets.SystemRandom().shuffle(password_list)
    
    return ''.join(password_list)


def generate_transaction_reference() -> str:
    """
    Generate a unique transaction reference code.
    Format: DP followed by 8 alphanumeric characters (e.g., DP5TG20VG1)
    
    Returns:
        Transaction reference string
    """
    chars = string.ascii_uppercase + string.digits
    random_part = ''.join(secrets.choice(chars) for _ in range(8))
    return f"DP{random_part}"


def hash_sensitive_data(data: str, salt: Optional[str] = None) -> str:
    """
    Hash sensitive data for secure storage or logging.
    
    Args:
        data: The sensitive data to hash
        salt: Optional salt for additional security
    
    Returns:
        SHA-256 hash of the data
    """
    salted_data = f"{data}{salt or settings.SECRET_KEY}"
    return hashlib.sha256(salted_data.encode()).hexdigest()


def get_cache_key(prefix: str, identifier: str) -> str:
    """
    Generate a consistent cache key with prefix.
    
    Args:
        prefix: Cache key prefix (e.g., 'user', 'transaction')
        identifier: Unique identifier for the cached item
    
    Returns:
        Formatted cache key string
    """
    return f"dewportal:{prefix}:{identifier}"


def cache_with_timeout(key: str, value, timeout: int = 300) -> bool:
    """
    Store a value in cache with a timeout.
    
    Args:
        key: Cache key
        value: Value to cache
        timeout: Cache timeout in seconds (default: 300)
    
    Returns:
        True if successful, False otherwise
    """
    try:
        cache.set(key, value, timeout)
        return True
    except Exception as e:
        logger.error(f"Cache set failed for key {key}: {str(e)}")
        return False


def get_from_cache(key: str, default=None):
    """
    Retrieve a value from cache.
    
    Args:
        key: Cache key
        default: Default value if key not found
    
    Returns:
        Cached value or default
    """
    try:
        return cache.get(key, default)
    except Exception as e:
        logger.error(f"Cache get failed for key {key}: {str(e)}")
        return default


def invalidate_cache_pattern(pattern: str) -> int:
    """
    Invalidate all cache keys matching a pattern.
    Note: This requires Redis and may be slow for large datasets.
    
    Args:
        pattern: Cache key pattern (e.g., 'dewportal:user:*')
    
    Returns:
        Number of keys deleted
    """
    try:
        from django.core.cache import caches
        redis_cache = caches['default']
        # Note: This is Redis-specific and may need adjustment for other backends
        keys = redis_cache.keys(pattern)
        if keys:
            return redis_cache.delete_many(*keys)
        return 0
    except Exception as e:
        logger.error(f"Cache invalidation failed for pattern {pattern}: {str(e)}")
        return 0


def is_within_business_hours() -> bool:
    """
    Check if current time is within business hours in Nairobi timezone.
    Business hours: 8:00 AM - 6:00 PM EAT, Monday to Friday.
    
    Returns:
        True if within business hours, False otherwise
    """
    now = timezone.localtime(timezone.now())
    
    # Check if weekend
    if now.weekday() >= 5:  # Saturday = 5, Sunday = 6
        return False
    
    # Check if within business hours (8 AM - 6 PM)
    if 8 <= now.hour < 18:
        return True
    
    return False


def calculate_lockout_expiry(attempt_count: int) -> datetime:
    """
    Calculate when an account lockout should expire.
    
    Args:
        attempt_count: Number of failed login attempts
    
    Returns:
        Datetime when lockout expires
    """
    # After 3 failed attempts, lock for 3 hours
    if attempt_count >= 3:
        return timezone.now() + timedelta(hours=3)
    return timezone.now()


def sanitize_log_data(data: dict) -> dict:
    """
    Remove or mask sensitive data from logs.
    
    Args:
        data: Dictionary that may contain sensitive information
    
    Returns:
        Sanitized dictionary safe for logging
    """
    sensitive_keys = [
        'password', 'token', 'secret', 'key', 'authorization',
        'credit_card', 'cvv', 'pin', 'ssn'
    ]
    
    sanitized = data.copy()
    for key in sanitized:
        if any(sensitive in key.lower() for sensitive in sensitive_keys):
            sanitized[key] = '***REDACTED***'
    return sanitized