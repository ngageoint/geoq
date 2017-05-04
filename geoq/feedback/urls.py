# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.contrib.auth.decorators import login_required
from django.conf.urls import url
from views import feedbackcreate, thankyou, FeedbackListView
from models import Feedback

urlpatterns = [

    url(r'^create/?$', feedbackcreate, name='feedback-create'),
    url(r'^view?$', FeedbackListView.as_view(template_name='feedback_list.html',
           queryset=Feedback.objects.all()), name='feedback-list'),

    url(r'^thankyou/?$', thankyou, name='thanks'),

]
