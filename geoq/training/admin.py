# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import reversion
from django.contrib.gis import admin
from models import *


class ObjectAdmin(reversion.VersionAdmin,):
    pass


class TrainingAdmin(ObjectAdmin):
    list_display = ('name', 'category', 'private', 'primary_contact')
    list_filter = ('category',)

admin.site.register(Training, TrainingAdmin)