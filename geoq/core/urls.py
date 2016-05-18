# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.conf.urls import patterns, url
from django.contrib.auth.decorators import login_required

from django.views.generic import CreateView, TemplateView, ListView, UpdateView
from forms import AOIForm, JobForm, ProjectForm, TeamForm
from models import AOI, Project, Job
from proxies import proxy_to
from views import *
from geoq.maps.views import feature_delete

urlpatterns = patterns('',
    url(r'^$', Dashboard.as_view(), name='home'),

    # PROJECTS
    url(r'^projects/?$',
        TabbedProjectListView.as_view(), name='project-list'),

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
    url(r'^jobs/?$', TabbedJobListView.as_view(), name='job-list'),
    url(r'^jobs/(?P<pk>\d+)/(?P<status>[a-zA-Z_ ]+)?/?$',
        JobDetailedListView.as_view(template_name='core/job_detail.html'),
        name='job-detail'),
    url(r'^jobs/metrics/(?P<pk>\d+)/?$',
        JobDetailedListView.as_view(metrics=True, template_name='core/job_metrics.html'),
        name='job-metrics'),

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
    url(r'^jobs/(?P<job_pk>\d+)/prioritize-workcells/?$',
        login_required(PrioritizeWorkcells.as_view()),
        name='job-prioritize-workcells'),
    url(r'^jobs/(?P<job_pk>\d+)/assign-workcells/?$',
        login_required(AssignWorkcellsView.as_view()),
        name='job-assign-workcells'),

    url(r'^jobs/(?P<job_pk>\d+)/batch-create-aois/?$',
        #login required set in views
        'core.views.batch_create_aois', name='job-batch-create-aois'),

    # AOIS
    url(r'^aois/(?P<status>[a-zA-Z_ ]+)?/?$', AOIDetailedListView.as_view(template_name='core/aoi_list.html'), name='aoi-list'),

    url(r'^aois/work/(?P<pk>\d+)/?$',login_required(CreateFeaturesView.as_view())),
    url(r'^workcells/work/(?P<pk>\d+)/?$',login_required(CreateFeaturesView.as_view()), name='aoi-work'),
    url(r'^workcells/mapedit/(?P<pk>\d+)/?$', login_required(MapEditView.as_view()), name='aoi-mapedit'),

    url(r'^aois/work/(?P<pk>\d+)/comment/?$',
        add_workcell_comment, name='add-workcell-comment'),
    url(r'^aois/work/(?P<pk>\d+)/log/?$',
        LogJSON.as_view(), name='workcell_log'),
    url(r'^aois/update-status/(?P<pk>\d+)/(?P<status>Unassigned|Assigned|In work|Awaiting review|In review|Completed)/?$', login_required(
        ChangeAOIStatus.as_view()),
        name="aoi-update-status"),
    url(r'^aois/update-priority/(?P<pk>\d+)/?$', login_required( update_priority ),
        name="aoi-update-priority"),
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
    url(r'^api/jobs/(?P<job_pk>\d+)/users/?$', list_users, name='list_users'),
    url(r'^api/jobs/(?P<job_pk>\d+)/groups/?$', list_groups, name='list_groups'),
    url(r'^api/geo/usng/?$', 'core.views.usng', name='usng'),
    url(r'^api/geo/mgrs/?$', 'core.views.mgrs', name='mgrs'),
    url(r'^proxy/(?P<path>.*)$', proxy_to, {'target_url': ''}),
    url(r'^proxy/?$', proxy_to, name='proxy'),
    url(r'^api/job[s ]?/(?P<pk>\d+).geojson$', JobGeoJSON.as_view(), name='json-job'),
    url(r'^api/job[s ]?/(?P<pk>\d+).kml$', JobKML.as_view(), name='kml-job'),
    url(r'^api/job[s ]?/(?P<pk>\d+).networked.kml$', JobKMLNetworkLink.as_view(), name='kml-networked-job'),
    url(r'^api/job[s ]?/(?P<pk>\d+)/styled_features.json$', JobStyledGeoJSON.as_view(), name='geojson-job-features'),
    url(r'^api/job[s ]?/(?P<pk>\d+)/features.json$', JobFeaturesJSON.as_view(), name='json-job-features'),
    url(r'^api/job[s ]?/(?P<pk>\d+)/features.withlinks.json$', JobFeaturesJSON.as_view(show_detailed_properties=True), name='json-job-features-links'),
    url(r'^api/job[s ]?/(?P<pk>\d+)/grid/job-workcells.geojson$', GridGeoJSON.as_view(), name='json-job-grid'),
    url(r'^api/job[s ]?/(?P<pk>\d+).shp.zip$', JobAsShape.as_view(), name='shape-job'),
    url(r'^api/job[s ]?/(?P<pk>\d+).(?P<type>\w+).shp.zip$', JobAsShape.as_view(), name='shape-job-type'),
    url(r'^api/job/update/(?P<pk>\d+)$', update_job_data, name='update-job-data'),
    url(r'^api/feature/update/(?P<pk>\d+)$', update_feature_data, name='update-feature-data'),
    url(r'^api/layer[s ]?.json$', LayersJSON.as_view(), name='json-layers'),
    url(r'^api/cell[s ]?/(?P<pk>\d+)?.geojson$', CellJSON.as_view(), name='json-workcell'),

    url(r'^api/prioritize/(?P<method>\w+)?$',
        'core.views.prioritize_cells', name='batch-prioritize-cells'),
    #TEAMS
    (r'^admin/jsi18n/$', 'django.views.i18n.javascript_catalog'),
    url(r'^teams/?$', TeamListView.as_view(template_name='core/team_list.html'), name='team-list'),
    url(r'^teams/create/?$',
        login_required(CreateTeamView.as_view(queryset=Group.objects.all(),
                           template_name='core/generic_form.html',
                           form_class=TeamForm)),
        name='team-create'),
    url(r'^teams/update/(?P<pk>\d+)/?$',
        login_required(UpdateTeamView.as_view(queryset=Group.objects.all(),
                           template_name='core/generic_form.html',
                           form_class=TeamForm)),
        name='team-update'),
    url(r'^team/delete/(?P<pk>\d+)/?$',
        login_required(TeamDelete.as_view()),
        name='team-delete'),
    
)