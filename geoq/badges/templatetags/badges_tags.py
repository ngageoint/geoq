# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.template import Library
from .utils import badge_count
from .models import LEVEL_CHOICES, Badge
level_choices = dict(LEVEL_CHOICES)

register = Library()

@register.filter
def is_in(value,arg):
    return value in arg

@register.filter
def level_count(badges, level):
    return badges.filter(level=level).count()

@register.filter
def level_title(level):
    return level_choices[level]

@register.filter('badge_count')
def _badge_count(user_or_qs):
    return badge_count(user_or_qs)

@register.filter
def number_awarded(badge, user_or_qs=None):
    return badge.number_awarded(user_or_qs)
 
@register.filter
def progress_start(badge):
    return badge.meta_badge.progress_start
 
@register.filter
def progress_finish(badge):
    return badge.meta_badge.progress_finish
 
@register.filter
def progress(badge, user):
    return badge.meta_badge.get_progress(user)
 
@register.filter
def is_in_progress(badge, user):
    return 0 < badge.meta_badge.get_progress(user) < progress_finish(badge) 
 
@register.filter
def progress_percentage(badge, user):
    prog = badge.meta_badge.get_progress_percentage(user=user)
    return max(min(prog, 100), 0)

@register.filter
def level_icon(level):
    badge = Badge.objects.get(level=level)
    return badge.icon.url