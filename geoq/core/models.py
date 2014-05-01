# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import json
import sys

from django.contrib.auth.models import User
from django.contrib.gis.db import models
from django.contrib.gis.geos import MultiPolygon
from django.core.urlresolvers import reverse
from django.utils.datastructures import SortedDict
from managers import AOIManager

TRUE_FALSE = [(0, 'False'), (1, 'True')]


class GeoQBase(models.Model):
    """
    A generic model for GeoQ objects.
    """

    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    name = models.CharField(max_length=200)
    description = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    def __unicode__(self):
        return self.name

    class Meta:
        abstract = True
        ordering = ('-created_at',)


class Project(GeoQBase):
    """
    Top-level organizational object.
    """

    PROJECT_TYPES = [
        ("Hurricane/Cyclone", "Hurricane/Cyclone"),
        ("Tornado", "Tornado"),
        ("Earthquake", "Earthquake"),
        ("Extreme Weather", "Extreme Weather"),
        ("Fire", "Fire"),
        ("Flood", "Flood"),
        ("Tsunami", "Tsunami"),
        ("Volcano", "Volcano"),
        ("Pandemic", "Pandemic"),
        ("Exercise", "Exercise"),
        ]

    project_type = models.CharField(max_length=50, choices=PROJECT_TYPES)
    private = models.BooleanField(default=False, help_text='Make this project available to all users.')
    project_admins = models.ManyToManyField(User, blank=True, null=True,
        related_name="project_admins", help_text='User that has admin rights to project.')
    contributors = models.ManyToManyField(User, blank=True, null=True,
        related_name="contributors", help_text='User that will be able to take on jobs.')

    @property
    def jobs(self):
        return Job.objects.filter(project=self)

    @property
    def job_count(self):
        return self.jobs.count()

    @property
    def user_count(self):
        return User.objects.filter(analysts__project__id=self.id).distinct().count()

    @property
    def aois(self):
        return AOI.objects.filter(job__project__id=self.id)

    @property
    def aoi_count(self):
        return self.aois.count()

    @property
    def aois_envelope(self):
        return MultiPolygon([n.aois_envelope() for n in self.jobs if n.aois.count()])

    def get_absolute_url(self):
        return reverse('project-detail', args=[self.id])

    def get_update_url(self):
        return reverse('project-update', args=[self.id])


class Job(GeoQBase):
    """
    Mid-level organizational object.
    """

    analysts = models.ManyToManyField(User, blank=True, null=True, related_name="analysts")
    reviewers = models.ManyToManyField(User, blank=True, null=True, related_name="reviewers")
    progress = models.SmallIntegerField(max_length=2, blank=True, null=True)
    project = models.ForeignKey(Project, related_name="project")

    map = models.ForeignKey('maps.Map', blank=True, null=True)
    feature_types = models.ManyToManyField('maps.FeatureType', blank=True, null=True)

    def get_absolute_url(self):
        return reverse('job-detail', args=[self.id])

    def get_update_url(self):
        return reverse('job-update', args=[self.id])

    def aois_geometry(self):
        return self.aois.all().collect()

    def aois_envelope(self):
        """
        Returns the envelope of related AOIs geometry.
        """
        return getattr(self.aois.all().collect(), 'envelope', None)

    def aoi_count(self):
        return self.aois.count()

    @property
    def user_count(self):
        return self.analysts.count()

    def unassigned_aois(self):
        """
        Returns the unassigned AOIs.
        """
        return self.aois.filter(status='Unassigned')

    def in_work_aois(self):
        """
        Returns the in work AOIs.
        """
        return self.aois.filter(status='In work')

    def complete(self):
        """
        Returns the completed AOIs.
        """
        return self.aois.filter(status='Completed')

    def geoJSON(self, as_json=True):
        """
        Returns geoJSON of the feature.
        """

        geojson = SortedDict()
        geojson["type"] = "FeatureCollection"
        geojson["features"] = [json.loads(aoi.geoJSON()) for aoi in self.aois.all()]

        return json.dumps(geojson) if as_json else geojson

    def features_geoJSON(self, as_json=True):

        geojson = SortedDict()
        geojson["type"] = "FeatureCollection"
        geojson["properties"] = dict(id=self.id)
        geojson["features"] = [n.geoJSON(as_json=False) for n in self.feature_set.all()]

        return json.dumps(geojson) if as_json else geojson


class AOI(GeoQBase):
    """
    Low-level organizational object.
    """

    STATUS_VALUES = ['Unassigned', 'Assigned', 'In work', 'Submitted', 'Completed']
    STATUS_CHOICES = [(choice, choice) for choice in STATUS_VALUES]

    PRIORITIES = [(n, n) for n in range(1, 6)]

    analyst = models.ForeignKey(User, blank=True, null=True, help_text="User responsible for the AOI.")
    job = models.ForeignKey(Job, related_name="aois")
    reviewers = models.ManyToManyField(User, blank=True, null=True, related_name="aoi_reviewers",
                                       help_text='Users that actually reviewed this work.')
    objects = AOIManager()
    polygon = models.MultiPolygonField()
    priority = models.SmallIntegerField(choices=PRIORITIES, max_length=1, default=5)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='Unassigned')

    def __unicode__(self):
        aoi_obj = '%s - AOI %s' % (self.name, self.id)
        return aoi_obj

    #def save(self):
    # if analyst or reviewer updated, then create policy to give them permission to edit this object.....
    # -- Afterwards -- check how this will work with the views.

    def get_absolute_url(self):
        return reverse('aoi-work', args=[self.id])

    def geoJSON(self):
        """
        Returns geoJSON of the feature.
        """

        if (self.id == None):
            self.id = 1

        geojson = SortedDict()
        geojson["type"] = "Feature"
        geojson["properties"] = dict(id=self.id, status=self.status, analyst=(self.analyst.username if self.analyst is not None else 'Unassigned'), priority=self.priority, absolute_url=reverse('aoi-work', args=[self.id]))
        geojson["geometry"] = json.loads(self.polygon.json)

        return json.dumps(geojson)

    def user_can_complete(self, user):
        """
        Returns whether the user can update the AOI as complete.
        """
        return user == self.analyst or user in self.job.reviewers.all()

    class Meta:
        verbose_name = 'Area of Interest'
        verbose_name_plural = 'Areas of Interest'


# if not 'syncdb' in sys.argv[1:2] and not 'migrate' in sys.argv[1:2]:
#     from accounts.meta_badges import *
