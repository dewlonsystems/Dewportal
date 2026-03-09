from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import CustomUser, PasswordResetRequest


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user data.
    Used for profile viewing and admin user management.
    """
    full_name = serializers.SerializerMethodField()
    is_locked = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'phone_number', 'role', 'is_active', 'is_locked', 'must_change_password',
            'last_seen', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'is_locked', 'must_change_password', 'last_seen',
            'created_at', 'updated_at'
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_is_locked(self, obj):
        return obj.is_locked


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new users (admin only).
    Generates temporary password and sends via email.
    """
    password = serializers.CharField(
        write_only=True,
        required=False,
        validators=[validate_password]
    )
    confirm_password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'first_name', 'last_name', 'phone_number',
            'role', 'password', 'confirm_password'
        ]

    def validate(self, attrs):
        if attrs.get('password') and attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password', None)

        user = CustomUser.objects.create_user(
            password=password,
            **validated_data
        )

        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user information.
    Admins can update any field, users can only update their profile.
    """
    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'phone_number', 'email']

    def update(self, instance, validated_data):
        # Admins can update role and is_active
        if self.context['request'].user.role == 'admin':
            admin_fields = ['role', 'is_active']
            for field in admin_fields:
                if field in validated_data:
                    instance.__dict__[field] = validated_data[field]

        return super().update(instance, validated_data)


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for password change.
    Enforces strong password requirements.
    """
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    confirm_new_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_new_password']:
            raise serializers.ValidationError({'confirm_new_password': 'Passwords do not match.'})

        if attrs['current_password'] == attrs['new_password']:
            raise serializers.ValidationError({'new_password': 'New password must be different from current password.'})

        return attrs


class PasswordResetRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for staff users to request password reset.
    """
    class Meta:
        model = PasswordResetRequest
        fields = ['id', 'reason', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['status'] = 'pending'
        return super().create(validated_data)


class PasswordResetRequestAdminSerializer(serializers.ModelSerializer):
    """
    Serializer for admins to view and action password reset requests.
    """
    user_details = UserSerializer(source='user', read_only=True)
    processed_by_details = UserSerializer(source='processed_by', read_only=True)

    class Meta:
        model = PasswordResetRequest
        fields = [
            'id', 'user', 'user_details', 'status', 'reason', 'admin_notes',
            'processed_by', 'processed_by_details', 'processed_at', 'created_at'
        ]
        read_only_fields = [
            'id', 'user', 'user_details', 'status', 'processed_by',
            'processed_by_details', 'processed_at', 'created_at'
        ]