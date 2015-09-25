# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.conf import settings
import requests
import collections


def get_openbadges_ids(user):

    url = 'http://backpack.openbadges.org/displayer/convert/email'

    payload = {'email': user.userprofile.openbadge_id}
    userid = groupid = -1

    try:
        r = requests.post(url, data=payload, timeout=5)
        if r.status_code == 200:
            userid = r.json()['userId']

            # now try to get the user's groups and see if one is for GeoQ
            gurl = 'http://backpack.openbadges.org/displayer/%d/groups.json' % userid
            r2 = requests.get(gurl, timeout=5)
            groups = r2.json()['groups']
            for g in groups:
                if g['name'].lower().startswith("geoq"):
                    groupid = g['groupId']
                    break

    except requests.exceptions.ConnectionError as e:    # This is the correct syntax
        r = "No response"

    ids = collections.namedtuple('IDs', ['userid','groupid'])

    return ids(userid, groupid)






