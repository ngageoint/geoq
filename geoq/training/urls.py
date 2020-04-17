
from django.urls import path
from .views import *

app_name = 'training'
urlpatterns = [
    path('', login_required(TrainingListView.as_view()), name='course_list'),
    path('<int:pk>/', login_required(TrainingView.as_view()), name='course_view_information'),
    path('<int:pk>/quiz/', login_required(TrainingQuizView.as_view()), name='course_quiz'),
]
