# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding field 'Feedback.title'
        db.add_column(u'feedback_feedback', 'title',
                      self.gf('django.db.models.fields.CharField')(default='GeoQ Feedback', max_length=80),
                      keep_default=False)

        # Adding unique constraint on 'Topic', fields ['name']
        db.create_unique(u'feedback_topic', ['name'])


    def backwards(self, orm):
        # Removing unique constraint on 'Topic', fields ['name']
        db.delete_unique(u'feedback_topic', ['name'])

        # Deleting field 'Feedback.title'
        db.delete_column(u'feedback_feedback', 'title')


    models = {
        u'feedback.feedback': {
            'Meta': {'object_name': 'Feedback'},
            'email': ('django.db.models.fields.EmailField', [], {'max_length': '75'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'message': ('django.db.models.fields.TextField', [], {}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '50'}),
            'title': ('django.db.models.fields.CharField', [], {'default': "'GeoQ Feedback'", 'max_length': '80'}),
            'topic': ('django.db.models.fields.related.ForeignKey', [], {'to': u"orm['feedback.Topic']"})
        },
        u'feedback.topic': {
            'Meta': {'object_name': 'Topic'},
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'unique': 'True', 'max_length': '50'})
        }
    }

    complete_apps = ['feedback']