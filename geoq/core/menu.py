# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.core.urlresolvers import reverse_lazy
from django.utils.datastructures import SortedDict
import re


def menu(active=None, request_path=None, request_user=None):

    def order_dict(d, key):
        return SortedDict(sorted(d.items(), key=key))

    sort_key = lambda t: t[1].get('index', None)

    help_dropdown = {
        'User Guide':  {'index': 1, 'url': reverse_lazy('help_page'), 'active': False},
        'Submit Feedback':  {'index': 2, 'url':  reverse_lazy('feedback-create'), 'active': False},
        }

    if(request_user.groups.filter(name='admin_group') or request_user.is_superuser):
        help_dropdown['View Feedback'] = {'index':3, 'url': reverse_lazy('feedback-list'), 'active': False}

    if (request_user.groups.filter(name='admin_group') or request_user.is_superuser):
        external_links = {'Google Analytics': {'index': 8, 'url': 'https://www.google.com/analytics/web/?hl=en#dashboard/nuBEqz4gT6CeIo0pLUR_tA/a61113494w95763421p99845429/', 'active': False, 'target':'_blank'},
            'GeoQ Heatmap': {'index':9, 'url':'http://jrvis.com/red-dwarf/?user=ngageoint&repo=geoq', 'active':False, 'target':'_blank'},
            'About GeoQ': {'index':10, 'url':'http://github.com/ngageoint/geoq/wiki', 'active':False, 'target':'_blank'}
        }
        menu_links = {'External Links': {'index':4, 'url': '#', 'active':False, 'submenu': order_dict(external_links, sort_key)}}
        help_dropdown.update(menu_links)

    users_dropdown = {
        'Messages': {'index': 3, 'url': '/messages/', 'active': False},
    }

    if request_user.id is not None:
        users_dropdown['My User'] = {'index': 1, 'url': reverse_lazy('userena_profile_detail', kwargs={'username': request_user.username}), 'active': True}

    if request_user.has_perm('accounts.view_profile'):
        users_dropdown['All Users'] = {'index':2, 'url': reverse_lazy('userena_profile_list'), 'active':False}
        
    if request_user.has_perm('auth.change_group'):
        users_dropdown['Teams'] = {'index':4, 'url': reverse_lazy('team-list'), 'active':False}

    menu_users = {'Users': {'index': 5, 'url': '#', 'active': False, 'dropdown' : order_dict(users_dropdown, sort_key)}}

    maps_dropdown = {
        'Layers': {'index': 2, 'url': reverse_lazy('layer-list'), 'active': False},
        'Feature Types': {'index': 2, 'url': reverse_lazy('feature-type-list'), 'active': False}
    }
    menu_maps = {'Map Items':  {'index': 4, 'url': '#', 'active': False, 'dropdown': order_dict(maps_dropdown, sort_key)}}
    menu_help = {'Help': {'index': 6, 'url': '#', 'active': False, 'dropdown' : order_dict(help_dropdown, sort_key)}}
    menu_items = {
        'Projects': {'index': 2, 'url': reverse_lazy('project-list'), 'active': False},
        'Jobs': {'index': 3, 'url': reverse_lazy('job-list'), 'active': False}
    }

    if(request_user.groups.filter(name='admin_group') or request_user.is_superuser):
        menu_items.update(menu_maps)

    menu_items.update(menu_users)
    menu_items.update(menu_help)

    if request_path:
        for i in menu_items.keys():
            if menu_items[i].get('url', None):
                if re.search(str(menu_items[i].get('url')), request_path):
                    menu_items[i]['active'] = True

    return order_dict(menu_items, sort_key)
