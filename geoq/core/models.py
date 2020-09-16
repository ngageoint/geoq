# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import json
import html
import ast
from datetime import datetime, timedelta
from pytz import utc

from django.contrib.auth.models import User, Group
from django.contrib.gis.db import models
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils.timezone import make_aware
from django.urls import reverse
# from django.utils.datastructures import SortedDict
from .managers import AOIManager
from jsonfield import JSONField
from collections import defaultdict, OrderedDict
from django.db.models import Q
from geoq.training.models import Training
from geoq.ontology.models import Vocabulary
from geoq.core.utils import clean_dumps
from feedgen.feed import FeedGenerator

TRUE_FALSE = [(0, 'False'), (1, 'True')]
STATUS_VALUES_LIST = ['Unassigned', 'Assigned', 'In work', 'Awaiting review', 'In review', 'Completed']


class AssigneeType:
    USER, GROUP = list(range(1, 3))


class Setting(models.Model):
    """
    Model for site-wide settings.
    """
    name = models.CharField(max_length=200, help_text="Name of site-wide variable")
    value = JSONField(null=True, blank=True,
                      help_text="Value of site-wide variable that scripts can reference - must be valid JSON")

    def __unicode__(self):
        return self.name


class Assignment(models.Model):
    """
    A generic relation to either a user or group
    """
    assignee_type = models.ForeignKey(ContentType, null=True, on_delete=models.CASCADE)
    assignee_id = models.PositiveIntegerField(null=True)
    content_object = GenericForeignKey('assignee_type', 'assignee_id')

    class Meta:
        abstract = True


