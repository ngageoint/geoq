# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)
from django import template
from django.conf import settings

register = template.Library()

# settings value
@register.assignment_tag
def geoserver_job_link(job, kind):
    if job is None:
        return None
    base_url = settings.GEOSERVER_WFS_JOB_LAYER + str(job)
    if(kind == 'kml'):
        print "I should be pointing to kml generation"
        return base_url + "&outputFormat=kml"
    else:
        print "I should be pointing to the WFS link"
        return base_url
