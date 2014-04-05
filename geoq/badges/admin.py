# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.contrib import admin

from .models import Badge,BadgeSettings
from singleton_models.admin import SingletonModelAdmin

class BadgeAdmin(admin.ModelAdmin):
    fields = ('icon',)
    list_display = ('id','level')


admin.site.register(Badge, BadgeAdmin)
admin.site.register(BadgeSettings, SingletonModelAdmin)
