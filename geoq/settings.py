# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import os

#DJANGO_ROOT = os.path.dirname(os.path.realpath(django.__file__))
SITE_ROOT = os.path.dirname(os.path.realpath(__file__))


DEBUG = True
TEMPLATE_DEBUG = True

ADMINS = (
    ('Admin User', 'admin@domain.com'),
)

MANAGERS = ADMINS

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',  # Add 'postgresql_psycopg2', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': 'geoq',  # Or path to database file if using sqlite3.
        # The following settings are not used with sqlite3:
        'USER': 'geoq',
        'PASSWORD': 'geoq',
        'HOST': 'localhost',  # Empty for localhost through domain sockets or '127.0.0.1' for localhost through TCP.
        'PORT': '5432',  # Set to empty string for default.
    }
}

AUTH_PROFILE_MODULE = 'accounts.UserProfile'

# Use this to change the base bootstrap library
#BOOTSTRAP_BASE_URL = None

# Hosts/domain names that are valid for this site; required if DEBUG is False
# See https://docs.djangoproject.com/en/1.5/ref/settings/#allowed-hosts
ALLOWED_HOSTS = []

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'America/New_York'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/var/www/example.com/media/"
MEDIA_ROOT = '/opt/src/pyenv/geoq/geoq-django'

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://example.com/media/", "http://media.example.com/"
MEDIA_URL = '/images/'

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/var/www/example.com/static/"
STATIC_URL_FOLDER = ''  # Can be set to something like 'geoq-test/' if the app is not run at root level
STATIC_ROOT = '{0}{1}'.format('/usr/src/static/', STATIC_URL_FOLDER)

# URL prefix for static files.
# Example: "http://example.com/static/", "http://static.example.com/"
STATIC_URL = '{0}{1}'.format('/static/', STATIC_URL_FOLDER)


# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(SITE_ROOT, 'static'),
    # TODO: Should we add this static location back in?
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    #'django.contrib.staticfiles.finders.DefaultStorageFinder',
    'compressor.finders.CompressorFinder',
)
COMPRESS_ENABLED = True
COMPRESS_PRECOMPILERS = (
    ('text/less', 'lessc {infile} {outfile}'),
)


LEAFLET_CSS = [
    STATIC_URL + 'leaflet/leaflet-draw/leaflet.draw.css',
    os.path.join(STATIC_ROOT, '/static/leaflet/leaflet-draw/leaflet.draw.css')
    ]

LEAFLET_CONFIG = {
    'PLUGINS': {
        'draw': {
            'css': LEAFLET_CSS,
            'js': STATIC_URL + 'leaflet/leaflet-draw/leaflet.draw.js',
            'repo': 'https://github.com/Leaflet/Leaflet.draw'
        },
        'esri': {
            'css': [],
            'js': [STATIC_URL + 'leaflet/esri-leaflet-src.js'],
            'repo': 'https://github.com/Esri/esri-leaflet'
        },
        'esriCluster': {
            'css': [STATIC_URL + 'leaflet/MarkerCluster.css'],
            'js': [STATIC_URL + 'leaflet/ClusteredFeatureLayer.js', STATIC_URL + 'leaflet/leaflet.markercluster.js'],
            'repo': 'https://github.com/Esri/esri-leaflet'
        },
    }
}


# Make this unique, and don't share it with anybody.
SECRET_KEY = '2t=^l2e$e5!du$0^c@3&qk4h_*stwwgp#1o$*n7#eisc)^2(wk'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
    #'django.template.loaders.eggs.Loader',
)

TEMPLATE_CONTEXT_PROCESSORS = (
    'django.contrib.auth.context_processors.auth',
    'django.core.context_processors.request',
    'django.core.context_processors.static',
    'django.contrib.messages.context_processors.messages'
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # Uncomment the next line for simple clickjacking protection:
    #'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'geoq.core.middleware.UserPermsMiddleware',             # works w/ guardian
)

# auth setup
AUTHENTICATION_BACKENDS = (
    'userena.backends.UserenaAuthenticationBackend',
    'guardian.backends.ObjectPermissionBackend',
    'django.contrib.auth.backends.ModelBackend', # default
)

ANONYMOUS_USER_ID = -1
AUTH_PROFILE_MODULE = 'accounts.UserProfile'

LOGIN_REDIRECT_URL = '/geoq/'   #'/accounts/%(username)s/'
LOGIN_URL = '/accounts/signin/'
LOGOUT_URL = '/geoq'
EMAIL_BACKEND = 'django.core.mail.backends.dummy.EmailBackend'
USERENA_ACTIVATION_DAYS = 3
# /auth setup

ROOT_URLCONF = 'geoq.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'geoq.wsgi.application'

TEMPLATE_DIRS = (
    os.path.join(SITE_ROOT, 'templates'),
    SITE_ROOT,
)

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.gis',
    'django.contrib.humanize',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'django.contrib.humanize',

    'south',

    'compressor',
    'geoexplorer',
    'reversion',
    'guardian',
    'easy_thumbnails',
    'userena',
    'bootstrap_toolkit',
    'django_select2',
    'leaflet',
    'jsonfield',

    'geoq.accounts', # TODO:Accounts -- Figure out what we are doing
#    'geoq.badges', # TODO: Get Badges working, or incorportae with gamification service
    'geoq.core',
    'geoq.maps',
)

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        }
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        }
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
    }
}

# Set default login location
#LOGIN_REDIRECT_URL = '/'


# Override production settings with local settings if they exist
try:
    from local_settings import *

except ImportError, e:
    # local_settings does not exist
    pass
