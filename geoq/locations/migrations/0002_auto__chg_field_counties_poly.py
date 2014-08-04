# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):

        # Changing field 'Counties.poly'
        db.alter_column(u'locations_counties', 'poly', self.gf('django.contrib.gis.db.models.fields.MultiPolygonField')())

    def backwards(self, orm):

        # Changing field 'Counties.poly'
        db.alter_column(u'locations_counties', 'poly', self.gf('django.contrib.gis.db.models.fields.PolygonField')())

    models = {
        u'locations.counties': {
            'Meta': {'object_name': 'Counties'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '80'}),
            'poly': ('django.contrib.gis.db.models.fields.MultiPolygonField', [], {}),
            'state': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'})
        }
    }

    complete_apps = ['locations']