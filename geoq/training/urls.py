
from django.urls import path
from .views import *

urlpatterns = [
    path('.?$', login_required(TrainingListView.as_view()), name='course_list'),
    path('(?P<pk>\d+)/?$', login_required(TrainingView.as_view()), name='course_view_information'),
    path('(?P<pk>\d+)/quiz?$', login_required(TrainingQuizView.as_view()), name='course_quiz'),
]
