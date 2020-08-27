# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import os

SITE_ROOT = os.path.dirname(os.path.realpath(__file__))

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.10/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'wp88fi$)5dbve^!(@-k2%5tqep+16uoz078h*sttghy2%uid7c'


# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# Hosts/domain names that are valid for this site; required if DEBUG is False
# See https://docs.djangoproject.com/en/1.5/ref/settings/#allowed-hosts
ALLOWED_HOSTS = ['localhost','127.0.0.1']

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
        'HOST': 'localhost',  # Empty for local through domain sockets or '127.0.0.1' for local through TCP.
        'PORT': '5432',  # Set to empty string for default.
    }
}



# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = 'America/New_York'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'


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
MEDIA_ROOT = '/usr/local/src/geoq'

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://example.com/media/", "http://media.example.com/"
MEDIA_URL = '/images/'

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/var/www/example.com/static/"
STATIC_URL_FOLDER = ''  # Can be set to something like 'geoq-test/' if the app is not run at root level
STATIC_ROOT = '{0}{1}'.format('/Users/srjones/www/static/', STATIC_URL_FOLDER)

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
#Change back to True after finishing development to verify it still works

COMPRESS_ENABLED = False
COMPRESS_PRECOMPILERS = (
    ('text/less', 'lessc {infile} {outfile}'),
)

LEAFLET_CSS = [
    STATIC_URL + 'leaflet/leaflet-draw/leaflet.draw.css',
    os.path.join(STATIC_ROOT, '/static/leaflet/leaflet-draw/leaflet.draw.css')
    ]

LEAFLET_CONFIG = {
    'RESET_VIEW' : False,
    'MAX_ZOOM' : 18,
    'PLUGINS': {
        'proj4js': {
            'css': [],
            'js': [STATIC_URL + 'leaflet/proj4-src.js', STATIC_URL + 'leaflet/proj4defs.js', STATIC_URL + 'leaflet/proj4leaflet.js'],
            'repo': 'https://github.com/proj4js'
        },
        'draw': {
            'css': LEAFLET_CSS,
            'js': STATIC_URL + 'leaflet/leaflet-draw/leaflet.draw-src.js',
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
        'MakiMarkers': {
            'css': [],
            'js': [STATIC_URL + 'leaflet/Leaflet.MakiMarkers.js'],
            'repo': 'https://github.com/jseppi/Leaflet.MakiMarkers'
        },
        'MediaQ': {
            'css': [],
            'js': [STATIC_URL + 'leaflet/Leaflet.MediaQ.js'],
            'repo': 'https://github.com/stephenrjones/Leaflet.MediaQ'
        },
        'AutoResizeSVG': {
            'css': [],
            'js': [STATIC_URL + 'leaflet/marker-resize-svg.js'],
            'repo': 'https://github.com/john-kilgo/L.Marker.AutoResizeSVG'
        },
        'NWSIcons': {
            'css': [],
            'js': [STATIC_URL + 'leaflet/nws-leaflet.js'],
            'repo': 'https://github.com/john-kilgo/L.Marker.NWS'
        },
        'OpenSensorHub': {
            'css': [],
            'js': [STATIC_URL + 'leaflet/Leaflet.SOS.min.js'],
            'repo': 'https://github.com/opensensorhub/osh-js'
        },
        'WCS': {
            'css': [],
            'js': [STATIC_URL + 'leaflet/NonTiledLayer.WCS.js'],
            'repo': 'https://github.com/stuartmatthews/Leaflet.NonTiledLayer.WCS'
        },
        'WMSHeader': {
            'css': [],
            'js': [STATIC_URL + 'leaflet/leaflet-plugins/layer/tile/leaflet-wms-header.js'],
            'repo': 'https://https://github.com/ticinum-aerospace/leaflet-wms-header'
        }
    }
}

# List of callables that know how to import templates from various sources
# Location of template files
#TEMPLATE_DIRS = (
#    os.path.join(SITE_ROOT, 'templates'),
#    SITE_ROOT,
#)
#.
#TEMPLATE_LOADERS = (
#    'django.template.loaders.filesystem.Loader',
#    'django.template.loaders.app_directories.Loader',
#    #'django.template.loaders.eggs.Loader',
#)
#
#TEMPLATE_CONTEXT_PROCESSORS = (
##    'django.contrib.auth.context_processors.auth',
#    'django.core.context_processors.request',
#    'django.core.context_processors.static',
#    'django.contrib.messages.context_processors.messages',
#    'geoq.core.contextprocessors.app_settings',
#)

TEMPLATES = [
{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [ os.path.join(SITE_ROOT, 'templates'),
                  SITE_ROOT ],
    'OPTIONS': {
        'loaders': [

                'django.template.loaders.filesystem.Loader',
                'django.template.loaders.app_directories.Loader',
                #'django.template.loaders.eggs.Loader'
            ],
        'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'geoq.core.contextprocessors.app_settings'
        ]
    }

}
]

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'django.contrib.gis',
    'django.contrib.humanize',

    'django_select2',
    'reversion',
    'easy_thumbnails',
    'userena',
    'guardian',
    'compressor',
    'geoexplorer',
    'bootstrap_toolkit',
    'leaflet',
    'jsonfield',
    'crispy_forms',
    'django_extensions',
    'debug_toolbar',
    #'httpproxy',
    'bootstrap3',
    #'feedgen',

    'geoq.feedback.apps.FeedbackConfig',
    'geoq.accounts.apps.AccountsConfig',
    'geoq.locations.apps.LocationsConfig',
    'geoq.mage.apps.MageConfig',
    'geoq.mgrs.apps.MgrsConfig',
    'geoq.proxy.apps.ProxyConfig',
    'geoq.training.apps.TrainingConfig',
    'geoq.core.apps.CoreConfig',
    'geoq.maps.apps.MapsConfig',
    'geoq.workflow.apps.WorkflowConfig',
    'geoq.ontology.apps.OntologyConfig'
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'debug_toolbar.middleware.DebugToolbarMiddleware'
]

