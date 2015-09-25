# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.db import models
from django.contrib.auth.models import User
from jsonfield import JSONField


class Training(models.Model):
    name = models.CharField(max_length=250)
    category = models.CharField(max_length=120, help_text="Category of training, eg. FEMA", null=True, blank=True, default="Uncategorized")
    primary_contact = models.ForeignKey(User, help_text="Contact for training.")
    gamification_signals = models.CharField(max_length=250, help_text="After training which Signals should be sent to gamification server?", null=True, blank=True)
    content_link = models.CharField(max_length=500, help_text="Link to PDF/PPT/training or web page for training that will open in a new window", null=True, blank=True)
    quiz_data = JSONField(help_text="If user should be quized after, list of questions and answers and percent_complete if not 100%", null=True, blank=True)
    users_completed = models.ManyToManyField(User, blank=True, null=True, related_name="users_completed", help_text='Users that completed this training.')
    description = models.TextField(null=True, blank=True, help_text="Details to show potential student.")
    updated_at = models.DateTimeField(auto_now=True, help_text="Last updated time/date")
    private = models.BooleanField(default=False, help_text="Check to hide in public list")

    def __str__(self):
        return "%s, %s" % (self.name, self.category)