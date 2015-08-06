# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.utils.importlib import import_module
from django.conf import settings
from django.http import HttpResponseForbidden
from django.template import RequestContext, Template, loader, TemplateDoesNotExist
from geoq.accounts.models import UserAuthorization

class UserPermsMiddleware(object):

    def process_request(self, request):

        """
        Populates user permissions to use in the templates.
        """
        user = request.user
        perms = []
        user_auth_perms = []

        if user and user.username:
            user_auth_additions = UserAuthorization.objects.filter(user=user)
            if user_auth_additions and len(user_auth_additions):
                user_auth_perms = user_auth_additions[0].permissions_list()

        perms = list(user.get_all_permissions()) + perms + user_auth_perms
        request.base_perms = set(perms)

        return None

"""
# Middleware to allow the display of a 403.html template when a
# 403 error is raised.
#
# borrowed heavily from http://mitchfournier.com/2010/07/12/show-a-custom-403-forbidden-error-page-in-django/
"""

class Http403(Exception):
    pass

class Http403Middleware(object):
    def process_exception(self, request, exception):
        # from http import Http403

        if not isinstance(exception, Http403):
            # Return None so django doesn't re-raise the exception
            return None

        try:
            # Handle import error but allow any type error from view
            callback = getattr(import_module(settings.ROOT_URLCONF),'handler403')
            return callback(request,exception)
        except (ImportError,AttributeError):
            # Try to get a 403 template
            try:
                # First look for a user-defined template named "403.html"
                t = loader.get_template('middleware/403.html')
            except TemplateDoesNotExist:
                # If a template doesn't exist in the projct, use the following hardcoded template
                t = Template("""{% load i18n %}
                 <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"
                        "http://www.w3.org/TR/html4/strict.dtd">
                 <html>
                 <head>
                     <title>{% trans "403 ERROR: Access denied" %}</title>
                 </head>
                 <body>
                     <h1>{% trans "Access Denied (403)" %}</h1>
                     {% trans "We're sorry, but you are not authorized to view this page." %}
                 </body>
                 </html>""")

            # Now use context and render template
            c = RequestContext(request, {
                  'message': exception.args[0]
             })

            return HttpResponseForbidden(t.render(c))

from django.utils import timezone
from geoq.accounts.models import UserProfile

class UpdateLastActivityMiddleware(object):
    def process_view(self, request, view_func, view_args, view_kwargs):
        assert hasattr(request, 'user'), 'The UpdateLastActivityMiddleware requires authentication middleware to be installed.'
        if request.user.is_authenticated():
            UserProfile.objects.filter(user__id=request.user.id) \
                           .update(last_activity=timezone.now())