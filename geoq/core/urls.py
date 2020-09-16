# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.urls import path,include,re_path
from django.contrib.auth.decorators import login_required

from django.views.generic import CreateView, TemplateView, ListView, UpdateView
from django.views.i18n import JavaScriptCatalog
from .forms import AOIForm, JobForm, ProjectForm, TeamForm, ExportJobForm
from geoq.core.atom2_view import JobAtom
from .models import AOI, Project, Job
from .proxies import proxy_to, proxy_request_to
from .views import *
from geoq.maps.views import feature_delete
from geoq.core.views import batch_create_aois, usng, mgrs, ipaws, prioritize_cells

from .ontoquery import retrieve_features

urlpatterns = [
    path('', Dashboard.as_view(), name='home'),

    # PROJECTS
    path('projects/',
        TabbedProjectListView.as_view(), name='project-list'),

    path('projects/<int:pk>/',
        DetailedListView.as_view(template_name="core/project_detail.html"),
        name='project-detail'),

    path('projects/create/', login_required(
        CreateProjectView.as_view(form_class=ProjectForm,
                           template_name="core/generic_form.html")),
        name='project-create'),
    path('projects/update/<int:pk>/', login_required(
        UpdateView.as_view(queryset=Project.objects.all(),
                           template_name='core/generic_form.html',
                           form_class=ProjectForm)),
        name='project-update'),

    # JOBS
    path('jobs/', TabbedJobListView.as_view(), name='job-list'),
    path('jobs/<int:job_pk>/create-aois/',
        login_required(BatchCreateAOIS.as_view()),
        name='job-create-aois'),
    path('jobs/<int:job_pk>/batch-create-aois/',
        batch_create_aois, name='job-batch-create-aois'),
    path('jobs/<int:job_pk>/prioritize-workcells/',
        login_required(PrioritizeWorkcells.as_view()),
        name='job-prioritize-workcells'),
    path('jobs/<int:job_pk>/assign-workcells/',
        login_required(AssignWorkcellsView.as_view()),
        name='job-assign-workcells'),
    path('jobs/<int:job_pk>/job-summary/',
        login_required(SummaryView.as_view()),
        name='job-summary'),
    path('jobs/<int:job_pk>/job-create-vocabulary',
        login_required(VocabularyView.as_view()),
        name='job-create-vocabulary'),
    path('jobs/<int:pk>/',
        JobDetailedListView.as_view(template_name='core/job_detail.html'),
        name='job-detail'),
    path('jobs/<int:pk>/<str:status>/',
        JobDetailedListView.as_view(template_name='core/job_detail.html'),
        name='job-detail'),
    path('jobs/metrics/<int:pk>/',
        JobDetailedListView.as_view(metrics=True, template_name='core/job_metrics.html'),
        name='job-metrics'),

    path('jobs/<int:pk>/next-aoi/', redirect_to_unassigned_aoi, name='job-next-aoi'),

    path('jobs/create/',
        login_required(CreateJobView.as_view(queryset=Job.objects.all(),
                           template_name='core/generic_form.html',
                           form_class=JobForm)),
        name='job-create'),

    path('jobs/export/<int:pk>/',
       login_required(ExportJobView.as_view(queryset=Job.objects.all(),
                                            template_name='core/generic_form.html',
                                            form_class=JobForm)),
       name='job-export'),

    path('jobs/update/<int:pk>/',
        login_required(UpdateJobView.as_view(queryset=Job.objects.all(),
                           template_name='core/generic_form.html',
                           form_class=JobForm)),
        name='job-update'),

    path('jobs/delete/<int:pk>/',
        login_required(JobDelete.as_view()),
        name='job-delete'),




    path('jobs/statistics/<int:job_pk>/', JobStatistics.as_view(), name='job-statistics'),

    # AOIS
    path('aois/<str:status>/', AOIDetailedListView.as_view(template_name='core/aoi_list.html'), name='aoi-list'),

    path('aois/work/<int:pk>/',login_required(CreateFeaturesView.as_view())),
    path('workcells/work/<int:pk>/',login_required(CreateFeaturesView.as_view()), name='aoi-work'),
    path('workcells/mapedit/<int:pk>/', login_required(MapEditView.as_view()), name='aoi-mapedit'),

    path('aois/work/<int:pk>/comment/',
        add_workcell_comment, name='add-workcell-comment'),
    path('aois/work/<int:pk>/log/',
        LogJSON.as_view(), name='workcell_log'),
    re_path('aois/update-status/(?P<pk>\d+)/(?P<status>Unassigned|Assigned|In work|Awaiting review|In review|Completed)/?$', login_required(
        ChangeAOIStatus.as_view()),
        name="aoi-update-status"),
    path('aois/<int:pk>/transition/<int:id>/', login_required(
        TransitionAOI.as_view()),
        name="aoi-transition"),
    path('aois/update-priority/<int:pk>/', login_required( update_priority ),
        name="aoi-update-priority"),
    path('aois/create/', login_required(
        CreateView.as_view(queryset=AOI.objects.all(),
                           template_name='core/generic_form.html',
                           form_class=AOIForm)),
        name='aoi-create'),
    path('aois/update/<int:pk>/', login_required(
        UpdateView.as_view(queryset=AOI.objects.all(),
                           template_name='core/generic_form.html',
                           form_class=AOIForm)),
        name='aoi-update'),
    path('aois/delete/<int:pk>/', login_required(
        AOIDelete.as_view()),
        name='aoi-delete'),

    path('aois/deleter/<int:pk>/', login_required( aoi_delete ), name='aoi-deleter'),

    path('features/delete/<int:pk>/', login_required( feature_delete ), name='feature-delete'),
    path('features/list/<int:pk>/', login_required( retrieve_features ), name='retrieve-features'),

    # Report Pages
    path('reports/work/<int:job_pk>/', login_required(WorkSummaryView.as_view()), name='work-summary'),
    path('reports/job/<int:job_pk>/', JobReportView.as_view(), name='job-report'),

    # OTHER URLS
    path('edit/', TemplateView.as_view(template_name='core/edit.html'), name='edit'),
    path('help/', display_help, name='help_page'),
    path('api/jobs/<int:job_pk>/users/', list_users, name='list_users'),
    path('api/jobs/<int:job_pk>/groups/', list_groups, name='list_groups'),
    path('api/group/<int:job_pk>/users/', list_group_users, name='list_group_users'),
    path('api/feed/job[s]?/<int:pk>/', GridAtomFeed.as_view(), name='feed_overall'),
    #path('api/feed2/job[s ]?/(?P<pk>\d+)$', GridAtomFeed.as_view(), name='feed_overall'),
    path('api/feed2/job[s]?/<int:pk>.atom', JobAtom.as_view(), name='atom-job'),
    path('api/geo/usng/', usng, name='usng'),
    path('api/geo/mgrs/', mgrs, name='mgrs'),
    path('api/geo/ipaws/', ipaws, name='ipaws'),
    re_path(r'proxy/(?P<target_url>.*)/$', proxy_request_to),
    path('proxy/', proxy_request_to, name='proxy'),
    path('api/job[s]?/<int:pk>.geojson', JobGeoJSON.as_view(), name='json-job'),
    path('api/job[s]?/<int:pk>.kml', JobKML.as_view(), name='kml-job'),
    path('api/job[s]?/<int:pk>.networked.kml', JobKMLNetworkLink.as_view(), name='kml-networked-job'),
    path('api/job[s]?/<int:pk>/styled_features.json', JobStyledGeoJSON.as_view(), name='geojson-job-features'),
    path('api/job[s]?/<int:pk>/features.json', JobFeaturesJSON.as_view(), name='json-job-features'),
    path('api/job[s]?/<int:pk>/features.withlinks.json', JobFeaturesJSON.as_view(show_detailed_properties=True), name='json-job-features-links'),
    path('api/job[s]?/<int:pk>/grid/job-workcells.geojson', GridGeoJSON.as_view(), name='json-job-grid'),
    path('api/job[s]?/<int:pk>.shp.zip', JobAsShape.as_view(), name='shape-job'),
    path('api/job[s]?/<int:pk>.<str:type>.shp.zip', JobAsShape.as_view(), name='shape-job-type'),
    path('api/job/update/<int:pk>/', update_job_data, name='update-job-data'),
    path('api/feature/update/<int:pk>/', update_feature_data, name='update-feature-data'),
    path('api/layer[s]?.json', LayersJSON.as_view(), name='json-layers'),
    path('api/cell[s]?/<int:pk>.geojson', CellJSON.as_view(), name='json-workcell'),

    path('api/prioritize/<str:method>/',
        prioritize_cells, name='batch-prioritize-cells'),

    #TEAMS
    path('admin/jsi18n/', JavaScriptCatalog),
    path('teams/', TeamListView.as_view(template_name='core/team_list.html'), name='team-list'),
    path('teams/create/',
        login_required(CreateTeamView.as_view(queryset=Group.objects.all(),
            template_name='core/generic_form.html',
            form_class=TeamForm)),
            name='team-create'),
    path('teams/update/<int:pk>/',
        login_required(UpdateTeamView.as_view(queryset=Group.objects.all(),
            template_name='core/generic_form.html',
            form_class=TeamForm)),
            name='team-update'),
    path('team/delete/<int:pk>/',
        login_required(TeamDelete.as_view()),
        name='team-delete'),

    #RESPONDERS
    path('responders/geojson/',responders_geojson, name="responders-list"),
    path('responder/update/', update_responder, name='update-responder'),

]
