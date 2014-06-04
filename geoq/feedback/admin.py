# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import reversion
from django.contrib.gis import admin
from models import Feedback,Topic


class FeedbackAdmin(reversion.VersionAdmin, admin.ModelAdmin):
    model = Feedback
    list_display = ['name', 'email', 'topic', 'message']
    save_as = True
    ordering = ['topic']

class TopicAdmin(reversion.VersionAdmin, admin.ModelAdmin):
    model = Topic
    list_display = ['name']
    save_as = True
    ordering = ['name']

admin.site.register(Feedback, FeedbackAdmin)
admin.site.register(Topic, TopicAdmin)
