# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import json
from geoq.core.models import AOI, Job, Project
from django.contrib.auth.models import User
from django.contrib.gis.db import models
from django.core.exceptions import ValidationError
from django.utils.datastructures import SortedDict
from django.core.urlresolvers import reverse
from jsonfield import JSONField
from datetime import datetime

IMAGE_FORMATS = (
                ('image/png', 'image/png'),
                ('image/png8', 'image/png8'),
                ('image/png24', 'image/png24'),
                ('image/jpeg', 'image/jpeg'),
                ('image/gif', 'image/gif'),
                ('image/tiff', 'image/tiff'),
                ('image/tiff8', 'image/tiff8'),
                ('image/geotiff', 'image/geotiff'),
                ('image/geotiff8', 'image/geotiff8'),
                ('image/svg', 'image/svg'),
                ('rss', 'rss'),
                ('kml', 'kml'),
                ('kmz', 'kmz'),
                ('json', 'json'),
                ('png', 'png'),
                ('png8', 'png8'),
                ('png24', 'png24'),
                ('jpeg', 'jpeg'),
                ('jpg', 'jpg'),
                ('gif', 'gif'),
                ('tiff', 'tiff'),
                ('tiff8', 'tiff8'),
                ('geotiff', 'geotiff'),
                ('geotiff8', 'geotiff8'),
                ('svg', 'svg'),
)

SERVICE_TYPES = (
                ('WMS', 'WMS'),
                ('KML', 'KML'),
                ('GeoRSS', 'GeoRSS'),
                ('ESRI Tiled Map Service', 'ESRI Tiled Map Service'),
                ('ESRI Dynamic Map Layer', 'ESRI Dynamic Map Layer'),
                ('ESRI Feature Layer', 'ESRI Feature Layer'),
                ('GeoJSON', 'GeoJSON'),
                ('ESRI Clustered Feature Layer', 'ESRI Clustered Feature Layer'),
                #('ArcGIS93Rest', 'ArcGIS93Rest'),
                ('GPX', 'GPX'),
                #('GML','GML'),
                ('WMTS', 'WMTS'),
                #('MapBox', 'MapBox'),
                #('TileServer','TileServer'),
                #('GetCapabilities', 'GetCapabilities'),
)

INFO_FORMATS = [(n, n) for n in sorted(['application/vnd.ogc.wms_xml',
                                       'application/xml', 'text/html', 'text/plain'])]

PARSER_CATEGORIES = (
                    ('palanterra', 'palanterra'),
                    ('uscg_ships', 'uscg_ships'),
                    ('icnet', 'icnet'),
                    ('dg_wmts_time', 'dg_wmts_time'),
                    ('geomedia_triaged', 'geomedia_triaged'),
                    ('harvester_earthquake', 'harvester_earthquake'),
                    ('harvester_fire', 'harvester_fire'),
                    ('harvester_tsunami', 'harvester_tsunami'),
                    ('harvester_flood', 'harvester_flood'),
                    ('harvester_volcano', 'harvester_volcano'),
)


