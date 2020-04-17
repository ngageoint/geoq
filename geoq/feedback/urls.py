# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.contrib.auth.decorators import login_required
from django.urls import path
from .views import feedbackcreate, thankyou, FeedbackListView
from .models import Feedback

urlpatterns = [

    path('create/', feedbackcreate, name='feedback-create'),
    path('view/', FeedbackListView.as_view(template_name='feedback_list.html',
           queryset=Feedback.objects.all()), name='feedback-list'),

    path('thankyou/', thankyou, name='thanks'),

]
