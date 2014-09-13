
from django.conf.urls import patterns, url
from views import *

urlpatterns = patterns('',
    url(r'^/?$', login_required(TrainingListView.as_view()), name='course_list'),
    url(r'^(?P<pk>\d+)/?$', login_required(TrainingView.as_view()), name='course_view_information'),
    url(r'^(?P<pk>\d+)/quiz?$', login_required(TrainingQuizView.as_view()), name='course_quiz'),
)