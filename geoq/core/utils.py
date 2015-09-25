# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.conf import settings
from django.core.mail import send_mail
from django.core.urlresolvers import reverse
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.contrib.sites.models import Site
from django.contrib.auth.models import Group
from datetime import datetime
import requests
import json
import statsd

statsd_client = statsd.StatsClient('localhost',8125)


def send_aoi_create_event(user, aoi_id, aoi_feature_count):
    gamification_server = getattr(settings, 'GAMIFICATION_SERVER', '')
    gamification_project = getattr(settings, 'GAMIFICATION_PROJECT', '')

    if gamification_server and gamification_project:

        url = '%s/users/%s/projects/%s/event/' % (gamification_server, user.username, gamification_project)
        dtg = datetime.now().isoformat(' ')

        payload = {'event_dtg': dtg, 'details': {
            'event_type': 'aoi_complete',
            'aoi_id': aoi_id,
            'feature_count': aoi_feature_count
        }}
        headers = {'Content-type': 'application/json'}

        try:
            r = requests.post(url, data=json.dumps(payload), headers=headers, timeout=5)
        except requests.exceptions.ConnectionError as e:    # This is the correct syntax
            r = "No response"


def send_assignment_email(user_or_group, job, request):
    subject = "GeoQ Assignment for %s Project" % job.project.name
    work_uri = request.build_absolute_uri(reverse('job-detail', kwargs = {'status': 'Assigned', 'pk': job.id}))

    if isinstance(user_or_group, Group):
        user_set = user_or_group.user_set.all().values('username','email')
    else:
        user_set = [{'username':user_or_group.username, 'email':user_or_group.email}]

    recipients = []
    for user in user_set:
        try:
            validate_email(user['email'])
            recipients.append(user['email'])
        except ValidationError:
            continue

    message = "Hello GeoQ User;\n  You have been assigned some workcells in the GeoQ system. Please go to \n\n" + \
            "%s \n\n To see your currently tasked work \n\nRegards,\nThe GeoQ Team" % (work_uri)
    sender = "geoq@%s" % Site.objects.get_current().domain

    send_mail(subject, message, sender, recipients, fail_silently=True)

def increment_metric(counter):
    statsd_client.incr(counter)



def clean_dumps(obj, skipkeys=False, ensure_ascii=True, check_circular=True,
                allow_nan=True, cls=None, indent=None, separators=None, encoding="utf-8", default=None,
                sort_keys=False):
    return json.dumps(obj, indent=indent, skipkeys=skipkeys, ensure_ascii=ensure_ascii, check_circular=check_circular,
                allow_nan=allow_nan, cls=cls, separators=separators, encoding=encoding, default=default,
                sort_keys=sort_keys).replace('<', '&lt').replace('>', '&gt;').replace("javascript:", "j_script-")



