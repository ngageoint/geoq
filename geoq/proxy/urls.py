from django.conf.urls import patterns, include, url
from django.contrib.auth.decorators import login_required
from views import ProxyListView, ProxyRegisterView, ProxyGetView, ProxyAuxGetView


urlpatterns = patterns('',
    url(r'^$', ProxyListView.as_view(), name='list'),
    url(r'^register', login_required(ProxyRegisterView.as_view()),name="register"),
    url(r'^kmz/(.+)/', ProxyGetView.as_view(),name="getkmz"),
    #url(r'^kmz/(.+)/',ProxyGetView,name="getkmz"),
    url(r'^image/(\w+)/(\w+)/', ProxyAuxGetView.as_view(),name="auxget"),
                       )