# removed middleware
#     'geoq.core.middleware.UserPermsMiddleware',
#      'geoq.core.middleware.Http403Middleware',
#      'geoq.core.middleware.UpdateLastActivityMiddleware',

# auth setup
AUTHENTICATION_BACKENDS = (
    'userena.backends.UserenaAuthenticationBackend',
    'guardian.backends.ObjectPermissionBackend',
    'django.contrib.auth.backends.ModelBackend', # default
)



SITE_ID = 1

ANONYMOUS_USER_NAME = "ANONYMOUS_USER_NAME"
AUTH_PROFILE_MODULE = 'accounts.UserProfile'


LOGIN_REDIRECT_URL = '/accounts/%(username)s/' #'/geoq/'   #
LOGIN_URL = '/accounts/signin/'
LOGOUT_URL = '/geoq'
EMAIL_BACKEND = 'django.core.mail.backends.dummy.EmailBackend'
USERENA_ACTIVATION_DAYS = 3
USERENA_MUGSHOT_DEFAULT = 'identicon'
USERENA_HIDE_EMAIL = True
USERENA_HTML_EMAIL = False


ROOT_URLCONF = 'geoq.urls'

WSGI_APPLICATION = 'geoq.wsgi.application'


# Password validation
# https://docs.djangoproject.com/en/1.10/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING_CONFIG = None

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

# take out later
REST_FRAMEWORK = {
    'UNAUTHENTICATED_USER': None,
}

# Set default login location
#LOGIN_REDIRECT_URL = '/'

# Gamification variables
GAMIFICATION_SERVER = ''
GAMIFICATION_PROJECT = 'geoq'

#GeoServer
GEOSERVER_WFS_JOB_LAYER = None

# For Django Debug Toolbar - need to set this to resolve some errors
DEBUG_TOOLBAR_PATCH_SETTINGS = False

# Able to vary what we call workcells
GEOQ_LEXICON = {
    'WORKCELL_NAME': 'Target'
}

# Bootstrap variables to work with django-bootstrap-toolkit
# Comment these out to use cdnjs.cloudflare.com versions of Bootstrap
BOOTSTRAP_BASE_URL = STATIC_URL
BOOTSTRAP_JS_BASE_URL = BOOTSTRAP_BASE_URL + 'bootstrap/js/'
BOOTSTRAP_JS_URL =  BOOTSTRAP_JS_BASE_URL + 'bootstrap.min.js'
BOOTSTRAP_CSS_BASE_URL = BOOTSTRAP_BASE_URL + 'bootstrap/css/'
BOOTSTRAP_CSS_URL = BOOTSTRAP_CSS_BASE_URL + 'bootstrap.css'

#Time to check if users online (in milliseconds)
ONLINE_TIME = 10 * 60 * 1000

########## Select2 Settings
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'default-cache',
    },
    'select2': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'select2-cache',
    }
}

SELECT2_CACHE_BACKEND = 'select2'

########## MAGE Settings
MAGE_USERNAME = 'username'
MAGE_UID = '12345'
MAGE_PASSWORD = 'password'
MAGE_URL = 'https://mage.server.com/api'
########## End MAGE Settings