class Layer(models.Model):
    """
    A layer object that can be added to any map.
    """

    name = models.CharField(max_length=200)
    type = models.CharField(choices=SERVICE_TYPES, max_length=75)
    """TODO: Make this url field a CharField"""
    url = models.URLField(help_text='URL of service. If WMS or ESRI, can be any valid URL. Otherwise, the URL will require a local proxy')
    layer = models.CharField(max_length=800, null=True, blank=True, help_text='Layer names can sometimes be comma-separated, and are not needed for data layers (KML, GeoRSS, GeoJSON...)')
    image_format = models.CharField(null=True, blank=True, choices=IMAGE_FORMATS, max_length=75, help_text='The MIME type of the image format to use for tiles on WMS layers (image/png, image/jpeg image/gif...). Double check that the server exposes this exactly - some servers push png instead of image/png.')
    styles = models.CharField(null=True, blank=True, max_length=200, help_text='The name of a style to use for this layer (only useful for WMS layers if the server exposes it.)')
    transparent = models.BooleanField(default=True, help_text='If WMS or overlay, should the tiles be transparent where possible?')
    refreshrate = models.PositiveIntegerField(blank=True, null=True, verbose_name="Layer Refresh Rate", help_text='Layer refresh rate in seconds for vector/data layers (will not refresh WMS layers)')
    description = models.TextField(max_length=800, null=True, blank=True, help_text='Text to show in layer chooser, please be descriptive - this will soon be searchable')
    attribution = models.CharField(max_length=200, null=True, blank=True, help_text="Attribution from layers to the map display (will show in bottom of map when layer is visible).")
    token = models.CharField(max_length=400, null=True, blank=True, help_text='Authentication token, if required (usually only for secure layer servers)')

    ## Advanced layer options
    objects = models.GeoManager()
    extent = models.PolygonField(null=True, blank=True, help_text='Extent of the layer.')
    layer_parsing_function = models.CharField(max_length=100, blank=True, null=True, choices=PARSER_CATEGORIES, help_text='Advanced - The javascript function used to parse a data service (GeoJSON, GeoRSS, KML), needs to be an internally known parser. Contact an admin if you need data parsed in a new way.')
    enable_identify = models.BooleanField(default=False, help_text='Advanced - Allow user to click map to query layer for details. The map server must support queries for this layer.')
    info_format = models.CharField(max_length=75, null=True, blank=True, choices=INFO_FORMATS, help_text='Advanced - what format the server returns for an WMS-I query')
    root_field = models.CharField(max_length=100, null=True, blank=True, help_text='Advanced - For WMS-I (queryable) layers, the root field returned by server. Leave blank for default (will usually be "FIELDS" in returned XML).')
    fields_to_show = models.CharField(max_length=200, null=True, blank=True, help_text='Fields to show when someone uses the identify tool to click on the layer. Leave blank for all.')
    downloadableLink = models.URLField(max_length=300, null=True, blank=True, help_text='URL of link to supporting tool (such as a KML document that will be shown as a download button)')
    layer_params = JSONField(null=True, blank=True, help_text='JSON key/value pairs to be sent to the web service.  ex: {"crs":"urn:ogc:def:crs:EPSG::4326"}')
    spatial_reference = models.CharField(max_length=32, blank=True, null=True, default="EPSG:4326", help_text='The spatial reference of the service.  Should be in ESPG:XXXX format.')
    constraints = models.TextField(null=True, blank=True)

    ## Primarily for http://trac.osgeo.org/openlayers/wiki/OpenLayersOptimization
    additional_domains = models.TextField(null=True, blank=True, help_text='Semicolon seperated list of additional domains for the layer.')

    def __unicode__(self):
        return '{0}'.format(self.name)

    def get_layer_urls(self):
        """
        Returns a list of urls for the layer.
        """
        urls = []

        if getattr(self, 'additional_domains'):
            map(urls.append, (domain for domain in self.additional_domains.split(";") if domain))

        return urls

    def get_absolute_url(self):
        return reverse('layer-update', args=[self.id])

    def get_layer_params(self):
        """
        Converts a layer's parameters to json.
        """

        return self.layer_params

    class Meta:
        ordering = ["name"]


class Map(models.Model):
    """
    A Map aggregates several layers together.
    """

    title = models.CharField(max_length=75, unique=True)
    description = models.TextField(max_length=800, blank=True, null=True)
    zoom = models.IntegerField(help_text='Sets the default zoom level of the map.', default=5)
    projection = models.CharField(max_length=32, blank=True, null=True, default="EPSG:4326", help_text='Set the default projection for layers added to this map. Note that the projection of the map is usually determined by that of the current baseLayer')
    center_x = models.FloatField(default=0.0, help_text='Sets the center x coordinate of the map.  Maps on event pages default to the location of the event.')
    center_y = models.FloatField(default=0.0, help_text='Sets the center y coordinate of the map.  Maps on event pages default to the location of the event.')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now_add=True)

    def __unicode__(self):
        return '{0}'.format(self.title)

    @property
    def name(self):
        return self.title

    @property
    def center(self):
        """
        A shortcut for the center_x and center_y properties as a tuple
        """
        return self.center_x, self.center_y

    @property
    def layers(self):
        layers = MapLayer.objects.filter(map=self.id)
        return [layer for layer in layers]

    def map_layers_json(self):

        def layer_json(map_layer):
            return {
                "id": map_layer.layer.id,
                "name": map_layer.layer.name,
                "format": map_layer.layer.image_format,
                "type": map_layer.layer.type,
                "url": map_layer.layer.url,
                "subdomains": map_layer.layer.get_layer_urls(),
                "layer": map_layer.layer.layer,
                "shown": map_layer.shown,
                "transparent": map_layer.layer.transparent,
                "opacity": map_layer.opacity,
                "layerParams": map_layer.layer.get_layer_params(),
                "isBaseLayer": map_layer.is_base_layer,
                "displayInLayerSwitcher": map_layer.display_in_layer_switcher,
                "refreshrate": map_layer.layer.refreshrate,
                "token": map_layer.layer.token,
                "attribution": map_layer.layer.attribution,
                "spatialReference": map_layer.layer.spatial_reference,
                "layerParsingFunction": map_layer.layer.layer_parsing_function,
                "enableIdentify": map_layer.layer.enable_identify,
                "rootField": map_layer.layer.root_field,
                "infoFormat": map_layer.layer.info_format,
                "fieldsToShow": map_layer.layer.fields_to_show,
                "description": map_layer.layer.description,
                "downloadableLink": map_layer.layer.downloadableLink,
                "styles": map_layer.layer.styles,
                "zIndex": map_layer.stack_order,
            }

        map_services = list()
        for map_layer in self.layers:
            map_services.append(layer_json(map_layer))

        return map_services

    def to_json(self):
        return json.dumps({
            "center_x": self.center_x,
            "center_y": self.center_y,
            "zoom": self.zoom,
            "projection": self.projection or "EPSG:4326",
            "layers": self.map_layers_json()
        })

    def get_absolute_url(self):
        return reverse('map-update', args=[self.id])


