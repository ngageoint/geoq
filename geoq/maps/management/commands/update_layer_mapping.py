from optparse import make_option

from django.core.management.base import BaseCommand, CommandError
from django.db import DEFAULT_DB_ALIAS
from django.contrib.gis.utils import LayerMapping
from geoq.locations.models import *


DEFAULT_FILE='geoq/static/world_cells/counties/cb_2013_us_county_20m.shp'
class Command(BaseCommand):
    option_list = BaseCommand.option_list + (
        make_option('--database', action='store', dest='database',
            default=DEFAULT_DB_ALIAS, help='Specifies the database to use. Default is "default".'),
        make_option('--file', action="store", dest='file',default=DEFAULT_FILE,help='Specifies which URL to start scraping with (default is %s) '% DEFAULT_FILE),
    )
    help = "setup county mapping"

    requires_model_validation = False

    def handle(self, *args, **options):
        shpfile = options.get('file')
        mapping = {'name': 'NAME', 'state': 'STATEFP', 'poly': 'MULTIPOLYGON',}
        lm = LayerMapping(Counties, shpfile, mapping, encoding='cp1252')
        lm.save(verbose=True)
        return "County data loaded"