class GeoQBase(models.Model):
    """
    A generic model for GeoQ objects.
    """

    active = models.BooleanField(default=True, help_text="Check to make project 'Active' and visible to all users. Uncheck this to 'Archive' the project")
    created_at = models.DateTimeField(auto_now_add=True)
    name = models.CharField(max_length=200)
    description = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)
    properties = JSONField(null=True, blank=True,
                           help_text='JSON key/value pairs associated with this object, e.g. {"usng":"18 S TJ 87308 14549", "favorite":"true"}')

    def __unicode__(self):
        return self.name

    def __str__(self):
        return self.name

    class Meta:
        abstract = True
        ordering = ('active', '-created_at',)


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
    private = models.BooleanField(default=False, help_text="Check this to make this project 'Private' and available only to users assigned to it.")
    project_admins = models.ManyToManyField(
        User, blank=True,
        related_name="project_admins", help_text='User that has admin rights to project.')
    contributors = models.ManyToManyField(
        User, blank=True,
        related_name="contributors", help_text='User that will be able to take on jobs.')

    class Meta:
        permissions = (
            ('open_project', 'Open Project'), ('close_project', 'Close Project'),
            ('archive_project', 'Archive Project'),
        )
        ordering = ('-created_at',)

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
        return MultiPolygon([n.aois_envelope().envelope for n in self.jobs if n.aois.count()])

    @property
    def aois_envelope_by_job(self):
        jobs = []
        for job in self.jobs:
            if job.aois.count():
                job_envelope = job.aois_envelope()
                envelope_string = job_envelope.json
                if envelope_string:
                    job_poly = json.loads(envelope_string)
                    job_poly['properties'] = {"job_id": str(job.id), "link": str(job.get_absolute_url()),
                                              "name": str(job.name)}
                    jobs.append(job_poly)
        return clean_dumps(jobs, ensure_ascii=True)

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
    EDITORS = ['geoq','osm']
    EDITOR_CHOICES = [(choice, choice) for choice in EDITORS]

    analysts = models.ManyToManyField(User, blank=True, related_name="analysts")
    teams = models.ManyToManyField(Group, blank=True, related_name="teams")
    reviewers = models.ManyToManyField(User, blank=True, related_name="reviewers")
    progress = models.SmallIntegerField(blank=True, null=True)
    project = models.ForeignKey(Project, related_name="project", on_delete=models.PROTECT)

    grid = models.CharField(max_length=5, choices=GRID_SERVICE_CHOICES, default=GRID_SERVICE_VALUES[0],
                            help_text='Select usng for Jobs inside the US, otherwise use mgrs')
    tags = models.CharField(max_length=50, blank=True, null=True, help_text='Useful tags to search social media with')
    editor = models.CharField(max_length=20, help_text='Editor to be used for creating features', choices=EDITOR_CHOICES, default=EDITOR_CHOICES[0])
    editable_layer = models.ForeignKey( 'maps.EditableMapLayer', blank=True, null=True, on_delete=models.CASCADE)

    map = models.ForeignKey('maps.Map', blank=True, null=True, on_delete=models.CASCADE)
    workflow = models.ForeignKey('workflow.Workflow', blank=True, null=True,
                help_text='Workflow to be used for job',
                on_delete=models.PROTECT)
    feature_types = models.ManyToManyField('maps.FeatureType', blank=True)
    required_courses = models.ManyToManyField(Training, blank=True, help_text="Courses that must be passed to open these cells")
    vocabulary = models.ForeignKey(Vocabulary, blank=True, on_delete=models.PROTECT, null=True, help_text="Favorite words")

    class Meta:
        permissions = (

        )
        ordering = ('-created_at',)

    def get_absolute_url(self):
        return reverse('job-detail', args=[self.id])

    def get_update_url(self):
        return reverse('job-update', args=[self.id])

    def get_export_url(self):
        return reverse('job-export', args=[self.id])

    def aois_geometry(self):
        return self.aois.all().collect()

    def aois_envelope(self):
        """
        Returns the envelope of related AOIs geometry.
        """
        return self.aois.all().aggregate(envelope=models.Collect('polygon')).get('envelope')

    def aoi_count(self):
        return self.aois.count()

    @property
    def aois(self):
        return self.aois.all()

    @property
    def aoi_counts_html(self):
        STATE_VALUES = [i.name for i in self.workflow.path()]
        count = OrderedDict([(i,0) for i in STATE_VALUES])
        for cell in AOI.objects.filter(job__id=self.id):
            if cell.status in count:
                count[cell.status] += 1

        return str(', '.join("%s: <b>%r</b>" % (key, val) for (key, val) in list(count.items())))

    @property
    def user_count(self):
        return self.analysts.count()

    @property
    def base_layer(self):
        if self.map is not None and self.map.layers is not None:
            layers = sorted([l for l in self.map.layers if l.is_base_layer], key = lambda x: x.stack_order)
            if len(layers) > 0:
                layer = layers[0].layer
                return [layer.name, layer.url, layer.attribution]
            else:
                return []
        else:
            return []

    def features_table_html(self):
        counts = {}
        STATE_VALUES = [i.name for i in self.workflow.path()]

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
            for (featuretype, status_obj) in list(counts.items()):
                header = header + "<th><b>" + html.escape(featuretype) + "</b></th>"
            output += "<tr>" + header + "</tr>"

            for status in STATE_VALUES:
                status = str(status)
                row = "<td><b>" + status + "</b></td>"
                for (featuretype, status_obj) in list(counts.items()):
                    if status in status_obj:
                        val = status_obj[status]
                    else:
                        val = 0
                    row += "<td>" + html.escape(str(val)) + "</td>"
                output += "<tr>" + row + "</tr>"
            output += "</table>"
        else:
            output = ""

        return output

    def complete(self):
        """
        Returns the completed AOIs.
        """
        return self.aois.filter(status='Completed')

    def in_work(self):
        """
        Returns the AOIs currently being worked on or in review
        """
        return self.aois.filter(Q(status='In work') | Q(status='Awaiting review') | Q(status='In review'))

    def in_work_count(self):
        return self.in_work().count()

    def complete_count(self):
        return self.complete().count()

    def complete_percent(self):
        if self.aois.count() > 0:
            return round(float(self.complete().count() * 100) / self.aois.count(), 2)
        return 0.0

    def total_count(self):
        return self.aois.count()

    def geoJSON(self, as_json=True):
        """
        Returns geoJSON of the feature.
        """

        geojson = OrderedDict()
        geojson["type"] = "FeatureCollection"
        geojson["features"] = [json.loads(aoi.geoJSON()) for aoi in self.aois.all()]

        return clean_dumps(geojson) if as_json else geojson

    def features_geoJSON(self, as_json=True, using_style_template=True, from_date=None):

        geojson = OrderedDict()
        geojson["type"] = "FeatureCollection"
        geojson["properties"] = dict(id=self.id)

        if from_date is None:
            features = self.feature_set.all()
        else:
            features = self.feature_set.filter(**{"created_at__gt": from_date }).all()

        geojson["features"] = [n.geoJSON(as_json=False, using_style_template=using_style_template) for n in features]

        return clean_dumps(geojson, indent=2) if as_json else geojson

    def oneweek_features_geoJSON(self):
        today = datetime.now()
        delta = timedelta(days=7)
        timefilter = make_aware(today - delta)

        return self.features_geoJSON(from_date=timefilter)

    def grid_geoJSON(self, as_json=True):
        """
        Return geoJSON of grid for export
        """

        geojson = OrderedDict()
        geojson["type"] = "FeatureCollection"
        geojson["features"] = [json.loads(aoi.grid_geoJSON()) for aoi in self.aois.all()]

        return clean_dumps(geojson) if as_json else geojson

    def grid_atom(self, as_atom=True):
        """
        Return Atom feed of grid for export
        """

        geojson = OrderedDict()
        geojson["type"] = "FeatureCollection"
        geojson["features"] = [json.loads(aoi.grid_geoJSON()) for aoi in self.aois.all()]

        #return clean_dumps(geojson) if as_atom else geojson

        fg = FeedGenerator()
        fg.id('http://www.mitre.org/drms/')
        fg.title('DRMS Atom Feed')
        fg.author({'name': 'DRMS', 'email': 'drms-do-not-reply@mitre.org'})
        fg.link(href='http://www.mitre.org/', rel='alternate')
        #fg.logo('http://ex.com/logo.jpg')
        #fg.subtitle('This is a cool feed!')
        #fg.link(href='http://larskiesow.de/test.atom', rel='self')
        fg.language('en')

        # all_aois = self.aois.all()
        # all_aois_features = all_aois["features"]

        all_aois_features = geojson["features"]

        for i in all_aois_features:
            fe = fg.add_entry()
            fe.id('http://www.mitre.org/drms/')
            ip = i["properties"]
            title = "feature id {} -- status: {}, priority: {}".format(ip["id"], ip["status"], ip["priority"])
            fe.title(title)
            fe.link(href="http://www.mitre.org/drms/")

        # temp2_data = ["feature id {} -- status: ${i.properties.status}, priority: ${i.properties.priority}".format(i.properties.id, i.properties.status, i.properties.priority) for i in temp1_data["features"]]
        #
        # fe = fg.add_entry()
        # fe.id('http://www.mitre.org/drms/')
        # fe.title('The First Feed Item')
        # fe.link(href="http://www.mitre.org/drms/")

        atom = fg.atom_str(pretty=True)  # Get the ATOM feed as string
        #rssfeed = fg.rss_str(pretty=True)  # Get the RSS feed as string
        #fg.atom_file('atom.xml')  # Write the ATOM feed to a file
        #fg.rss_file('rss.xml')  # Write the RSS feed to a file



        return atom

    def grid_atom2(self, as_atom=True):
        """
        Return Atom feed of grid for export
        """

        geojson = OrderedDict()
        geojson["type"] = "FeatureCollection"
        geojson["features"] = [json.loads(aoi.grid_geoJSON()) for aoi in self.aois.all()]

        # return clean_dumps(geojson) if as_atom else geojson

        fg = FeedGenerator()
        fg.id('http://www.mitre.org/drms/')
        fg.title('DRMS Atom Feed')
        fg.author({'name': 'DRMS', 'email': 'drms-do-not-reply@mitre.org'})
        fg.link(href='http://www.mitre.org/', rel='alternate')
        #fg.logo('http://ex.com/logo.jpg')
        #fg.subtitle('This is a cool feed!')
        #fg.link(href='http://larskiesow.de/test.atom', rel='self')
        fg.language('en')

        # all_aois = self.aois.all()
        # all_aois_features = all_aois["features"]

        all_aois_features = geojson["features"]

        for i in all_aois_features:
            fe = fg.add_entry()
            fe.id('http://www.mitre.org/drms/')
            ip = i["properties"]
            title = "feature id {} -- status: {}, priority: {}".format(ip["id"], ip["status"], ip["priority"])
            fe.title(title)
            fe.link(href="http://www.mitre.org/drms/")

        # temp2_data = ["feature id {} -- status: ${i.properties.status}, priority: ${i.properties.priority}".format(i.properties.id, i.properties.status, i.properties.priority) for i in temp1_data["features"]]
        #
        # fe = fg.add_entry()
        # fe.id('http://www.mitre.org/drms/')
        # fe.title('The First Feed Item')
        # fe.link(href="http://www.mitre.org/drms/")

        atom = fg.atom_str(pretty=True)  # Get the ATOM feed as string
        #rssfeed = fg.rss_str(pretty=True)  # Get the RSS feed as string
        #fg.atom_file('atom.xml')  # Write the ATOM feed to a file
        #fg.rss_file('rss.xml')  # Write the RSS feed to a file



        return atom

    def base_layer_object(self):
        """
        create base layer object that can override leaflet base OSM map
        """

        obj = {}
        try:
            proj = int(self.map.projection[-4:])
        except ValueError:
            proj = 3857

        if (proj != 3857):
            obj['srid'] = proj

        if len(self.base_layer) > 0:
            obj["layers"] = [self.base_layer]

        return obj

    def work_summary_json(self):
        summary = dict()
        for a in self.aois.order_by('id').all():
            summary[a.id] = a.summary_properties_json()

        return clean_dumps(summary)