########## DEBUG TOOLBAR CONFIGURATION
DEBUG_TOOLBAR_PATCH_SETTINGS = False
DEBUG_TOOLBAR_PANELS = [
    'debug_toolbar.panels.request.RequestPanel',
    'debug_toolbar.panels.headers.HeadersPanel',
    'debug_toolbar.panels.staticfiles.StaticFilesPanel',
    'debug_toolbar.panels.templates.TemplatesPanel',
    ]

INTERNAL_IPS = ['127.0.0.1']

########## COMPRESSION CONFIGURATION
# COMPRESS_ENABLED = True
# Default : the opposite of DEBUG

# see https://github.com/jezdez/django_compressor/issues/226
COMPRESS_OUTPUT_DIR = 'STATIC_CACHE'

# See: http://django_compressor.readthedocs.org/en/latest/settings/#django.conf.settings.COMPRESS_OFFLINE
COMPRESS_OFFLINE = False

# See: http://django_compressor.readthedocs.org/en/latest/settings/#django.conf.settings.COMPRESS_STORAGE
COMPRESS_STORAGE = 'compressor.storage.CompressorFileStorage'

# See: http://django_compressor.readthedocs.org/en/latest/settings/#django.conf.settings.COMPRESS_CSS_FILTERS
COMPRESS_CSS_FILTERS = [
    'compressor.filters.cssmin.CSSMinFilter',
]

# See: http://django_compressor.readthedocs.org/en/latest/settings/#django.conf.settings.COMPRESS_JS_FILTERS
COMPRESS_JS_FILTERS = [
    'compressor.filters.jsmin.JSMinFilter',
]

COMPRESS_DEBUG_TOGGLE = 'nocompress'

COMPRESS_JS_COMPRESSOR = 'compressor.js.JsCompressor'
COMPRESS_CSS_COMPRESSOR = 'compressor.css.CssCompressor'
COMPRESS_PARSER = 'compressor.parser.AutoSelectParser'
COMPRESS_URL = STATIC_URL
COMPRESS_ROOT = STATIC_ROOT
COMPRESS_VERBOSE = False
COMPRESS_CACHEABLE_PRECOMPILERS = (
    'text/coffeescript',
    )
########## END COMPRESSION CONFIGURATION

########## BOOTSTRAP 3 CONFIGURATION

# Default settings
BOOTSTRAP3 = {

    # The URL to the jQuery JavaScript file
    'jquery_url': STATIC_URL + 'jquery/jquery.min.js',

    # The Bootstrap base URL
    'base_url': STATIC_URL + 'bootstrap/',

    # The complete URL to the Bootstrap CSS file (None means derive it from base_url)
    'css_url': STATIC_URL + 'bootstrap/css/bootstrap.css',

    # The complete URL to the Bootstrap CSS file (None means no theme)
    'theme_url': STATIC_URL + 'bootstrap/css/bootstrap-theme.css',

    # The complete URL to the Bootstrap JavaScript file (None means derive it from base_url)
    'javascript_url': STATIC_URL + 'bootstrap/js/bootstrap.min.js',

    # Put JavaScript in the HEAD section of the HTML document (only relevant if you use bootstrap3.html)
    'javascript_in_head': False,

    # Include jQuery with Bootstrap JavaScript (affects django-bootstrap3 template tags)
    'include_jquery': False,

    # Label class to use in horizontal forms
    'horizontal_label_class': 'col-md-3',

    # Field class to use in horizontal forms
    'horizontal_field_class': 'col-md-9',

    # Set HTML required attribute on required fields, for Django <= 1.8 only
    'set_required': True,

    # Set HTML disabled attribute on disabled fields, for Django <= 1.8 only
    'set_disabled': False,

    # Set placeholder attributes to label if no placeholder is provided
    'set_placeholder': True,

    # Class to indicate required (better to set this in your Django form)
    'required_css_class': '',

    # Class to indicate error (better to set this in your Django form)
    'error_css_class': 'has-error',

    # Class to indicate success, meaning the field has valid input (better to set this in your Django form)
    'success_css_class': 'has-success',

    # Renderers (only set these if you have studied the source and understand the inner workings)
    'formset_renderers':{
        'default': 'bootstrap3.renderers.FormsetRenderer',
    },
    'form_renderers': {
        'default': 'bootstrap3.renderers.FormRenderer',
    },
    'field_renderers': {
        'default': 'bootstrap3.renderers.FieldRenderer',
        'inline': 'bootstrap3.renderers.InlineFieldRenderer',
    },
}


########## END BOOTSTRAP 3 CONFIGURATION

# Special case
IMAGE_TRACKING = False

# For KML uploads
KML_REPOSITORY_ROOT = 'kml/'

# initialize apps
#django.setup()

# Override production settings with local settings if they exist
#try:
#    from local_settings import *
#
#except ImportError, e:
#    # local_settings does not exist
#    pass
