# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.contrib.auth.decorators import login_required
from django.conf.urls import patterns, url
from django.views.generic import CreateView, UpdateView, ListView
from forms import FeatureTypeForm, MapForm, LayerForm, MapLayerForm
from views import CreateFeatures, EditFeatures, create_update_map, FeatureTypeListView, FeatureTypeDelete, MapListView,\
 MapDelete, LayerListView, LayerDelete, LayerImport, KMZLayerImport, JSONLayerImport, JSONLayerExport, update_user_maplayer_param
from models import FeatureType, Map, Layer

urlpatterns = patterns('',

    url(r'^feature-types/?$',
        FeatureTypeListView.as_view(queryset=FeatureType.objects.all()),
                         name='feature-type-list'),

    url(r'^features/create/?$',
        login_required(CreateFeatures.as_view()),
        name='feature-create'),

    url(r'^features/edit/?$',
        login_required(EditFeatures.as_view()),
        name='feature-edit'),
    
    url(r'^feature-types/create/?',
        login_required(CreateView.as_view(template_name='core/crispy_form.html', form_class=FeatureTypeForm)),
        name='feature-type-create'),
    
    url(r'^feature-types/update/(?P<pk>\d+)/?$',
        login_required(UpdateView.as_view(template_name='core/crispy_form.html',
                           queryset=FeatureTypeForm.Meta.model.objects.all(),
                           form_class=FeatureTypeForm)),
        name='feature-type-update'),

    url(r'^feature-types/delete/(?P<pk>\d+)/?$',
        login_required(FeatureTypeDelete.as_view()),
        name='feature-type-delete'),

    # Map list
    url(r'^maps/?$', MapListView.as_view(queryset=Map.objects.all()),
                                              name='map-list'),

    url(r'^maps/delete/(?P<pk>\d+)/?$',
        login_required(MapDelete.as_view()),
        name='map-delete'),


    # Map CRUD Views
    url(r'^create/?$',
        login_required(create_update_map),
        name='map-create'),

    url(r'^update/(?P<job_id>\d+)/(?P<map_id>\d+)/?$',
        login_required(create_update_map),
        name='map-update'),

    # Layer CRUD Views
    url(r'^layers/?$',
        LayerListView.as_view(queryset=Layer.objects.all()),
                         name='layer-list'),

    url(r'^layers/create/?$',
        login_required(CreateView.as_view(template_name='core/crispy_form.html', form_class=LayerForm)),
        name='layer-create'),

    url(r'^layers/update/(?P<pk>\d+)/?$',
        login_required(UpdateView.as_view(template_name='core/crispy_form.html',
                           queryset=LayerForm.Meta.model.objects.all(),
                           form_class=LayerForm)),
        name='layer-update'),

    url(r'^layers/delete/(?P<pk>\d+)/?$',
        login_required(LayerDelete.as_view()),
        name='layer-delete'),

    url(r'^layers/import/?$',
        LayerImport.as_view(),
        name='layer-import'),


    # MapLayer CRUD Views

    url(r'^map-layers/create/?$',
        login_required(CreateView.as_view(template_name='core/generic_form.html',
                           form_class=MapLayerForm)),
        name='map-layer-create'),

    url(r'^map-layers/update/(?P<pk>\d+)/?$',
        login_required(UpdateView.as_view(template_name='core/generic_form.html',
                           queryset=MapLayerForm.Meta.model.objects.all(),
                           form_class=MapLayerForm)),
        name='map-layer-update'),

    # maplayeruserparams

    url(r'^api/map-layers-params/?$',
        login_required(update_user_maplayer_param), name="update-user-maplayer-param"),

    # other urls
    url(r'^api/map-layers[s ]?/create/create-kml-layer', KMZLayerImport.as_view(), name='create-kml-layer'),

    url(r'^api/map-layers[s ]?/create/create-json-layer', JSONLayerImport.as_view(), name='create-json-layer'),

    url(r'^api/map-layers[s ]?/(?P<pk>.+).json', JSONLayerExport.as_view(), name='json-layer-export'),
)