class AOI(GeoQBase, Assignment):
    """
    Low-level organizational object. Now (6/1/14) referred to as a 'Workcell'
    """

    # Not sure how we did this before... might have changed with implementation
    # of custom workflows
    STATUS_VALUES = STATUS_VALUES_LIST

    PRIORITIES = [(n, n) for n in range(1, 6)]

    analyst = models.ForeignKey(User, blank=True, null=True,
            help_text="User assigned to work the workcell.",
            on_delete=models.PROTECT)
    job = models.ForeignKey(Job, related_name="aois", on_delete=models.CASCADE)
    reviewers = models.ManyToManyField(User, blank=True, related_name="aoi_reviewers",
                                       help_text='Users that actually reviewed this work.')
    objects = AOIManager()
    polygon = models.MultiPolygonField()
    priority = models.SmallIntegerField(choices=PRIORITIES, default=5)
    status = models.CharField(max_length=15, default='Unassigned')

    class Meta:
        verbose_name = 'Area of Interest'
        verbose_name_plural = 'Areas of Interest'
        permissions = (
            ('assign_workcells', 'Assign Workcells'), ('certify_workcells', 'Certify Workcells'),
        )
        ordering = ['id']

    def __unicode__(self):
        aoi_obj = '%s - AOI %s' % (self.name, self.id)
        return aoi_obj

    @property
    def log(self):
        return Comment.objects.filter(aoi=self).order_by('created_at')

    @property
    def assignee_name(self):
        if self.assignee_id is None:
            return 'Unknown'
        else:
            if self.assignee_type_id == AssigneeType.USER:
                return User.objects.get(id=self.assignee_id).username
            else:
                return Group.objects.get(id=self.assignee_id).name


    #def save(self):
    # if analyst or reviewer updated, then create policy to give them permission to edit this object.....
    # -- Afterwards -- check how this will work with the views.

    def get_absolute_url(self):
        if self.job.editable_layer_id is None:
            return reverse('aoi-work', args=[self.id])
        else:
            return reverse('aoi-mapedit', args=[self.id])

    def geoJSON(self):
        """
        Returns geoJSON of the feature.
        """

        # determine name. if it's the same as the job, make it the id
        name = self.name if self.name != self.job.name else self.id

        if self.id is None:
            self.id = 1

        user_label = 'None'
        if self.analyst is not None:
            if len(self.analyst.last_name) > 0:
                user_label = "%s %s" % (self.analyst.first_name, self.analyst.last_name)
            else:
                user_label = self.analyst.username

        # see if we have the size of the AOI
        size = "unknown"
        if 'MISQRD' in self.properties or 'KMSQRD' in self.properties:
            size = "%s km2" % self.properties['KMSQRD'] if 'KMSQRD' in self.properties else "%s mi2" % self.properties['MISQRD']

        geojson = OrderedDict()
        geojson["type"] = "Feature"
        geojson["properties"] = dict(
            id=self.id,
            status=self.status,
            size = size,
            analyst=(self.analyst.username if self.analyst is not None else 'None'),
            assignee=self.assignee_name,
            priority=self.priority,
            name=self.properties['GEO_ID'] if 'GEO_ID' in self.properties else self.name,
            delete_url=reverse('aoi-deleter', args=[self.id]))
        geojson["geometry"] = json.loads(self.polygon.json)

        geojson["properties"]["absolute_url"] = self.get_absolute_url()

        return clean_dumps(geojson)

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
        properties_built.update(properties_main)

        return clean_dumps(properties_built)

    def summary_properties_json(self):
        """
        Return json with additional properties
        """

        properties_main = self.properties or {}
        properties_built = dict(
            status = self.status,
            analyst = (self.analyst.username if self.analyst is not None else 'Unassigned'),
            team = (self.assignee_name if self.assignee_id is not None else 'Unassigned'),
            priority = self.priority)
        prop_json = dict(list(properties_built.items()) + list(properties_main.items()))

        # capture how much time was spent on each state for the AOI
        # We'll make this configurable later on, but just capture 'In work' for now
        capture_states =  ['In work']
        capture_metrics = dict()
        for c in capture_states:
            #TODO: really not querying for state (c)
            tdelta = AOITimer.objects.extra(select={'elapsed': 'SELECT SUM(completed_at - started_at) FROM core_aoitimer WHERE aoi_id=%s' % self.id}).values('elapsed')
            capture_metrics[c] = tdelta[0]['elapsed'].seconds if tdelta[0]['elapsed'] is not None else 0

        prop_json['timer'] = capture_metrics

        # see if there's a completion date
        if AOITimer.objects.filter(aoi=self,status='In work').count() > 0:
            fin_date = AOITimer.objects.filter(aoi=self,status='In work').latest('id').completed_at
            prop_json['completion_date'] = fin_date.strftime("%m/%d/%Y") if fin_date is not None else 'Not finished'

        # And see if we've completed any analysis
        images = WorkcellImage.objects.filter(workcell=self,status='Accepted')
        if images.count() == 0:
            prop_json['analyzed'] = "0/0 0%"
        else:
            total = images.count()
            analyzed = images.filter(exam_date__isnull=False).count()
            prop_json['analyzed'] = "%d/%d %d%%" % (analyzed,total,int(analyzed/float(total)*100))

        # And objects found
        prop_json['features'] = self.features.count()

        return prop_json


    def map_detail(self):
        """
        Get map coordinates for MapEdit
        """
        center = self.polygon.centroid
        return "15/%f/%f" % (center.y, center.x)

    def grid_geoJSON(self):
        """
        Return geoJSON of workcells for export
        """

        if self.id is None:
            self.id = 1

        geojson = OrderedDict()
        geojson["type"] = "Feature"
        geojson["properties"] = dict(
            id=self.id,
            priority=self.priority,
            status=self.status)
        geojson["geometry"] = json.loads(self.polygon.json)

        return clean_dumps(geojson)

    def user_can_complete(self, user):
        """
        Returns whether the user can update the AOI as complete.
        """
        return user == self.analyst or user in self.job.reviewers.all()

