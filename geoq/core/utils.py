# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.conf import settings
from datetime import datetime
import requests
import json


def send_aoi_create_event(user, aoi_id, aoi_feature_count):
    gamification_server = getattr(settings, 'GAMIFICATION_SERVER', '')
    gamification_project = getattr(settings, 'GAMIFICATION_PROJECT', '')

    url = '%s/users/%s/projects/%s/event/' % (gamification_server, user.username, gamification_project)
    dtg = datetime.now().isoformat(' ')

    payload = { 'event_dtg' : dtg, 'details' : { 'event_type' : 'aoi_complete', 'aoi_id' : aoi_id, 'feature_count' : aoi_feature_count } }
    headers = {'Content-type': 'application/json'}

    r = requests.post(url, data=json.dumps(payload), headers=headers, timeout=5 )
