# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.contrib.gis.db import models


#ShapeFile has: ['STATEFP', 'COUNTYFP', 'COUNTYNS', 'AFFGEOID', 'GEOID', 'NAME', 'LSAD', 'ALAND', 'AWATER']
# Import Steps:
#
# from django.contrib.gis.utils import LayerMapping
# from geoq.locations.models import *
# mapping = {'name': 'NAME', 'state': 'STATEFP', 'poly': 'MULTIPOLYGON',}
# lm = LayerMapping(Counties, 'static/world_cells/counties/cb_2013_us_county_20m.shp', mapping, encoding='cp1252')
# lm.save(verbose=True)


class Counties(models.Model):
    name = models.CharField(max_length=80)
    state = models.IntegerField(blank=True, null=True)
    poly = models.MultiPolygonField(srid=4326)
    objects = models.GeoManager()

    def __str__(self):              # __unicode__ on Python 2
        return 'County: %s' % self.name

    class Meta:
        verbose_name = 'US Counties'
        verbose_name_plural = 'Counties'