from django.contrib.auth.models import User,Group
from geoq.core.models import STATUS_VALUES_LIST
import json

class UserGroupStats(object):

    def __init__(self, userOrGroup):
        self.userOrGroup = userOrGroup
        self.stats = dict([(s.lower().replace(" ","_"),0) for s in STATUS_VALUES_LIST])
        self.users = {}

    @property
    def name(self):
        if type(self.userOrGroup) is User:
            return self.userOrGroup.username
        else:
            return self.userOrGroup.name

    def increment(self, user, key):
        k = key.lower().replace(' ','_')
        self.stats[k] += 1

        if user is not None:
            if not user.username in self.users:
                self.users[user.username] = dict([(s.lower().replace(" ","_"),0) for s in STATUS_VALUES_LIST])
                self.users[user.username]['name'] = str(user.username)

            self.users[user.username][k] += 1

    def add_user_to_group(self, user_stats):
        self.users[user.name] = user_stats

    def toJSON(self):
        output = {}
        output['Group'] = str(self.name)
        output['Stats'] = self.stats
        output['Users'] = []
        for key, value in self.users.iteritems():
            output['Users'].append(value)

        return output







