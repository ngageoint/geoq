# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.contrib import admin
from django.conf.urls import include, url
from django.conf.urls.static import static
from django.conf import settings
from geoq.core.views import Dashboard

admin.autodiscover()

urlpatterns = [
    url(r'^$', Dashboard.as_view(), name='home'),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^geoq/', include('geoq.core.urls')),
    url(r'^maps/', include('geoq.maps.urls')),
    url(r'^mage/', include('geoq.mage.urls')),
    url(r'^feedback/', include('geoq.feedback.urls')),
    url(r'^accounts/', include('geoq.accounts.urls')),
    url(r'^proxy/', include('geoq.proxy.urls', namespace="proxy")),
    url(r'^training/', include('geoq.training.urls', namespace="training")),
    url(r'^messages/', include('userena.contrib.umessages.urls'), name='userena_messages')
    ]

if settings.DEBUG:
    import debug_toolbar
    urlpatterns.append(url(r'^__debug__/', include(debug_toolbar.urls)))