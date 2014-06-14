# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.conf.urls import patterns, url
from django.contrib.auth.decorators import login_required

from django.views.generic import CreateView, TemplateView, ListView, UpdateView
from forms import AOIForm, JobForm, ProjectForm
from models import AOI, Project, Job
from proxies import proxy_to
from views import *
from geoq.maps.views import feature_delete

urlpatterns = patterns('',
    url(r'^$', Dashboard.as_view(), name='home'),

    # PROJECTS
    url(r'^projects/?$',
        ListView.as_view(queryset=Project.objects.all()),
        name='project-list'),

    url(r'^projects/(?P<pk>\d+)/?$',
        DetailedListView.as_view(template_name="core/project_detail.html"),
        name='project-detail'),

    url(r'^projects/create/?$', login_required(
        CreateProjectView.as_view(form_class=ProjectForm,
                           template_name="core/generic_form.html")),
        name='project-create'),
    url(r'^projects/update/(?P<pk>\d+)/?$', login_required(
        UpdateView.as_view(queryset=Project.objects.all(),
                           template_name='core/generic_form.html',
                           form_class=ProjectForm)),
        name='project-update'),

    # JOBS
    url(r'^jobs/?$', ListView.as_view(queryset=Job.objects.all()), name='job-list'),
    url(r'^jobs/(?P<pk>\d+)/(?P<status>[a-zA-Z_ ]+)?/?$',
        JobDetailedListView.as_view(template_name='core/job_detail.html'),
        name='job-detail'),
    url(r'^jobs/(?P<pk>\d+)/next-aoi', redirect_to_unassigned_aoi, name='job-next-aoi'),
    url(r'^jobs/create/?$',
        login_required(CreateJobView.as_view(queryset=Job.objects.all(),
                           template_name='core/generic_form.html',
                           form_class=JobForm)),
        name='job-create'),
    url(r'^jobs/update/(?P<pk>\d+)/?$',
        login_required(UpdateJobView.as_view(queryset=Job.objects.all(),
                           template_name='core/generic_form.html',
                           form_class=JobForm)),
        name='job-update'),
    url(r'^jobs/delete/(?P<pk>\d+)/?$',
        login_required(JobDelete.as_view()),
        name='job-delete'),
    url(r'^jobs/(?P<job_pk>\d+)/create-aois/?$',
        login_required(BatchCreateAOIS.as_view()),
        name='job-create-aois'),

    url(r'^jobs/(?P<job_pk>\d+)/batch-create-aois/?$',
        #login required set in views
        'core.views.batch_create_aois', name='job-batch-create-aois'),

    # AOIS
    url(r'^aois/(?P<status>[a-zA-Z_ ]+)?/?$', AOIDetailedListView.as_view(template_name='core/aoi_list.html'), name='aoi-list'),
    url(r'^aois/work/(?P<pk>\d+)/?$',
        login_required(CreateFeaturesView.as_view()), name='aoi-work'),
    url(r'^aois/update-status/(?P<pk>\d+)/(?P<status>Unassigned|Assigned|In work|In review|Completed)/?$', login_required(
        ChangeAOIStatus.as_view()),
        name="aoi-update-status"),
    url(r'^aois/create/?$', login_required(
        CreateView.as_view(queryset=AOI.objects.all(),
                           template_name='core/generic_form.html',
                           form_class=AOIForm)),
        name='aoi-create'),
    url(r'^aois/update/(?P<pk>\d+)/?$', login_required(
        UpdateView.as_view(queryset=AOI.objects.all(),
                           template_name='core/generic_form.html',
                           form_class=AOIForm)),
        name='aoi-update'),
    url(r'^aois/delete/(?P<pk>\d+)/?$', login_required(
        AOIDelete.as_view()),
        name='aoi-delete'),

    url(r'^aois/deleter/(?P<pk>\d+)/?$', login_required( aoi_delete ), name='aoi-deleter'),

    url(r'^features/delete/(?P<pk>\d+)/?$', login_required( feature_delete ), name='feature-delete'),

    # OTHER URLS
    url(r'^edit/?$', TemplateView.as_view(template_name='core/edit.html'), name='edit'),
    url(r'^help/?$', display_help, name='help_page'),
    url(r'^api/geo/usng/?$', 'core.views.usng', name='usng'),
    url(r'^api/geo/mgrs/?$', 'core.views.mgrs', name='mgrs'),
    url(r'^proxy/(?P<path>.*)$', proxy_to, {'target_url': ''}),
    url(r'^api/job[s ]?/(?P<pk>\d+).geojson$', JobGeoJSON.as_view(), name='json-job'),
    url(r'^api/job[s ]?/(?P<pk>\d+).kml$', JobKML.as_view(), name='kml-job'),

)