# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import json

from django.contrib.auth.models import User
from django.contrib.gis.db import models
from django.contrib.gis.geos import MultiPolygon
from django.contrib.contenttypes import generic
from django.contrib.contenttypes.models import ContentType
from django.core.urlresolvers import reverse
from django.utils.datastructures import SortedDict
from managers import AOIManager
from jsonfield import JSONField
from collections import defaultdict

TRUE_FALSE = [(0, 'False'), (1, 'True')]
STATUS_VALUES_LIST = ['Unassigned', 'Assigned', 'In work', 'Awaiting review', 'In review', 'Completed'] #'Assigned'


class Setting(models.Model):
    """
    Model for site-wide settings.
    """
    name = models.CharField(max_length=200, help_text="Name of site-wide variable")
    value = JSONField(null=True, blank=True, help_text="Value of site-wide variable that scripts can reference - must be valid JSON")

    def __unicode__(self):
        return self.name


class Assignment(models.Model):
    """
    A generic relation to either a user or group
    """
    assignee_type = models.ForeignKey(ContentType, null=True)
    assignee_id = models.PositiveIntegerField(null=True)
    content_object = generic.GenericForeignKey('assignee_type','assignee_id')

    class Meta:
        abstract = True


class GeoQBase(models.Model):
    """
    A generic model for GeoQ objects.
    """

    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    name = models.CharField(max_length=200)
    description = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)
    properties = JSONField(null=True, blank=True, help_text='JSON key/value pairs associated with this object, e.g. {"usng":"18 S TJ 87308 14549", "favorite":"true"}')

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
        ("Special Event", "Special Event"),
        ("Training", "Training"),
        ]

    project_type = models.CharField(max_length=50, choices=PROJECT_TYPES)
    private = models.BooleanField(default=False, help_text='Make this project available to all users.')
    project_admins = models.ManyToManyField(
        User, blank=True, null=True,
        related_name="project_admins", help_text='User that has admin rights to project.')
    contributors = models.ManyToManyField(
        User, blank=True, null=True,
        related_name="contributors", help_text='User that will be able to take on jobs.')

    class Meta:
        permissions = (
            ('open_project','Open Project'),('close_project','Close Project'),('archive_project','Archive Project'),
        )

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


class Job(GeoQBase, Assignment):
    """
    Mid-level organizational object.
    """

    GRID_SERVICE_VALUES = ['usng', 'mgrs']
    GRID_SERVICE_CHOICES = [(choice, choice) for choice in GRID_SERVICE_VALUES]

    analysts = models.ManyToManyField(User, blank=True, null=True, related_name="analysts")
    reviewers = models.ManyToManyField(User, blank=True, null=True, related_name="reviewers")
    progress = models.SmallIntegerField(max_length=2, blank=True, null=True)
    project = models.ForeignKey(Project, related_name="project")
    grid = models.CharField(max_length=5, choices=GRID_SERVICE_CHOICES, default=GRID_SERVICE_VALUES[0], help_text='Select usng for Jobs inside the US, otherwise use mgrs')
    tags = models.CharField(max_length=50, blank=True, null=True, help_text='Useful tags to search social media with')

    map = models.ForeignKey('maps.Map', blank=True, null=True)
    feature_types = models.ManyToManyField('maps.FeatureType', blank=True, null=True)

    class Meta:
        permissions = (
            ('assign_job','Assign Job'),
        )

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
    def aoi_counts_html(self):
        count = defaultdict(int)
        for cell in AOI.objects.filter(job__id=self.id):
            count[cell.status] += 1

        return str(', '.join("%s: <b>%r</b>" % (key,val) for (key,val) in count.iteritems()))

    @property
    def user_count(self):
        return self.analysts.count()

    def features_table_html(self):
        counts = {}

        for feature_item in self.feature_set.all():
            status = str(feature_item.status)
            featuretype = str(feature_item.template.name)
            if not featuretype in counts:
                counts[featuretype] = {}
            if not status in counts[featuretype]:
                counts[featuretype][status] = 0
            counts[featuretype][status] += 1

        #TODO: Also return this as JSON
        if len(counts):
            output = "<table class='job_feature_list'>"

            header = "<th><i>Feature Counts</i></th>"
            for (featuretype, status_obj) in counts.iteritems():
                header = header + "<th><b>"+featuretype+"</b></th>"
            output += "<tr>"+header+"</tr>"

            for status in STATUS_VALUES_LIST:
                status = str(status)
                row = "<td><b>"+status+"</b></td>"
                for (featuretype, status_obj) in counts.iteritems():
                    if status in status_obj:
                        val = status_obj[status]
                    else:
                        val = 0
                    row += "<td>" + str(val) + "</td>"
                output += "<tr>"+row+"</tr>"
            output += "</table>"
        else:
            output = ""

        return output

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

    def in_work(self):
        """
        Returns the AOIs currently being worked
        """
        return self.aois.filter(status='In work')

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

        return json.dumps(geojson, indent=2) if as_json else geojson

    def grid_geoJSON(self, as_json=True):
        """
        Return geoJSON of grid for export
        """

        geojson = SortedDict()
        geojson["type"] = "FeatureCollection"
        geojson["features"] = [json.loads(aoi.grid_geoJSON()) for aoi in self.aois.all()]

        return json.dumps(geojson) if as_json else geojson


