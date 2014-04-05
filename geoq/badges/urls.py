# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.conf.urls.defaults import *

from .views import overview, detail

urlpatterns = patterns('',
    url(r'^$', overview, name="badges_overview"),
    url(r'^(?P<slug>[A-Za-z0-9_-]+)/$', detail, name="badge_detail"),
    )