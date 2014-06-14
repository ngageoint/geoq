# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import json
import requests

from django.contrib.auth.decorators import login_required
from django.contrib.gis.geos import GEOSGeometry
from django.core.urlresolvers import reverse
from django.core.exceptions import ObjectDoesNotExist
from django.forms.util import ValidationError
from django.http import Http404, HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404, redirect, render
from django.views.generic import DetailView, ListView, TemplateView, View, DeleteView, CreateView, UpdateView
from django.contrib.gis.shortcuts import render_to_kml

from models import Project, Job, AOI
from geoq.maps.models import Layer, Map, FeatureType

from geoq.mgrs.utils import Grid, GridException
from geoq.core.utils import send_aoi_create_event
from geoq.mgrs.exceptions import ProgramException


class Dashboard(TemplateView):

    template_name = 'core/dashboard.html'

    def get_context_data(self, **kwargs):
        cv = super(Dashboard, self).get_context_data(**kwargs)
        cv['projects'] = Project.objects.all()
        return cv


class BatchCreateAOIS(TemplateView):
    """
    Reads GeoJSON from post request and creates AOIS for each features.
    """
    template_name = 'core/job_batch_create_aois.html'

    def get_context_data(self, **kwargs):
        cv = super(BatchCreateAOIS, self).get_context_data(**kwargs)
        cv['object'] = get_object_or_404(Job, pk=self.kwargs.get('job_pk'))
        return cv

    def post(self, request, *args, **kwargs):
        aois = request.POST.get('aois')
        job = Job.objects.get(id=self.kwargs.get('job_pk'))

        try:
            aois = json.loads(aois)
        except ValueError:
            raise ValidationError(_("Enter valid JSON"))

        response = AOI.objects.bulk_create([AOI(name=job.name,
                                            job=job,
                                            description=job.description,
                                            polygon=GEOSGeometry(json.dumps(aoi.get('geometry')))) for aoi in aois])

        return HttpResponse()


#TODO: Abstract this
class DetailedListView(ListView):
    """
    A mixture between a list view and detailed view.
    """

    paginate_by = 15
    model = Project

    def get_queryset(self):
        return Job.objects.filter(project=self.kwargs.get('pk'))

    def get_context_data(self, **kwargs):
        cv = super(DetailedListView, self).get_context_data(**kwargs)
        cv['object'] = get_object_or_404(self.model, pk=self.kwargs.get('pk'))
        return cv


class CreateFeaturesView(DetailView):
    template_name = 'core/edit.html'
    queryset = AOI.objects.all()

    def get_context_data(self, **kwargs):
        cv = super(CreateFeaturesView, self).get_context_data(**kwargs)
        cv['reviewers'] = kwargs['object'].job.reviewers.all()
        cv['admin'] = self.request.user.is_superuser or self.request.user.groups.filter(name='admin_group').count() > 0

        cv['map'] = self.object.job.map
        cv['aoi'].analyst = self.request.user
        cv['aoi'].status = 'In work'
        cv['aoi'].save()
        return cv


def redirect_to_unassigned_aoi(request, pk):
    """
    Given a job, redirects the view to an unassigned AOI.  If there are no unassigned AOIs, the user will be redirected
     to the job's absolute url.
    """
    job = get_object_or_404(Job, id=pk)

    try:
        return HttpResponseRedirect(job.aois.filter(status='Unassigned')[0].get_absolute_url())
    except IndexError:
        return HttpResponseRedirect(job.get_absolute_url())


