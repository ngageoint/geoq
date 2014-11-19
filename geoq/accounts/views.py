# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import requests

from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User, Group
from django.shortcuts import get_object_or_404, redirect, render
from django.http import Http404, HttpResponse, HttpResponseRedirect, HttpResponseForbidden
from django.views.generic import TemplateView
from datetime import datetime
from models import UserAuthorization
from utils import get_openbadges_ids


@login_required
def accept_terms_of_use(request, *args, **kwargs):
    user = request.user

    try:
        user_auth = UserAuthorization.objects.get(user=user)
        user_auth.user_accepted_terms_on = datetime.now()
        user_auth.save()
    except UserAuthorization.DoesNotExist:
        user_auth = UserAuthorization.objects.create(user=user)

    return HttpResponse({"ok":"ok"})

class UserExpertiseView(TemplateView):
    http_method_names = ['get']
    template_name = 'accounts/view_expertise.html'

    def get_context_data(self, **kwargs):
        cv = super(UserExpertiseView, self).get_context_data(**kwargs)
        cv['profile_user'] = get_object_or_404(User, username=self.kwargs.get('username'))
        cv['ids'] = get_openbadges_ids(cv['profile_user'])
        return cv
