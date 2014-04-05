# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django import template
register = template.Library()

@register.filter('aoi_status')
def aoi_status(objects,status):
    """
    Returns the status of the aoi
    """
    return objects.filter(status=status)
