# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

# based largely on https://djangosnippets.org/snippets/261

from django.contrib.gis.db import models
from geoq.core.models import AOI


# A simple feedback form with four fields.
class Agent(models.Model):
    description = models.TextField()
    name = models.CharField(max_length=80)
    baseurl = models.CharField(max_length=500)
    workcells = models.ManyToManyField(AOI, blank=True, related_name="agent_workcells",
                                           help_text='Workcells that this agent will be monitoring')


    def __unicode__(self):
        return self.title

    def start(self):
        pass

    def stop(self):
        pass