class Comment(models.Model):
    """
    Track comments regarding work on a Workcell
    """
    user = models.ForeignKey(User, blank=True, null=True,
                help_text="User who made comment", on_delete=models.CASCADE)
    aoi = models.ForeignKey(AOI, blank=False, null=False,
                help_text="Associated AOI for comment", on_delete=models.CASCADE)
    text = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    def __unicode__(self):
        comment_obj = '%s Comment on %s' % (self.user, self.aoi.id)
        return comment_obj

    def to_dict(self):
        format = "%D %H:%M:%S"
        if self.user:
            username = self.user.username
        else:
            username = "Anonymous or Removed User"
        o = {'user': username, 'timestamp': self.created_at.strftime(format), 'text': self.text}
        return o


class Organization(models.Model):
    """
    Organizations and Agencies that we work with.
    """
    name = models.CharField(max_length=200, unique=True, help_text="Short name of this organization")
    url = models.CharField(max_length=600, blank=True, null=True, help_text="Link that users should be directed to if icon is clicked")
    icon = models.ImageField(upload_to="static/organizations/", blank=True, null=True, help_text="Upload an icon of the organization here")
    show_on_front = models.BooleanField(default=False, help_text="Show on the front of the GeoQ App")
    order = models.IntegerField(default=0, null=True, blank=True, help_text='Optionally specify the order orgs should appear on the front page. Lower numbers appear sooner.')

    def __unicode__(self):
        return self.name

    class Meta:
        verbose_name_plural = 'Organizations'
        ordering = ['order', 'name']


