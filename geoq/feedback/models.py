# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

# based largely on https://djangosnippets.org/snippets/261

from django.contrib.gis.db import models

class Topic(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __unicode__(self):
        return self.name



# A simple feedback form with four fields.
class Feedback(models.Model):
    title = models.CharField(max_length=80, default='GeoQ Feedback')
    name = models.CharField(max_length=50)
    email = models.EmailField()
    topic = models.ForeignKey(Topic)
    message = models.TextField()


    def __unicode__(self):
        return self.title

