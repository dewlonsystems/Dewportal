"""
Custom management command to create a super admin user.
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from core.utils import generate_temporary_password
import sys

User = get_user_model()


class Command(BaseCommand):
    help = 'Create a super admin user'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Username for the admin user'
        )
        parser.add_argument(
            '--email',
            type=str,
            help='Email for the admin user'
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Password for the admin user (optional, will generate if not provided)'
        )

    def handle(self, *args, **options):
        username = options.get('username')
        email = options.get('email')
        password = options.get('password')

        # Interactive mode if arguments not provided
        if not username:
            username = input('Username: ')
        if not email:
            email = input('Email: ')
        if not password:
            password = generate_temporary_password()
            self.stdout.write(self.style.WARNING(f'Generated temporary password: {password}'))

        # Check if user already exists
        if User.objects.filter(username=username).exists():
            raise CommandError(f'User "{username}" already exists')

        if User.objects.filter(email=email).exists():
            raise CommandError(f'User with email "{email}" already exists')

        # Create super admin
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            first_name='Super',
            last_name='Admin'
        )

        self.stdout.write(self.style.SUCCESS(f'Super admin "{username}" created successfully!'))
        self.stdout.write(self.style.WARNING(f'Temporary password: {password}'))
        self.stdout.write(self.style.WARNING('Please change this password on first login!'))