class AOITimer(models.Model):
    """
    Capture start/stop times for different phases of the workcell (AOI)
    """
    user = models.ForeignKey(User, blank=False,
                help_text="User who worked on workcell", on_delete=models.CASCADE)
    aoi = models.ForeignKey(AOI, blank=False,
                help_text="Workcell that was changed", on_delete=models.CASCADE)
    status = models.CharField(max_length=20, blank=False, default='Unassigned')
    started_at = models.DateTimeField(auto_now_add=False, blank=False)
    completed_at = models.DateTimeField(auto_now_add=False, blank=True, null=True)

    def __unicode__(self):
        return "%s activity on %s" % (self.user.username, self.aoi.id)

    class Meta:
        permissions = (

        )
        ordering = ('user','aoi',)

    @property
    def running(self):
        return self.completed_at is None

    @property
    def timeLapse(self):
        if self.completed_at is None:
            return datetime.datetime.now(utc) - self.started_at
        else:
            return self.competed_at - self.started_at

    @property
    def savable(self):
        if self.completed_at is None:
            return False

        return self.completed_at - self.started_at > timedelta(minutes=1)

class Responder(models.Model):
    name = models.CharField(max_length=250)
    contact_instructions = models.CharField(max_length=1024)
    in_field = models.BooleanField()
    last_seen = models.DateTimeField(null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    latitude = models.DecimalField(max_digits=10, decimal_places=7)

    def __unicode__(self):
        return self.name

    def geoJSON(self, as_json=True):
        """
        Returns geoJSON of the feature.
        """
        geojson = OrderedDict()
        geojson["type"] = "Feature"
        geojson["geometry"] = { "type": "Point", "coordinates": [self.longitude, self.latitude]}
        # geojson["geometry"] = {"type": "Point", "coordinates": [self.point.x, self.point.y]}
        geojson["properties"] = {
            "id": self.id,
            "name": self.name,
            "contact_instructions": self.contact_instructions,
            "in_field":  self.in_field,
            "last_seen": self.last_seen
        }

        return clean_dumps(geojson) if as_json else geojson
