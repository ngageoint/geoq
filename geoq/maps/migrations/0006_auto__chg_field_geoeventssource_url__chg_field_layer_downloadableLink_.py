# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):

        # Changing field 'GeoeventsSource.url'
        db.alter_column(u'maps_geoeventssource', 'url', self.gf('django.db.models.fields.URLField')(max_length=500))

        # Changing field 'Layer.downloadableLink'
        db.alter_column(u'maps_layer', 'downloadableLink', self.gf('django.db.models.fields.URLField')(max_length=400, null=True))

        # Changing field 'Layer.url'
        db.alter_column(u'maps_layer', 'url', self.gf('django.db.models.fields.URLField')(max_length=500))

        # Changing field 'Layer.layer_params'
        db.execute("""ALTER TABLE "maps_layer" \
                    ALTER COLUMN "layer_params" \
                    TYPE json using cast(layer_params as json), \
                    ALTER COLUMN "layer_params" DROP NOT NULL, \
                    ALTER COLUMN "layer_params" DROP DEFAULT; """)

    def backwards(self, orm):

        # Changing field 'GeoeventsSource.url'
        db.alter_column(u'maps_geoeventssource', 'url', self.gf('django.db.models.fields.URLField')(max_length=200))

        # Changing field 'Layer.downloadableLink'
        db.alter_column(u'maps_layer', 'downloadableLink', self.gf('django.db.models.fields.URLField')(max_length=300, null=True))

        # Changing field 'Layer.url'
        db.alter_column(u'maps_layer', 'url', self.gf('django.db.models.fields.URLField')(max_length=200))

        # Changing field 'Layer.layer_params'
        db.alter_column(u'maps_layer', 'layer_params', self.gf('django.db.models.fields.TextField')(null=True))

    models = {
        u'auth.group': {
            'Meta': {'object_name': 'Group'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '80'}),
            'permissions': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Permission']", 'symmetrical': 'False', 'blank': 'True'})
        },
        u'auth.permission': {
            'Meta': {'ordering': "(u'content_type__app_label', u'content_type__model', u'codename')", 'unique_together': "((u'content_type', u'codename'),)", 'object_name': 'Permission'},
            'codename': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'content_type': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['contenttypes.ContentType']"}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '50'})
        },
        u'auth.user': {
            'Meta': {'object_name': 'User'},
            'date_joined': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'email': ('django.db.models.fields.EmailField', [], {'max_length': '75', 'blank': 'True'}),
            'first_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'groups': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Group']", 'symmetrical': 'False', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_active': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'is_staff': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'is_superuser': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'last_login': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'last_name': ('django.db.models.fields.CharField', [], {'max_length': '30', 'blank': 'True'}),
            'password': ('django.db.models.fields.CharField', [], {'max_length': '128'}),
            'user_permissions': ('django.db.models.fields.related.ManyToManyField', [], {'to': u"orm['auth.Permission']", 'symmetrical': 'False', 'blank': 'True'}),
            'username': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '30'})
        },
        u'contenttypes.contenttype': {
            'Meta': {'ordering': "('name',)", 'unique_together': "(('app_label', 'model'),)", 'object_name': 'ContentType', 'db_table': "'django_content_type'"},
            'app_label': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'model': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'})
        },
        u'core.aoi': {
            'Meta': {'object_name': 'AOI'},
            'active': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'analyst': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']", 'null': 'True', 'blank': 'True'}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'job': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'aois'", 'to': u"orm['core.Job']"}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '200'}),
            'polygon': ('django.contrib.gis.db.models.fields.MultiPolygonField', [], {}),
            'priority': ('django.db.models.fields.SmallIntegerField', [], {'default': '5', 'max_length': '1'}),
            'reviewers': ('django.db.models.fields.related.ManyToManyField', [], {'blank': 'True', 'related_name': "'aoi_reviewers'", 'null': 'True', 'symmetrical': 'False', 'to': u"orm['auth.User']"}),
            'status': ('django.db.models.fields.CharField', [], {'default': "'Unassigned'", 'max_length': '15'}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'})
        },
        u'core.job': {
            'Meta': {'ordering': "('-created_at',)", 'object_name': 'Job'},
            'active': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'analysts': ('django.db.models.fields.related.ManyToManyField', [], {'blank': 'True', 'related_name': "'analysts'", 'null': 'True', 'symmetrical': 'False', 'to': u"orm['auth.User']"}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {}),
            'feature_types': ('django.db.models.fields.related.ManyToManyField', [], {'symmetrical': 'False', 'to': u"orm['maps.FeatureType']", 'null': 'True', 'blank': 'True'}),
            'grid': ('django.db.models.fields.CharField', [], {'default': "'usng'", 'max_length': '5'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'map': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['maps.Map']", 'null': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '200'}),
            'progress': ('django.db.models.fields.SmallIntegerField', [], {'max_length': '2', 'null': 'True', 'blank': 'True'}),
            'project': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'project'", 'to': u"orm['core.Project']"}),
            'reviewers': ('django.db.models.fields.related.ManyToManyField', [], {'blank': 'True', 'related_name': "'reviewers'", 'null': 'True', 'symmetrical': 'False', 'to': u"orm['auth.User']"}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'})
        },
        u'core.project': {
            'Meta': {'ordering': "('-created_at',)", 'object_name': 'Project'},
            'active': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'contributors': ('django.db.models.fields.related.ManyToManyField', [], {'blank': 'True', 'related_name': "'contributors'", 'null': 'True', 'symmetrical': 'False', 'to': u"orm['auth.User']"}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '200'}),
            'private': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'project_admins': ('django.db.models.fields.related.ManyToManyField', [], {'blank': 'True', 'related_name': "'project_admins'", 'null': 'True', 'symmetrical': 'False', 'to': u"orm['auth.User']"}),
            'project_type': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'})
        },
        u'maps.feature': {
            'Meta': {'ordering': "('-updated_at', 'aoi')", 'object_name': 'Feature'},
            'analyst': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['auth.User']"}),
            'aoi': ('django.db.models.fields.related.ForeignKey', [], {'related_name': "'features'", 'to': u"orm['core.AOI']"}),
            'created_at': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'job': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['core.Job']"}),
            'project': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['core.Project']"}),
            'properties': ('jsonfield.fields.JSONField', [], {'null': 'True', 'blank': 'True'}),
            'template': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['maps.FeatureType']", 'on_delete': 'models.PROTECT'}),
            'the_geom': ('django.contrib.gis.db.models.fields.GeometryField', [], {'null': 'True', 'blank': 'True'}),
            'updated_at': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'})
        },
        u'maps.featuretype': {
            'Meta': {'object_name': 'FeatureType'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '200'}),
            'properties': ('jsonfield.fields.JSONField', [], {'null': 'True', 'blank': 'True'}),
            'style': ('jsonfield.fields.JSONField', [], {'null': 'True', 'blank': 'True'}),
            'type': ('django.db.models.fields.CharField', [], {'max_length': '25'})
        },
        u'maps.geoeventssource': {
            'Meta': {'object_name': 'GeoeventsSource'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '200'}),
            'url': ('django.db.models.fields.URLField', [], {'max_length': '500'})
        },
        u'maps.layer': {
            'Meta': {'ordering': "['name']", 'object_name': 'Layer'},
            'additional_domains': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'attribution': ('django.db.models.fields.CharField', [], {'max_length': '200', 'null': 'True', 'blank': 'True'}),
            'constraints': ('django.db.models.fields.TextField', [], {'null': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'max_length': '800', 'null': 'True', 'blank': 'True'}),
            'downloadableLink': ('django.db.models.fields.URLField', [], {'max_length': '400', 'null': 'True', 'blank': 'True'}),
            'enable_identify': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'extent': ('django.contrib.gis.db.models.fields.PolygonField', [], {'null': 'True', 'blank': 'True'}),
            'fields_to_show': ('django.db.models.fields.CharField', [], {'max_length': '200', 'null': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'image_format': ('django.db.models.fields.CharField', [], {'max_length': '75', 'null': 'True', 'blank': 'True'}),
            'info_format': ('django.db.models.fields.CharField', [], {'max_length': '75', 'null': 'True', 'blank': 'True'}),
            'layer': ('django.db.models.fields.CharField', [], {'max_length': '800', 'null': 'True', 'blank': 'True'}),
            'layer_params': ('jsonfield.fields.JSONField', [], {'null': 'True', 'blank': 'True'}),
            'layer_parsing_function': ('django.db.models.fields.CharField', [], {'max_length': '100', 'null': 'True', 'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '200'}),
            'refreshrate': ('django.db.models.fields.PositiveIntegerField', [], {'null': 'True', 'blank': 'True'}),
            'root_field': ('django.db.models.fields.CharField', [], {'max_length': '100', 'null': 'True', 'blank': 'True'}),
            'spatial_reference': ('django.db.models.fields.CharField', [], {'default': "'EPSG:4326'", 'max_length': '32', 'null': 'True', 'blank': 'True'}),
            'styles': ('django.db.models.fields.CharField', [], {'max_length': '200', 'null': 'True', 'blank': 'True'}),
            'token': ('django.db.models.fields.CharField', [], {'max_length': '400', 'null': 'True', 'blank': 'True'}),
            'transparent': ('django.db.models.fields.BooleanField', [], {'default': 'True'}),
            'type': ('django.db.models.fields.CharField', [], {'max_length': '75'}),
            'url': ('django.db.models.fields.URLField', [], {'max_length': '500'})
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
            'zoom': ('django.db.models.fields.IntegerField', [], {'default': '5'})
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