class MapLayer(models.Model):
    """
    The MapLayer is the mechanism that joins a Layer to a Map and allows for custom look and feel.
    """

    map = models.ForeignKey(Map, related_name='map_set')
    layer = models.ForeignKey(Layer, related_name='map_layer_set')
    shown = models.BooleanField(default=True)
    stack_order = models.IntegerField()
    opacity = models.FloatField(default=.80)
    is_base_layer = models.BooleanField(help_text="Base Layers are mutually exclusive layers, meaning only one can be enabled at any given time. The currently active base layer determines the available projection (coordinate system) and zoom levels available on the map.")
    display_in_layer_switcher = models.BooleanField()

    class Meta:
        ordering = ["stack_order"]

    def __unicode__(self):
        return 'Layer {0}: {1}'.format(self.stack_order, self.layer)


class Feature(models.Model):
    """
    Model to represent features created in the application.
    """
    aoi = models.ForeignKey(AOI, related_name='features', editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    objects = models.GeoManager()
    analyst = models.ForeignKey(User, editable=False)
    template = models.ForeignKey("FeatureType", on_delete=models.PROTECT)

    # Allow the user to save their own properties
    properties = JSONField(load_kwargs={}, blank=True, null=True)

    # These help the user identify features when data is exposed outside of the application (Geoserver).
    job = models.ForeignKey(Job, editable=False)
    project = models.ForeignKey(Project, editable=False)

    #Try this vs having individual models
    the_geom = models.GeometryField(blank=True, null=True)

    def geoJSON(self, as_json=True):
        """
        Returns geoJSON of the feature.
        Try to conform to https://github.com/mapbox/simplestyle-spec/tree/master/1.0.0
        """
        
        geojson = SortedDict()
        geojson["type"] = "Feature"
        geojson["properties"] = dict(id=self.id,
                                     template=self.template.id if hasattr(self.template, "id") else None,
                                     analyst=self.analyst.username,
                                     created_at=datetime.strftime(self.created_at, '%Y-%m-%dT%H:%M:%S%Z'),
                                     updated_at=datetime.strftime(self.updated_at, '%Y-%m-%dT%H:%M:%S%Z')
                                     )
        geojson["geometry"] = json.loads(self.the_geom.json)

        return json.dumps(geojson) if as_json else geojson

    def __unicode__(self):
        return "Feature created for {0}".format(self.aoi.name)

    def clean(self):
        obj_geom_type = self.the_geom.geom_type.lower()
        template_geom_type = self.template.type.lower()
        if obj_geom_type != template_geom_type:
            error_text = "Feature type {0} does not match the template's feature type {1}."
            raise ValidationError(error_text.format(obj_geom_type, template_geom_type))

    class Meta:
        ordering = ('-updated_at', 'aoi',)


class FeatureType(models.Model):

    FEATURE_TYPES = (
        ('Point', 'Point'),
        ('Line', 'Line'),
        ('Polygon', 'Polygon'),
    )

    name = models.CharField(max_length=200)
    type = models.CharField(choices=FEATURE_TYPES, max_length=25)
    properties = JSONField(load_kwargs={}, blank=True, null=True)
    style = JSONField(load_kwargs={}, blank=True, null=True)

    def to_json(self):
        return json.dumps(dict(id=self.id,
                               properties=self.properties,
                               name=self.name,
                               type=self.type,
                               style=self.style))

    def featuretypes(self):
        return FeatureType.objects.all()

    def get_absolute_url(self):
        return reverse('feature-type-update', args=[self.id])

    def __unicode__(self):
        return self.name


class GeoeventsSource(models.Model):
    name = models.CharField(max_length=200)
    url = models.URLField(help_text='URL of service location. Requires JSONP support')
