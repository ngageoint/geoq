# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)


class UserPermsMiddleware(object):

    def process_request(self, request):

        """
        Populates user permissions to use in the templates.
        """
        user = request.user
        perms = []

        perms = list(user.get_all_permissions()) + perms
        request.base_perms = set(perms)

        return None