class AOI(GeoQBase, Assignment):
    """
    Low-level organizational object. Now (6/1/14) referred to as a 'Workcell'
    """

    STATUS_VALUES = STATUS_VALUES_LIST
    STATUS_CHOICES = [(choice, choice) for choice in STATUS_VALUES]

    PRIORITIES = [(n, n) for n in range(1, 6)]

    analyst = models.ForeignKey(User, blank=True, null=True, help_text="User responsible for the AOI.")
    job = models.ForeignKey(Job, related_name="aois")
    reviewers = models.ManyToManyField(User, blank=True, null=True, related_name="aoi_reviewers",
                                       help_text='Users that actually reviewed this work.')
    objects = AOIManager()
    polygon = models.MultiPolygonField()
    priority = models.SmallIntegerField(choices=PRIORITIES, max_length=1, default=5)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='In Work')

    class Meta:
        permissions = (
            ('assign_aoi','Assign AOI'),('certify_aoi','Certify AOI'),
        )

    def __unicode__(self):
        aoi_obj = '%s - AOI %s' % (self.name, self.id)
        return aoi_obj

    @property
    def log(self):
        return Comment.objects.filter(aoi=self).order_by('created_at')

    #def save(self):
    # if analyst or reviewer updated, then create policy to give them permission to edit this object.....
    # -- Afterwards -- check how this will work with the views.

    def get_absolute_url(self):
        return reverse('aoi-work', args=[self.id])

    def geoJSON(self):
        """
        Returns geoJSON of the feature.
        """

        if self.id is None:
            self.id = 1

        geojson = SortedDict()
        geojson["type"] = "Feature"
        geojson["properties"] = dict(
            id=self.id,
            status=self.status,
            analyst=(self.analyst.username if self.analyst is not None else 'Unassigned'),
            priority=self.priority,
            absolute_url=reverse('aoi-work', args=[self.id]),
            delete_url=reverse('aoi-deleter', args=[self.id]))
        geojson["geometry"] = json.loads(self.polygon.json)

        return json.dumps(geojson)

    def logJSON(self):
        return [ob.to_dict() for ob in self.log]

    def properties_json(self):
        """
        Returns json of the feature properties.
        """

        if self.id is None:
            self.id = 1

        properties_main = self.properties or {}
        properties_built = dict(
            status=self.status,
            analyst=(self.analyst.username if self.analyst is not None else 'Unassigned'),
            priority=self.priority)
        prop_json = dict(properties_built.items() + properties_main.items())

        return json.dumps(prop_json)

    def grid_geoJSON(self):
        """
        Return geoJSON of workcells for export
        """

        if self.id is None:
            self.id = 1

        geojson = SortedDict()
        geojson["type"] = "Feature"
        geojson["properties"] = dict(
            id=self.id,
            priority=self.priority)
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


class Comment(models.Model):
    """
    Track comments regarding work on a Workcell
    """
    user = models.ForeignKey(User, blank=True, null=True, help_text="User who made comment")
    aoi = models.ForeignKey(AOI, blank=False, null=False, help_text="Associated AOI for comment")
    text = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    def __unicode__(self):
        comment_obj = '%s Comment on %s' % (self.user, self.aoi.id)
        return comment_obj

    def to_dict(self):
        format = "%D %H:%M:%S"
        o = {'user': self.user.username, 'timestamp': self.created_at.strftime(format), 'text': self.text}
        return o