class JobDetailedListView(ListView):
    """
    A mixture between a list view and detailed view.
    """

    paginate_by = 15
    model = Job
    default_status = 'in work'
    request = None

    def get_queryset(self):
        status = getattr(self, 'status', None)
        q_set = AOI.objects.filter(job=self.kwargs.get('pk'))

        # # If there is a user logged in, we want to show their stuff
        # # at the top of the list
        if self.request.user.id is not None and status == 'in work':
            user = self.request.user
            clauses = 'WHEN analyst_id=%s THEN %s ELSE 1' % (user.id, 0)
            ordering = 'CASE %s END' % clauses
            self.queryset = q_set.extra(
               select={'ordering': ordering}, order_by=('ordering',))
        else:
            self.queryset = q_set

        if status and (status in [value.lower() for value in AOI.STATUS_VALUES]):
            return self.queryset.filter(status__iexact=status)
        else:
            return self.queryset

    def get(self, request, *args, **kwargs):
        self.status = self.kwargs.get('status')

        if self.status and hasattr(self.status, "lower"):
            self.status = self.status.lower()
        else:
            self.status = self.default_status.lower()

        self.request = request

        return super(JobDetailedListView, self).get(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        cv = super(JobDetailedListView, self).get_context_data(**kwargs)
        cv['object'] = get_object_or_404(self.model, pk=self.kwargs.get('pk'))
        cv['statuses'] = AOI.STATUS_VALUES
        cv['active_status'] = self.status
        if cv['object'].aoi_count() > 0:
            cv['completed'] = (cv['object'].complete().count() * 100) / cv['object'].aoi_count()
        else:
            cv['completed'] = 0
        return cv


class JobDelete(DeleteView):
    model = Job
    template_name = "core/generic_confirm_delete.html"

    def get_success_url(self):
        return reverse('project-detail', args=[self.object.project.pk])


class AOIDelete(DeleteView):
    model = AOI
    template_name = "core/generic_confirm_delete.html"

    def get_success_url(self):
        return reverse('job-detail', args=[self.object.job.pk])


class AOIDetailedListView(ListView):
    """
    A mixture between a list view and detailed view.
    """

    paginate_by = 25
    model = AOI
    default_status = 'unassigned'

    def get_queryset(self):
        status = getattr(self, 'status', None)
        self.queryset = AOI.objects.all()
        if status and (status in [value.lower() for value in AOI.STATUS_VALUES]):
            return self.queryset.filter(status__iexact=status)
        else:
            return self.queryset

    def get(self, request, *args, **kwargs):
        self.status = self.kwargs.get('status')

        if self.status and hasattr(self.status, "lower"):
            self.status = self.status.lower()
        else:
            self.status = self.default_status.lower()

        return super(AOIDetailedListView, self).get(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        cv = super(AOIDetailedListView, self).get_context_data(**kwargs)
        cv['statuses'] = AOI.STATUS_VALUES
        cv['active_status'] = self.status
        return cv


class CreateProjectView(CreateView):
    """
    Create view that adds the user that created the job as a reviewer.
    """

    def form_valid(self, form):
        """
        If the form is valid, save the associated model and add the current user as a reviewer.
        """
        self.object = form.save()
        self.object.project_admins.add(self.request.user)
        self.object.save()
        return HttpResponseRedirect(self.get_success_url())

class CreateJobView(CreateView):
    """
    Create view that adds the user that created the job as a reviewer.
    """

    def get_form_kwargs(self):
        kwargs = super(CreateJobView, self).get_form_kwargs()
        kwargs['project'] = self.request.GET['project'] if 'project' in self.request.GET else 0
        return kwargs

    def form_valid(self, form):
        """
        If the form is valid, save the associated model and add the current user as a reviewer.
        """
        self.object = form.save()
        self.object.reviewers.add(self.request.user)
        self.object.save()
        return HttpResponseRedirect(self.get_success_url())


class UpdateJobView(UpdateView):
    """
    Update Job
    """

    def get_form_kwargs(self):
        kwargs = super(UpdateJobView, self).get_form_kwargs()
        kwargs['project'] = kwargs['instance'].project_id if hasattr(kwargs['instance'],'project_id') else 0
        return kwargs


class ChangeAOIStatus(View):
    http_method_names = ['post','get']

    def _get_aoi_and_update(self, pk):
        aoi = get_object_or_404(AOI, pk=pk)
        status = self.kwargs.get('status')
        return status, aoi

    def _update_aoi(self, request, aoi, status):
        aoi.analyst = request.user
        aoi.status = status
        aoi.save()
        return aoi

    def get(self, request, **kwargs):
        # Used to unassign tasks on the job detail, 'in work' tab

        status, aoi = self._get_aoi_and_update(self.kwargs.get('pk'))

        if aoi.user_can_complete(request.user):
            aoi = self._update_aoi(request, aoi, status)

        try:
            url = request.META['HTTP_REFERER']
            return redirect(url)
        except KeyError:
            return redirect('/geoq/jobs/%s/' % aoi.job.id)

    def post(self, request, **kwargs):

        status, aoi = self._get_aoi_and_update(self.kwargs.get('pk'))

        if aoi.user_can_complete(request.user):
            aoi = self._update_aoi(request, aoi, status)

            # send aoi completion event for badging
            send_aoi_create_event(request.user, aoi.id, aoi.features.all().count())
            return HttpResponse(json.dumps({aoi.id: aoi.status}), mimetype="application/json")
        else:
            error = dict(error=403,
                         details="User not allowed to modify the status of this AOI.",)
            return HttpResponse(json.dumps(error), status=error.get('error'))


def usng(request):
    """
    Proxy to USNG service.
    """

    base_url = "http://app01.ozone.nga.mil/geoserver/wfs"

    bbox = request.GET.get('bbox')

    if not bbox:
        return HttpResponse()

    params = dict()
    params['service'] = 'wfs'
    params['version'] = '1.0.0'
    params['request'] = 'GetFeature'
    params['typeName'] = 'usng'
    params['bbox'] = bbox
    params['outputFormat'] = 'json'
    params['srsName'] = 'EPSG:4326'
    resp = requests.get(base_url, params=params)
    return HttpResponse(resp, mimetype="application/json")


def mgrs(request):
    """
    Create mgrs grid in manner similar to usng above
    """

    bbox = request.GET.get('bbox')

    if not bbox:
        return HttpResponse()

    bb = bbox.split(',')

    try:
        grid = Grid(bb[1], bb[0], bb[3], bb[2])
        fc = grid.build_grid_fc()
    except GridException:
        error = dict(error=500, details="Can't create grids across longitudinal boundaries. Try creating a smaller bounding box",)
        return HttpResponse(json.dumps(error), status=error.get('error'))
    except ProgramException:
        error = dict(error=500, details="Error executing external GeoConvert application. Make sure it is installed on the server",)
        return HttpResponse(json.dumps(error), status=error.get('error'))

    return HttpResponse(fc.__str__(), mimetype="application/json")

def geocode(request):
    """
    Proxy to geocode service
    """

    base_url = "http://geoservices.tamu.edu/Services/Geocode/WebService/GeocoderWebServiceHttpNonParsed_V04_01.aspx"
    params['apiKey'] = '57956afd728b4204bee23dbb17f00573'
    params['version'] = '4.01'

def aoi_delete(request, pk):
    try:
        aoi = AOI.objects.get(pk=pk)
        aoi.delete()
    except ObjectDoesNotExist:
        raise Http404

    return HttpResponse(status=200)

def display_help(request):
    return render(request, 'core/geoq_help.html')


@login_required
def batch_create_aois(request, *args, **kwargs):
    aois = request.POST.get('aois')
    job = Job.objects.get(id=kwargs.get('job_pk'))

    try:
        aois = json.loads(aois)
    except ValueError:
        raise ValidationError(_("Enter valid JSON"))

    response = AOI.objects.bulk_create([AOI(name=(aoi.get('name')),
                                        job=job,
                                        description=job.description,
                                        polygon=GEOSGeometry(json.dumps(aoi.get('geometry')))) for aoi in aois])

    return HttpResponse()


class JobGeoJSON(ListView):
    model = Job

    def get(self, request, *args, **kwargs):
        job = get_object_or_404(Job, pk=self.kwargs.get('pk'))
        geojson = job.features_geoJSON()

        return HttpResponse(geojson, mimetype="application/json", status=200)


class JobKML(ListView):

    model = Job

    def get(self, request, *args, **kwargs):
        job = get_object_or_404(Job, pk=self.kwargs.get('pk'))

        locations = job.feature_set.all()
        feature_types = FeatureType.objects.all()

        output = '<?xml version="1.0" encoding="UTF-8"?>\n'
        output += '<kml xmlns="http://www.opengis.net/kml/2.2">\n'
        output += '  <Document>\n'
        output += '    <Style id="geoq_inwork">\n'
        output += '      <LineStyle>\n'
        output += '        <width>3</width>\n'
        output += '        <color>7f00ffff</color>\n'
        output += '      </LineStyle>\n'
        output += '      <PolyStyle>\n'
        output += '        <fill>0</fill>\n'
        output += '        <outline>1</outline>\n'
        output += '      </PolyStyle>\n'
        output += '    </Style>\n'

        output += '    <Style id="geoq_complete">\n'
        output += '      <LineStyle>\n'
        output += '        <width>2</width>\n'
        output += '        <color>7f00ff00</color>\n'
        output += '      </LineStyle>\n'
        output += '      <PolyStyle>\n'
        output += '        <fill>0</fill>\n'
        output += '        <outline>1</outline>\n'
        output += '      </PolyStyle>\n'
        output += '    </Style>\n'

        output += '    <Style id="geoq_unassigned">\n'
        output += '      <LineStyle>\n'
        output += '        <width>1</width>\n'
        output += '        <color>7f0000ff</color>\n'
        output += '      </LineStyle>\n'
        output += '      <PolyStyle>\n'
        output += '        <fill>0</fill>\n'
        output += '        <outline>1</outline>\n'
        output += '      </PolyStyle>\n'
        output += '    </Style>\n'

        for feature in feature_types:
            output += '    <Style id="geoq_'+str(feature.id)+'">\n'
            if feature.style.has_key('weight'):
                output += '      <LineStyle>\n'
                output += '        <width>'+str(feature.style['weight'])+'</width>\n'
                output += '      </LineStyle>\n'

            if feature.style.has_key('color'):
                color = feature.style['color']
                #TODO: Maybe use webcolors and name_to_hex to convert color names to hex colors
                if color == 'orange':
                    color = '7fff6600' # NOTE: Using 50% transparency
                if color == 'red':
                    color = '7fff0000'
                if color == 'green':
                    color = '7f00ff00'
                if color == 'blue':
                    color = '7f0000ff'
                output += '      <PolyStyle>\n'
                output += '        <color>'+color+'</color>\n'
                output += '        <colorMode>normal</colorMode>\n'
                output += '        <fill>1</fill>\n'
                output += '        <outline>1</outline>\n'
                output += '      </PolyStyle>\n'

            if feature.style.has_key('iconUrl'):
                url = 'http://geo-q.com/'+str(feature.style['iconUrl'])
                output += '      <IconStyle>\n'
                output += '        <Icon>\n'
                output += '          <href>'+url+'</href>\n'
                output += '        </Icon>\n'
                output += '      </IconStyle>\n'
            output += '    </Style>\n'

        for loc in locations:
            template_name = loc.template.name
            analyst_name = loc.analyst.username
            dtg = str(loc.created_at)
            job_id = str(loc.job.id)
            desc = 'Posted by '+str(analyst_name)+'\n at '+dtg+'\n in Job #'+job_id
            #TODO: Add links to Jobs and Projects

            output += '    <Placemark><name>'+str(template_name)+'</name>\n'
            output += '    <description>'+desc+'</description>\n'
            output += '      <styleUrl>#geoq_'+str(loc.template.id)+'</styleUrl>\n'
            output += '      '+str(loc.the_geom.kml)+'\n'
            output += '    </Placemark>\n'

        for aoi in job.aois.all():
            style = 'complete'
            if aoi.status == 'In work':
                style = 'inwork'
            if aoi.status == 'Unassigned':
                style = 'unassigned'
            output += '    <Placemark>\n'
            output += '      <styleUrl>#geoq_'+style+'</styleUrl>\n'
            output += '      '+str(aoi.polygon.kml)+'\n'
            output += '    </Placemark>\n'

        output += '  </Document>\n'
        output += '</kml>'

        return HttpResponse(output, mimetype="application/vnd.google-earth.kml+xml", status=200) #vnd.google-earth.kml+xml
