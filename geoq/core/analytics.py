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
            users_name = self.userOrGroup.username
            if len(self.userOrGroup.last_name) > 0:
                users_name = "%s %s" % (self.userOrGroup.first_name, self.userOrGroup.last_name)
            return users_name
        else:
            return self.userOrGroup.name

    def increment(self, user, key):
        k = key.lower().replace(' ','_')
        self.stats[k] += 1

        username = "No assigned analyst" if user is None else user.username
        if user and len(user.last_name) > 0:
            username = "%s %s" % (user.first_name, user.last_name)

        if not username in self.users:
            self.users[username] = dict([(s.lower().replace(" ","_"),0) for s in STATUS_VALUES_LIST])
            self.users[username]['name'] = str(username)

        self.users[username][k] += 1

    def add_user_to_group(self, user_stats):
        self.users[user.name] = user_stats

    def toJSON(self):
        output = {}
        output['Group'] = str(self.name)
        output['state'] = self.stats
        output['Users'] = []
        for key, value in self.users.iteritems():
            output['Users'].append(value)

        return output







