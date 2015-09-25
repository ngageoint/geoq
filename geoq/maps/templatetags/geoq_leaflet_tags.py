# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)
from django import template
from django.conf import settings
from leaflet.templatetags.leaflet_tags import leaflet_map
import json

register = template.Library()


@register.inclusion_tag('leaflet/_leaflet_map.html')
def geoq_leaflet_map(name, callback=None, fitextent=True, creatediv=True, loadevent='load', settings_overrides={}):
    ctx = leaflet_map(name,callback,fitextent,creatediv,loadevent)

    # modify djoptions
    overrides = json.loads(settings_overrides)
    options = json.loads(ctx['djoptions'])
    if len(overrides) > 0:
        options.update(overrides)

    # options['layers'] = [["ESRI World","http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", "Tiles &copy; Esri &mdash;"]]
    ctx['djoptions'] = json.dumps(options)
    return ctx