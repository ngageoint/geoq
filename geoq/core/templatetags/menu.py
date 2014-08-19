# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django import template
from geoq.core.menu import menu
from geoq.core.models import Setting
register = template.Library()

def get_menu(request=None, **kwargs):

    request_path = getattr(request, 'path', None)
    request_user = getattr(request, 'user', None)
    menu_dict = kwargs
    menu_dict['menu_items'] = menu(request_path=request_path, request_user=request_user)
    menu_dict['request'] = request

    prevent_obj = Setting.objects.filter(name='prevent_signups')
    if len(prevent_obj):
        menu_dict['prevent_signups'] = 'true'

    return menu_dict

register.inclusion_tag('core/menu.html')(get_menu)
