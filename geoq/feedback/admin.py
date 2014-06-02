# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import reversion
from django.contrib.gis import admin
from models import Feedback


class FeedbackAdmin(reversion.VersionAdmin, admin.ModelAdmin):
    model = Feedback
    list_display = ['name', 'topic',]
    save_as = True
    ordering = ['topic']

admin.site.register(Feedback, FeedbackAdmin)
