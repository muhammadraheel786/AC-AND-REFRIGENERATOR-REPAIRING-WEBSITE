"""
Django settings for التكيف التبريد (AC & Refrigeration) - Dammam, Saudi Arabia
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# REMOVE DATABASE ENVIRONMENT VARIABLES FIRST - before any other code
os.environ.pop('DATABASE_URL', None)
os.environ.pop('SUPABASE_DB_HOST', None)
os.environ.pop('SUPABASE_DB_NAME', None)
os.environ.pop('SUPABASE_DB_USER', None)
os.environ.pop('SUPABASE_DB_PASSWORD', None)
os.environ.pop('SUPABASE_DB_PORT', None)
os.environ.pop('SUPABASE_POOLER_HOST', None)
os.environ.pop('PG_HOST', None)
os.environ.pop('PG_NAME', None)
os.environ.pop('PG_PASSWORD', None)
os.environ.pop('PG_PORT', None)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env
load_dotenv()

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'dev-secret-change-in-production')
DEBUG = os.getenv('DEBUG', 'False') == 'True'

# Production: Allow only specific hosts
if DEBUG:
    # Development hosts
    _default_hosts = 'localhost,127.0.0.1,localhost:3000,localhost:3001,localhost:8000'
else:
    # Production hosts
    _default_hosts = 'ac-and-refrigenerator-repairing-website.onrender.com'

ALLOWED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_HOSTS', _default_hosts).split(',') if h.strip()]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'django_filters',
    'core',
    'bookings',
    'payments',
    'notifications',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

# Database: MongoDB Atlas for production deployment
DATABASES = {
    'default': {
        'ENGINE': 'djongo',
        'NAME': 'ac_refrigeration',
        'ENFORCE_SCHEMA': True,
        'CLIENT': {
            'host': os.getenv('MONGODB_URI', 'mongodb+srv://acrepairing21:<acrepairing21>@cluster786.eu651.mongodb.net/?appName=Cluster786')
        }
    }
}

# Password hashing
AUTH_PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
]
AUTH_USER_MODEL = 'core.User'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'templates'],
    'APP_DIRS': True,
    'OPTIONS': {
        'context_processors': [
            'django.template.context_processors.debug',
            'django.template.context_processors.request',
            'django.contrib.auth.context_processors.auth',
            'django.contrib.messages.context_processors.messages',
        ],
    },
}]

# Internationalization - Arabic, English, Urdu
LANGUAGES = [
    ('ar', 'Arabic'),
    ('en', 'English'),
    ('ur', 'Urdu'),
]
LANGUAGE_CODE = 'ar'
TIME_ZONE = 'Asia/Riyadh'
USE_I18N = True
USE_TZ = True

# Static & Media
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',  # Allow public service list; auth required for bookings
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# CORS - Production Configuration
if DEBUG:
    # Development: Allow all origins
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOWED_ORIGINS = []
else:
    # Production: Allow only specific origins
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = [
        'https://youracrepair.com',
        'https://www.youracrepair.com',
    ]
    
    # Additional CORS settings for production
    CORS_ALLOW_CREDENTIALS = True
    CORS_ALLOW_HEADERS = [
        'accept',
        'accept-encoding',
        'authorization',
        'content-type',
        'dnt',
        'origin',
        'user-agent',
        'x-csrftoken',
        'x-requested-with',
    ]
    CORS_ALLOW_METHODS = [
        'DELETE',
        'GET',
        'OPTIONS',
        'PATCH',
        'POST',
        'PUT',
    ]

# Business Info (from invoice image)
COMPANY_NAME_AR = 'للتكييف والتبريد'
COMPANY_NAME_EN = 'A/C & Refrigeration'
COMPANY_PHONE = os.getenv('COMPANY_PHONE', '0582618038')
COMPANY_LOCATION = 'Al-Dieya - Dammam, Kingdom of Saudi Arabia'
COMPANY_LOCATION_AR = 'الصناعية - الدمام، المملكة العربية السعودية'

# Payment - PayTabs (Saudi: Mada, STC Pay, Cards) only
PAYTABS_PROFILE_ID = os.getenv('PAYTABS_PROFILE_ID', '')
PAYTABS_SERVER_KEY = os.getenv('PAYTABS_SERVER_KEY', '')
PAYTABS_CLIENT_KEY = os.getenv('PAYTABS_CLIENT_KEY', '')

# WhatsApp Business API
WHATSAPP_PHONE_ID = os.getenv('WHATSAPP_PHONE_ID', '')
WHATSAPP_ACCESS_TOKEN = os.getenv('WHATSAPP_ACCESS_TOKEN', '')

# SMS - Taqnyat / Unifonic (Saudi providers)
TAQNYAT_API_KEY = os.getenv('TAQNYAT_API_KEY', '')
TAQNYAT_SENDER = os.getenv('TAQNYAT_SENDER', 'ACRefrigeration')
UNIFONIC_APP_SID = os.getenv('UNIFONIC_APP_SID', '')

# Email
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('SMTP_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv('SMTP_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('SMTP_PASS', '')
DEFAULT_FROM_EMAIL = os.getenv('SMTP_FROM', 'noreply@ac-refrigeration.sa')

# Google Maps
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')

# Frontend URL (for payment redirect)
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://youracrepair.com')

# Production Security Settings
if not DEBUG:
    # HTTPS and security headers for production
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    X_FRAME_OPTIONS = 'DENY'
    
    # Session and CSRF security
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    CSRF_COOKIE_HTTPONLY = True
    
    # Update CSRF trusted origins for production
    CSRF_TRUSTED_ORIGINS = [
        'https://youracrepair.com',
        'https://www.youracrepair.com',
    ]
else:
    # Development settings
    CSRF_TRUSTED_ORIGINS = [
        'http://localhost:3000',
        'http://localhost:3001',
    ]

# Production security (when DEBUG=False)
if not DEBUG:
    if SECRET_KEY == 'dev-secret-change-in-production':
        raise ValueError('DJANGO_SECRET_KEY must be set in production')
    SESSION_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_SAMESITE = 'Lax'
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    _csrf_origins = [o.strip() for o in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') if o.strip()]
    CSRF_TRUSTED_ORIGINS = _csrf_origins or [FRONTEND_URL]
    
    # HSTS (HTTP Strict Transport Security)
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000'))  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv('SECURE_HSTS_INCLUDE_SUBDOMAINS', 'True') == 'True'
    SECURE_HSTS_PRELOAD = os.getenv('SECURE_HSTS_PRELOAD', 'True') == 'True'
    
    # Additional security headers
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
    X_CONTENT_TYPE_OPTIONS = 'nosniff'
