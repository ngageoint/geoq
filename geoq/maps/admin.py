# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import reversion
from django.contrib.gis import admin
from models import Layer, Map, MapLayer, Feature, FeatureType, GeoeventsSource, EditableMapLayer


class MapLayerInline(admin.TabularInline):
    model = MapLayer
    extra = 1


class MapAdmin(reversion.VersionAdmin, admin.ModelAdmin):
    model = Map
    list_display = ['__unicode__', 'description',]
    inlines = [MapLayerInline]
    save_as = True
    ordering = ['title']
    search_fields = ['description', 'title', 'tags', ]

class LayerAdmin(reversion.VersionAdmin, admin.OSMGeoAdmin):
    model = Layer
    list_display = ['name', 'type', 'url']
    list_filter = ['type', 'image_format']
    save_as = True
    search_fields = ['name', 'url', 'type', ]
    normal_fields = ('name', 'type', 'url', 'layer', 'attribution', 'description', 'image_format')
    advanced_fields = ( 'disabled',
     'styles', 'refreshrate', 'transparent', 'enable_identify',
     'token', 'additional_domains', 'constraints', 'extent', 'layer_parsing_function', 'info_format',
     'root_field', 'fields_to_show', 'downloadableLink', 'spatial_reference', 'layer_params',
     'layer_info_link' )

    desc = 'The settings below are advanced.  Please contact and admin if you have questions.'
    fieldsets = (
        (None, {'fields': normal_fields}),
        ('Advanced Settings', {'classes': ('collapse',),
                               'description': desc,
                               'fields': advanced_fields,
                               }))


class MapLayerAdmin(reversion.VersionAdmin, admin.ModelAdmin):
    model = MapLayer
    list_display = ['__unicode__', 'map', 'layer', 'stack_order', 'opacity', 'is_base_layer']
    list_filter = ['map', 'layer', 'stack_order',  'is_base_layer']

class EditableMapLayerAdmin(admin.ModelAdmin):
    model = EditableMapLayer
    list_display = ['name','type','edit_url','view_url']


class FeatureAdmin(reversion.VersionAdmin, admin.OSMGeoAdmin):
    list_display = ['template', 'status', 'aoi', 'job', 'analyst', 'created_at']
    list_filter = ['template', 'status', 'analyst',  'job']

    fields = ('template',  'status', 'properties')
    readonly_fields = ('analyst', 'aoi', 'created_at', 'updated_at')

class FeatureTypeAdmin(reversion.VersionAdmin, admin.ModelAdmin):
    list_display = ['name', 'category', 'type', 'order']
    ordering = ('-category', 'order', 'name', 'id')
    save_as = True

class GeoeventsSourceAdmin(admin.ModelAdmin):
    model = GeoeventsSource
    list_display = ['name', 'url']

#admin.site.register(Point, FeatureAdmin)
#admin.site.register(Polygon, FeatureAdmin)
admin.site.register(Feature, FeatureAdmin)
admin.site.register(FeatureType, FeatureTypeAdmin)
admin.site.register(Layer, LayerAdmin)
admin.site.register(Map, MapAdmin)
admin.site.register(EditableMapLayer, EditableMapLayerAdmin)
admin.site.register(GeoeventsSource, GeoeventsSourceAdmin)
