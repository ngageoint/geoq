# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from geoq.core.models import Setting
import json


def app_settings(request):
    """Global values to pass to templates"""
    settings_dict = dict()
    settings = dict()
    for obj in Setting.objects.all():
        settings[obj.name] = obj.value
    settings_dict['settings'] = json.dumps(settings)
    return settings_dict
