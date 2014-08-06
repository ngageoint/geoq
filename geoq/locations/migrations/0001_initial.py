# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'Counties'
        db.create_table(u'locations_counties', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=80)),
            ('state', self.gf('django.db.models.fields.IntegerField')(null=True, blank=True)),
            ('poly', self.gf('django.contrib.gis.db.models.fields.PolygonField')()),
        ))
        db.send_create_signal(u'locations', ['Counties'])


    def backwards(self, orm):
        # Deleting model 'Counties'
        db.delete_table(u'locations_counties')


    models = {
        u'locations.counties': {
            'Meta': {'object_name': 'Counties'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '80'}),
            'poly': ('django.contrib.gis.db.models.fields.PolygonField', [], {}),
            'state': ('django.db.models.fields.IntegerField', [], {'null': 'True', 'blank': 'True'})
        }
    }

    complete_apps = ['locations']