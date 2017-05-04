# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.contrib.gis import admin
from reversion.admin import VersionAdmin
from models import *

@admin.register(Counties)
class CountiesAdmin(VersionAdmin, admin.ModelAdmin):
    model = Counties
    list_display = ['name']
    save_as = True
    ordering = ['name']
