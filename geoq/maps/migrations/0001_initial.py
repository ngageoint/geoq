# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    depends_on = (
        ("core", "0001_initial"),
    )

    def forwards(self, orm):
        # Adding model 'Layer'
        db.create_table(u'maps_layer', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=200)),
            ('type', self.gf('django.db.models.fields.CharField')(max_length=75)),
            ('url', self.gf('django.db.models.fields.URLField')(max_length=200)),
            ('layer', self.gf('django.db.models.fields.CharField')(max_length=800, null=True, blank=True)),
            ('image_format', self.gf('django.db.models.fields.CharField')(max_length=75, null=True, blank=True)),
            ('styles', self.gf('django.db.models.fields.CharField')(max_length=200, null=True, blank=True)),
            ('transparent', self.gf('django.db.models.fields.BooleanField')(default=True)),
            ('refreshrate', self.gf('django.db.models.fields.PositiveIntegerField')(null=True, blank=True)),
            ('description', self.gf('django.db.models.fields.TextField')(max_length=800, null=True, blank=True)),
            ('attribution', self.gf('django.db.models.fields.CharField')(max_length=200, null=True, blank=True)),
            ('token', self.gf('django.db.models.fields.CharField')(max_length=400, null=True, blank=True)),
            ('extent', self.gf('django.contrib.gis.db.models.fields.PolygonField')(null=True, blank=True)),
            ('layer_parsing_function', self.gf('django.db.models.fields.CharField')(max_length=100, null=True, blank=True)),
            ('enable_identify', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('info_format', self.gf('django.db.models.fields.CharField')(max_length=75, null=True, blank=True)),
            ('root_field', self.gf('django.db.models.fields.CharField')(max_length=100, null=True, blank=True)),
            ('fields_to_show', self.gf('django.db.models.fields.CharField')(max_length=200, null=True, blank=True)),
            ('downloadableLink', self.gf('django.db.models.fields.URLField')(max_length=300, null=True, blank=True)),
            ('layer_params', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('spatial_reference', self.gf('django.db.models.fields.CharField')(default='EPSG:4326', max_length=32, null=True, blank=True)),
            ('constraints', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
            ('additional_domains', self.gf('django.db.models.fields.TextField')(null=True, blank=True)),
        ))
        db.send_create_signal(u'maps', ['Layer'])

        # Adding model 'Map'
        db.create_table(u'maps_map', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('title', self.gf('django.db.models.fields.CharField')(unique=True, max_length=75)),
            ('description', self.gf('django.db.models.fields.TextField')(max_length=800, null=True, blank=True)),
            ('zoom', self.gf('django.db.models.fields.IntegerField')()),
            ('projection', self.gf('django.db.models.fields.CharField')(default='EPSG:4326', max_length=32, null=True, blank=True)),
            ('center_x', self.gf('django.db.models.fields.FloatField')(default=0.0)),
            ('center_y', self.gf('django.db.models.fields.FloatField')(default=0.0)),
            ('created_at', self.gf('django.db.models.fields.DateTimeField')(auto_now_add=True, blank=True)),
            ('updated_at', self.gf('django.db.models.fields.DateTimeField')(auto_now_add=True, blank=True)),
        ))
        db.send_create_signal(u'maps', ['Map'])

        # Adding model 'MapLayer'
        db.create_table(u'maps_maplayer', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('map', self.gf('django.db.models.fields.related.ForeignKey')(related_name='map_set', to=orm['maps.Map'])),
            ('layer', self.gf('django.db.models.fields.related.ForeignKey')(related_name='map_layer_set', to=orm['maps.Layer'])),
            ('shown', self.gf('django.db.models.fields.BooleanField')(default=True)),
            ('stack_order', self.gf('django.db.models.fields.IntegerField')()),
            ('opacity', self.gf('django.db.models.fields.FloatField')(default=0.8)),
            ('is_base_layer', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('display_in_layer_switcher', self.gf('django.db.models.fields.BooleanField')(default=False)),
        ))
        db.send_create_signal(u'maps', ['MapLayer'])


    def backwards(self, orm):
        # Deleting model 'Layer'
        db.delete_table(u'maps_layer')

        # Deleting model 'Map'
        db.delete_table(u'maps_map')

        # Deleting model 'MapLayer'
        db.delete_table(u'maps_maplayer')


    models = {
        u'maps.layer': {
            'Meta': {'ordering': "['name']", 'object_name': 'Layer'},
            'additional_domains': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'attribution': ('django.db.models.fields.CharField', [], {'max_length': '200', 'null': 'True', 'blank': 'True'}),
            'constraints': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '800', 'null': 'True', 'blank': 'True'}),
            'downloadableLink': ('django.db.models.fields.URLField', [], {'max_length': '300', 'null': 'True', 'blank': 'True'}),
            'enable_identify': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'extent': ('django.contrib.gis.db.models.fields.PolygonField', [], {'null': 'True', 'blank': 'True'}),
            'fields_to_show': ('django.db.models.fields.CharField', [], {'max_length': '200', 'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'image_format': ('django.db.models.fields.CharField', [], {'max_length': '75', 'null': 'True', 'blank': 'True'}),
            'info_format': ('django.db.models.fields.CharField', [], {'max_length': '75', 'null': 'True', 'blank': 'True'}),
            'layer': ('django.db.models.fields.CharField', [], {'max_length': '800', 'null': 'True', 'blank': 'True'}),
            'layer_params': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'layer_parsing_function': ('django.db.models.fields.CharField', [], {'max_length': '100', 'null': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '200'}),
            'refreshrate': ('django.db.models.fields.PositiveIntegerField', [], {'null': 'True', 'blank': 'True'}),
            'root_field': ('django.db.models.fields.CharField', [], {'max_length': '100', 'null': 'True', 'blank': 'True'}),
            'spatial_reference': ('django.db.models.fields.CharField', [], {'default': "'EPSG:4326'", 'max_length': '32', 'null': 'True', 'blank': 'True'}),
            'styles': ('django.db.models.fields.CharField', [], {'max_length': '200', 'null': 'True', 'blank': 'True'}),
            'token': ('django.db.models.fields.CharField', [], {'max_length': '400', 'null': 'True', 'blank': 'True'}),
            'transparent': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'type': ('django.db.models.fields.CharField', [], {'max_length': '75'}),
            'url': ('django.db.models.fields.URLField', [], {'max_length': '200'})
        },
        u'maps.map': {
            'Meta': {'object_name': 'Map'},
            'center_x': ('django.db.models.fields.FloatField', [], {'default': '0.0'}),
            'center_y': ('django.db.models.fields.FloatField', [], {'default': '0.0'}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '800', 'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'projection': ('django.db.models.fields.CharField', [], {'default': "'EPSG:4326'", 'max_length': '32', 'null': 'True', 'blank': 'True'}),
            'title': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '75'}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'zoom': ('django.db.models.fields.IntegerField', [], {})
        },
        u'maps.maplayer': {
            'Meta': {'ordering': "['stack_order']", 'object_name': 'MapLayer'},
            'display_in_layer_switcher': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_base_layer': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'layer': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'map_layer_set'", 'to': u"orm['maps.Layer']"}),
            'map': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'map_set'", 'to': u"orm['maps.Map']"}),
            'opacity': ('django.db.models.fields.FloatField', [], {'default': '0.8'}),
            'shown': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'stack_order': ('django.db.models.fields.IntegerField', [], {})
        }
    }

    complete_apps = ['maps']