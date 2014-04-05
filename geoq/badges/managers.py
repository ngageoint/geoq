# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.db import models
from utils import registered_badges

class BadgeManager(models.Manager):
    def active(self):
        return self.get_query_set().filter(id__in=registered_badges.keys())
        