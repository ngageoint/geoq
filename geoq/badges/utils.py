# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.core.urlresolvers import reverse
from django.db import models
from django.db.models.signals import post_save
from django.contrib.auth.models import User

from .models import Badge as BadgeModel
from .models import BadgeToUser, LEVEL_CHOICES


class RequiresUserOrProgress(Exception): pass

registered_badges = {}

def register(badge):
    if badge.id not in registered_badges:
        registered_badges[badge.id] = badge()
    return badge

def badge_count(user_or_qs=None):
    """
    Given a user or queryset of users, this returns the badge
    count at each badge level that the user(s) have earned.

    Example:

     >>> badge_count(User.objects.filter(username='admin'))
     [{'count': 0, 'badge__level': '1'}, {'count': 0, 'badge__level': '2'}, {'count': 0, 'badge__level': '3'}, {'count': 0, 'badge__level': '4'}]

    Uses a single database query.
    """

    badge_counts = BadgeToUser.objects.all()
    if isinstance(user_or_qs, User):
        badge_counts = badge_counts.filter(user=user_or_qs)
    elif isinstance(user_or_qs, models.query.QuerySet):
        badge_counts = badge_counts.filter(user__in=user_or_qs)

    badge_counts = badge_counts.values('badge__level')
    badge_counts = badge_counts.annotate(count=models.Count('badge__level'))

    def get_badge_count(level):
        bc = [bc for bc in badge_counts if bc['badge__level'] == level]
        if bc:
            return bc[0]
        else:
            # if the user has no badges at this level, return the appropriate response
            return {'count': 0, 'badge__level': level}
                                        
        
    return [get_badge_count(level_choice[0]) for level_choice in LEVEL_CHOICES]
        

class MetaBadgeMeta(type):
    
    def __new__(cls, name, bases, attrs):
        new_badge = super(MetaBadgeMeta, cls).__new__(cls, name, bases, attrs)
        parents = [b for b in bases if isinstance(b, MetaBadgeMeta)]
        if not parents:
            # If this isn't a subclass of MetaBadge, don't do anything special.
            return new_badge
        return register(new_badge)


class MetaBadge(object):
    __metaclass__ = MetaBadgeMeta
    
    one_time_only = False
    model = models.Model

    progress_start = 0
    progress_finish = 1
    
    def __init__(self):
        # whenever the server is reloaded, the badge will be initialized and
        # added to the database
        self._keep_badge_updated()
        post_save.connect(self._signal_callback, sender=self.model)
    
    def _signal_callback(self, **kwargs):
        i = kwargs['instance']
        self.award_ceremony(i)
    
    def _test_conditions(self, instance):
        condition_callbacks = [getattr(self, c) for c in dir(self) if c.startswith('check')]
        
        # will return False on the first False condition
        return all( fn(instance) for fn in condition_callbacks )
    
    def get_user(self, instance):
        return instance.user

    def get_progress(self, user):
        if BadgeToUser.objects.filter(user=user, badge=self.badge).count():
            return 1
        return 0
    
    def get_progress_percentage(self, progress=None, user=None):
        if user is None and progress is None:
            raise RequiresUserOrProgress("This method requires either a user or progress keyword argument")

        if not progress:
            progress = self.get_progress(user)

        progress = min(progress, self.progress_finish)
        
        # multiply by a float to get floating point precision
        return (100.0 * progress) / (self.progress_finish - self.progress_start)
    
    def _keep_badge_updated(self):
        if getattr(self, 'badge', False):
            return False
        badge, created = BadgeModel.objects.get_or_create(id=self.id)
        if badge.level != self.level:
            badge.level = self.level
            badge.save()
        self.badge = badge
    
    def award_ceremony(self, instance):
        if self._test_conditions(instance):
            user = self.get_user(instance)
            self.badge.award_to(user)
