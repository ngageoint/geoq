# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from datetime import datetime

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.db import models
from django.conf import settings

from singleton_models.models import SingletonModel

from .signals import badge_awarded
from .managers import BadgeManager

if hasattr(settings, 'BADGE_LEVEL_CHOICES'):
    LEVEL_CHOICES = settings.BADGE_LEVEL_CHOICES
else:
    LEVEL_CHOICES = (
        ("1", "Bronze"),
        ("2", "Silver"),
        ("3", "Gold"),
    )

class Badge(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    user = models.ManyToManyField(User, related_name="badges", through='BadgeToUser')
    level = models.CharField(max_length=1, choices=LEVEL_CHOICES)
    
    icon = models.ImageField(upload_to='badge_images')
    value = 1
    
    objects = BadgeManager()
    
    @property
    def meta_badge(self):
        from utils import registered_badges
        return registered_badges[self.id]
    
    @property
    def title(self):
        return self.meta_badge.title
    
    @property
    def description(self):
        return self.meta_badge.description
    
    def __unicode__(self):
        return u"%s" % self.title
    
    def get_absolute_url(self):
        return reverse('badge_detail', kwargs={'slug': self.id})
    
    def award_to(self, user):
        has_badge = self in user.badges.all()
        if self.meta_badge.one_time_only and has_badge:
            return False
        
        BadgeToUser.objects.create(badge=self, user=user)
                
        badge_awarded.send(sender=self.meta_badge, user=user, badge=self)
        
        #Grr... deprecated for Django 1.4+
        #message_template = "You just got the %s Badge!"
        #user.message.success(message = message_template % self.title)
        
        return BadgeToUser.objects.filter(badge=self, user=user).count()

    def number_awarded(self, user_or_qs=None):
        """
        Gives the number awarded total. Pass in an argument to
        get the number per user, or per queryset.
        """
        kwargs = {'badge':self}
        if user_or_qs is None:
            pass
        elif isinstance(user_or_qs, User):
            kwargs.update(dict(user=user_or_qs))
        else:
            kwargs.update(dict(user__in=user_or_qs))
        return BadgeToUser.objects.filter(**kwargs).count()


class BadgeToUser(models.Model):
    badge = models.ForeignKey(Badge)
    user = models.ForeignKey(User)
    
    created = models.DateTimeField(default=datetime.now)


#TODO: should this get moved into a general settings?
class BadgeSettings(SingletonModel):
    startScore = models.IntegerField(default=1)
    rewardPoints = models.IntegerField(default=5)
