# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import types
import json
from geoq.core.models import AOI, Job, Project, Setting
from geoq.locations.models import Counties
from django.contrib.auth.models import User
from django.contrib.gis.db import models
from django.core.exceptions import ValidationError
from django.utils.datastructures import SortedDict
from django.core.urlresolvers import reverse
from jsonfield import JSONField
from datetime import datetime
from geoq.core.utils import clean_dumps
from denorm import denormalized, depend_on_related

import sys

MIGRATING = reduce(lambda x, y: x or y, ['syncdb' in sys.argv, 'migrate' in sys.argv], False)

#Set up Server URL setting
SERVER_URL = '/'
if not MIGRATING:
    try:
        #main_server = Setting.objects.filter(name="main_server")
        main_server = []
        if len(main_server) > 0:
            main_server = main_server[0].value
            if main_server.__contains__('name'):
                SERVER_URL = str(main_server['name'])
    except:
        SERVER_URL = '/'


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
                ('WFS', 'WFS'),
                ('KML', 'KML'),
                ('GeoRSS', 'GeoRSS'),
                ('ESRI Identifiable MapServer', 'ESRI Identifiable MapServer'),
                ('ESRI Tiled Map Service', 'ESRI Tiled Map Service'),
                ('ESRI Dynamic Map Layer', 'ESRI Dynamic Map Layer'),
                ('ESRI Feature Layer', 'ESRI Feature Layer'),
                ('GeoJSON', 'GeoJSON'),
                ('ESRI Clustered Feature Layer', 'ESRI Clustered Feature Layer'),
                #('ArcGIS93Rest', 'ArcGIS93Rest'),
                ('GPX', 'GPX'),
                #('GML','GML'),
                ('WMTS', 'WMTS'),
                ('Social Networking Link', 'Social Networking Link'),
                ('Web Data Link', 'Web Data Link'),
                ('Bing', 'Bing'),
                ('Google Maps', 'Google Maps'),
                ('Yandex', 'Yandex'),
                ('Leaflet Tile Layer', 'Leaflet Tile Layer'),
                ('MediaQ', 'MediaQ'),
                #('MapBox', 'MapBox'),
                #('TileServer','TileServer'),
                #('GetCapabilities', 'GetCapabilities'),
)

EDITABLE_LAYER_TYPES = (
                        ('OSM','OSM'),
                        ('OSM MapEdit','OSM MapEdit'),
)

INFO_FORMATS = [(n, n) for n in sorted(['application/vnd.ogc.wms_xml',
                                       'application/xml', 'text/html', 'text/plain'])]


