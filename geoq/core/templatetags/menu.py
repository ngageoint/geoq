# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django import template
from django.core.urlresolvers import reverse, reverse_lazy
from geoq.core.menu import menu

register = template.Library()

def get_menu(request=None, **kwargs):

    request_path = getattr(request, 'path', None)
    menu_dict = kwargs
    menu_dict['menu_items'] = menu(request_path=request_path)
    menu_dict['request'] = request

    return menu_dict

register.inclusion_tag('core/menu.html')(get_menu)