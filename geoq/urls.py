# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.contrib import admin
#from django.conf.urls.static import static
from django.conf import settings
from geoq.core.views import Dashboard
from django.urls import include, path

#admin.autodiscover()

urlpatterns = [
    path('', Dashboard.as_view(), name='home'),
    path('admin/', admin.site.urls),
    path('geoq/', include('geoq.core.urls')),
    path('maps/', include('geoq.maps.urls')),
    path('mage/', include('geoq.mage.urls')),
    path('feedback/', include('geoq.feedback.urls')),
    path('accounts/', include('geoq.accounts.urls')),
    path('proxy/', include('geoq.proxy.urls')),
    path('training/', include('geoq.training.urls')),
    path('messages/', include('userena.contrib.umessages.urls'), name='userena_messages')
    ]

if settings.DEBUG:
    import debug_toolbar
    urlpatterns.append(path('__debug__/', include(debug_toolbar.urls)))
