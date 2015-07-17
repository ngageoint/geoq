from django.conf.urls import patterns, include, url
from views import tancolor_view

urlpatterns = patterns('',
                       url(r'^tancolor/?$', tancolor_view, name='recolor'),
                       )