class Layer(models.Model):
    """
    A layer object that can be added to any map.
    """

    name = models.CharField(max_length=200, help_text='Name that will be displayed within GeoQ')
    type = models.CharField(choices=SERVICE_TYPES, max_length=75)
    url = models.CharField(help_text='URL of service. If WMS or ESRI, can be any valid URL. Otherwise, the URL will require a local proxy', max_length=500)
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
    layer_parsing_function = models.CharField(max_length=100, blank=True, null=True,  help_text='Advanced - The javascript function used to parse a data service (GeoJSON, GeoRSS, KML), needs to be an internally known parser. Contact an admin if you need data parsed in a new way.')
    enable_identify = models.BooleanField(default=False, help_text='Advanced - Allow user to click map to query layer for details. The map server must support queries for this layer.')
    info_format = models.CharField(max_length=75, null=True, blank=True, choices=INFO_FORMATS, help_text='Advanced - what format the server returns for an WMS-I query')
    root_field = models.CharField(max_length=100, null=True, blank=True, help_text='Advanced - For WMS-I (queryable) layers, the root field returned by server. Leave blank for default (will usually be "FIELDS" in returned XML).')
    fields_to_show = models.CharField(max_length=200, null=True, blank=True, help_text='Fields to show when someone uses the identify tool to click on the layer. Leave blank for all.')
    downloadableLink = models.URLField(max_length=400, null=True, blank=True, help_text='URL of link to supporting tool (such as a KML document that will be shown as a download button)')
    layer_params = JSONField(null=True, blank=True, help_text='JSON key/value pairs to be sent to the web service.  ex: {"crs":"urn:ogc:def:crs:EPSG::4326"}')
    dynamic_params = JSONField(null=True, blank=True, help_text='URL Variables that may be modified by the analyst. ex: "date"')
    spatial_reference = models.CharField(max_length=32, blank=True, null=True, default="EPSG:4326", help_text='The spatial reference of the service.  Should be in ESPG:XXXX format.')
    constraints = models.TextField(null=True, blank=True, help_text='Constrain layer data displayed to certain feature types')
    disabled = models.BooleanField(default=False, blank=True, help_text="If unchecked, Don't show this layer when listing all layers")
    layer_info_link = models.URLField(null=True, blank=True, help_text='URL of info about the service, or a help doc or something', max_length=500)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now_add=True, null=True)

    ## Primarily for http://trac.osgeo.org/openlayers/wiki/OpenLayersOptimization
    additional_domains = models.TextField(null=True, blank=True, help_text='Semicolon seperated list of additional domains for the layer. Only used if you want to cycle through domains for load-balancing')

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
        Returns the layer_params attribute, which should be json
        """
        return self.layer_params

    def layer_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "format": self.image_format,
            "type": self.type,
            "url": self.url,
            "subdomains": self.get_layer_urls(),
            "layer": self.layer,
            "transparent": self.transparent,
            "layerParams": self.layer_params,
            "dynamicParams": self.dynamic_params,
            "refreshrate": self.refreshrate,
            "token": self.token,
            "attribution": self.attribution,
            "spatialReference": self.spatial_reference,
            "layerParsingFunction": self.layer_parsing_function,
            "enableIdentify": self.enable_identify,
            "rootField": self.root_field,
            "infoFormat": self.info_format,
            "fieldsToShow": self.fields_to_show,
            "description": self.description,
            "downloadableLink": self.downloadableLink,
            "layer_info_link" : self.layer_info_link,
            "styles": self.styles,
        }


    class Meta:
        ordering = ["name"]


class Map(models.Model):
    """
    A Map aggregates several layers together.
    """

    title = models.CharField(max_length=75)
    description = models.TextField(max_length=800, blank=True, null=True)
    zoom = models.IntegerField(help_text='Sets the default zoom level of the map.', default=5, blank=True, null=True)
    projection = models.CharField(max_length=32, blank=True, null=True, default="EPSG:4326", help_text='Set the default projection for layers added to this map. Note that the projection of the map is usually determined by that of the current baseLayer')
    center_x = models.FloatField(default=0.0, help_text='Sets the center x coordinate of the map.  Maps on event pages default to the location of the event.', blank=True, null=True)
    center_y = models.FloatField(default=0.0, help_text='Sets the center y coordinate of the map.  Maps on event pages default to the location of the event.', blank=True, null=True)
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
                "maplayer_id": map_layer.id,
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
                "dynamicParams": map_layer.layer.dynamic_params,
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
                "layer_info_link": map_layer.layer.layer_info_link,
                "styles": map_layer.layer.styles,
                "zIndex": map_layer.stack_order,
            }

        map_services = list()
        for map_layer in self.layers:
            map_services.append(layer_json(map_layer))

        return map_services

    def all_map_layers_json(self):
        map_services = list()
        for layer in Layer.objects.all():
            if not layer.disabled:
                map_services.append(layer.layer_json())
        return clean_dumps(map_services)

    def to_object(self):
        return {
                    "center_x": self.center_x or 0,
                    "center_y": self.center_y or 0,
                    "zoom": self.zoom or 15,
                    "projection": self.projection or "EPSG:4326",
                    "layers": self.map_layers_json(),
                    "all_layers": self.all_map_layers_json()
                }

    def to_json(self):
        obj = self.to_object()
        return clean_dumps(obj)

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
    opacity = models.FloatField(default=0.80)
    is_base_layer = models.BooleanField(help_text="Only one Base Layer can be enabled at any given time.")
    display_in_layer_switcher = models.BooleanField()

    class Meta:
        ordering = ["stack_order"]

    def __unicode__(self):
        return 'Layer {0}: {1}'.format(self.stack_order, self.layer)

class MapLayerUserRememberedParams(models.Model):
    """
    Remembers the last options selected for a MapLayer with dynamic feed params.
    """

    maplayer = models.ForeignKey(MapLayer, related_name="user_saved_params_set")
    user = models.ForeignKey(User, related_name="map_layer_saved_params_set")
    values = JSONField(null=True, blank=True, help_text='URL Variables that may be modified by the analyst. ex: "date"')

    @denormalized(models.ForeignKey, to=Map)
    @depend_on_related(MapLayer)
    def map(self):
        return self.maplayer.map.pk

class EditableMapLayer(models.Model):
    """
    Built to support editable layers such as OSM
    """
    name = models.CharField(max_length=200, help_text='Name that will be displayed within GeoQ')
    type = models.CharField(choices=EDITABLE_LAYER_TYPES, max_length=75)
    view_url = models.CharField(help_text='URL of view service.', max_length=500)
    edit_url = models.CharField(help_text='URL of service where changes can be pushed to. ', max_length=500)

    class Meta:
        ordering = ["name"]

    def __unicode__(self):
        return '{0} ({1})'.format(self.name, self.type)

class Feature(models.Model):
    """
    Model to represent features created in the application.
    """

    STATUS_VALUES = ['Unassigned', 'In work', 'Awaiting review', 'In review', 'Completed'] #'Assigned'
    STATUS_CHOICES = [(choice, choice) for choice in STATUS_VALUES]

    aoi = models.ForeignKey(AOI, related_name='features', editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    objects = models.GeoManager()
    analyst = models.ForeignKey(User, editable=False)
    template = models.ForeignKey("FeatureType", on_delete=models.PROTECT)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='In work')

    # Allow the user to save their own properties
    properties = JSONField(load_kwargs={}, blank=True, null=True)

    # These help the user identify features when data is exposed outside of the application (Geoserver).
    job = models.ForeignKey(Job, editable=False)
    project = models.ForeignKey(Project, editable=False)

    #Try this vs having individual models
    the_geom = models.GeometryField(blank=True, null=True)

    def geoJSON(self, as_json=True, using_style_template=True):
        """
        Returns geoJSON of the feature.
        Try to conform to https://github.com/mapbox/simplestyle-spec/tree/master/1.0.0
        """
        properties_main = self.properties or {}
        properties_built = dict(id=self.id,
                          status=self.status,
                          analyst=self.analyst.username,
                          created_at=datetime.strftime(self.created_at, '%Y-%m-%dT%H:%M:%S%Z'),
                          updated_at=datetime.strftime(self.updated_at, '%Y-%m-%dT%H:%M:%S%Z'),
                          )
        properties_template = self.template.properties or {}

        # properties_template can return a list from it's backing model, make sure we get the Dict
        if type(properties_template) == types.ListType:
            properties_template = properties_template[0]

        # srj: if using_style_template set, we're styling object from its feature id, else we'll
        #      just use the style properties (which should already be included if defined for feature)
        #      (we may want to set some defaults later on to make sure)
        if using_style_template:
            properties_built['template'] = self.template.id if hasattr(self.template, "id") else None

        properties = dict(properties_built.items() + properties_main.items() + properties_template.items())

        feature_type = FeatureType.objects.get(id=self.template.id)

        geojson = SortedDict()
        geojson["type"] = "Feature"
        geojson["properties"] = properties
        geojson["geometry"] = json.loads(self.the_geom.json)

        if feature_type and using_style_template:
            geojson["style"] = feature_type.style_to_geojson()
        else:
            geojson["style"] = feature_type.style

        if(as_json):
            return clean_dumps(geojson)
        else:
            for key in properties:
                if isinstance(properties[key],str) or isinstance(properties[key], unicode):
                    properties[key] = properties[key].replace('<', '&ltl').replace('>', '&gt;').replace("javascript:", "j_script-")
            return geojson

    def json_item(self, show_detailed_properties=False):
        properties_main = self.properties or {}

        #Pull the County data if it exists, otherwise find it and add it back to the object
        if properties_main.has_key('county'):
            county = properties_main['county']
        else:
            county_list = Counties.objects.filter(poly__contains=self.the_geom.centroid.wkt)
            if len(county_list):
                county = str(county_list[0].name)
            else:
                county = "Unknown"
            self.properties = properties_main


        if not show_detailed_properties:
            if 'linked_items' in properties_main:
                properties_main['linked_items'] = True
            else:
                properties_main['linked_items'] = False

        properties_built = dict(
            id=self.id,
            feature_type=str(self.template.name) if hasattr(self.template, "name") else self.template.id,
            analyst=str(self.analyst.username),
            workcell_id=self.aoi.id,
            status=str(self.status),
            county=county
            # created_at=datetime.strftime(self.created_at, '%Y-%m-%dT%H:%M:%S%Z'),
            # updated_at=datetime.strftime(self.updated_at, '%Y-%m-%dT%H:%M:%S%Z'),
        )

        properties_feature = dict(self.template.properties or {})

        properties = dict(properties_main.items() + properties_built.items() + properties_feature.items())
        return properties

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
        ('LineString', 'Line'),
        ('Polygon', 'Polygon'),
        # ('Text', 'Text'),
        # ('Overlay', 'Overlay'),  #TODO: Support overlay images. Should these be features?
    )

    name = models.CharField(max_length=200)
    type = models.CharField(choices=FEATURE_TYPES, max_length=25)
    category = models.CharField(max_length=25, default="", blank=True, null=True, help_text="An optional group to make finding this feature type easier. e.g. 'FEMA'")
    order = models.IntegerField(default=0, null=True, blank=True, help_text='Optionally specify the order features should appear on the edit menu. Lower numbers appear sooner.')
    properties = JSONField(load_kwargs={}, blank=True, null=True, help_text='Metadata added to properties of individual features. Should be in JSON format, e.g. {"severity":"high", "mapText":"Text to Show instead of icon"}')
    style = JSONField(load_kwargs={}, blank=True, null=True, help_text='Any special CSS style that features of this types should have. e.g. {"opacity":0.7, "color":"red", "backgroundColor":"white", "mapTextStyle":"white_overlay", "iconUrl":"path/to/icon.png"}')
    icon = models.ImageField(upload_to="static/featuretypes/", blank=True, null=True, help_text="Upload an icon (now only in Admin menu) of the FeatureType here, will override style iconUrl if set")

    def to_json(self):
        icon = ""
        if self.icon:
            icon = "/images/"+str(self.icon)
        return clean_dumps(dict(id=self.id,
                               properties=self.properties,
                               category=self.category,
                               order=self.order,
                               name=self.name,
                               type=self.type,
                               style=self.style,
                               icon=icon))

    def style_to_geojson(self):
        local_style = self.style

        if local_style and local_style.has_key('color'):
            local_style['stroke-color'] = local_style['color']
            local_style['fill-color'] = local_style['color']
            local_style.pop('color', None)
        if local_style and local_style.has_key('weight'):
            local_style['stroke-width'] = local_style['weight']
            local_style.pop('weight', None)
        if local_style and local_style.has_key('fill'):
            local_style['fill-opacity'] = local_style['fill']
            local_style.pop('fill', None)
        if local_style and local_style.has_key('iconUrl'):
            local_style['external-graphic'] = SERVER_URL + local_style['iconUrl']
            local_style.pop('iconUrl', None)

        return local_style

    def iconized(self, height=25):
        style_html = "height:"+str(height)+"px; "
        src = "/static/leaflet/images/gray-marker-icon.png"
        bgColor = ""
        opacity = "1"

        style = self.style or {}
        if self.icon:
            src = str("/images/"+str(self.icon))
        elif style.has_key('iconUrl'):
            src = str(style['iconUrl'])

        if style.has_key('weight'):
            style_html = style_html + "border-width:"+str(style['weight'])+"px; "
        if style.has_key('color'):
            color = str(style['color'])
            style_html = style_html + "border-color:"+color+"; "
            bgColor = color
        if style.has_key('fill'):
            bgColor = str(style['fill'])
        if style.has_key('opacity'):
            opacity = str(style['opacity'])

        if self.type == "Point":
            html = "<img src='"+src+"' style='"+style_html+"vertical-align:initial;' />"
        elif self.type == "LineString":
            style_html = style_html + "background-color:"+bgColor+"; "
            html = "<span style='"+style_html+"border-radius:4px; display:inline-block; opacity:"+opacity+"; width:5px; margin-left:3px; margin-right:5px;'> &nbsp; </span>"
        else:
            style_html = style_html + "background-color:"+bgColor+"; "
            html = "<span style='"+style_html+"border-radius:4px; display:inline-block; opacity:"+opacity+"; width:"+str(height)+"px;'> &nbsp; </span>"

        return html

    def style_json(self):
        return clean_dumps(self.style)

    def featuretypes(self):
        return FeatureType.objects.all()

    def get_absolute_url(self):
        return reverse('feature-type-update', args=[self.id])

    def __unicode__(self):
        return self.name

    class Meta:
        ordering = ['-category', 'order', 'name', 'id']


class GeoeventsSource(models.Model):
    name = models.CharField(max_length=200)
    url = models.URLField(help_text='URL of service location. Requires JSONP support', max_length=500)
