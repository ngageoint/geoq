# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.contrib.auth.decorators import login_required
from django.urls import path, include
from django.views.generic import CreateView, UpdateView, ListView
from .forms import FeatureTypeForm, MapForm, LayerForm, MapLayerForm
from .views import CreateFeatures, EditFeatures, ClassifyFeatures, create_update_map, FeatureTypeListView, FeatureTypeDelete, MapListView,\
 MapDelete, LayerListView, LayerDelete, LayerImport, KMZLayerImport, JSONLayerImport, JSONLayerExport, update_user_maplayer_param
from .models import FeatureType, Map, Layer

urlpatterns = [

    path('feature-types/',
        FeatureTypeListView.as_view(queryset=FeatureType.objects.all()),
        name='feature-type-list'),

    path('features/create/',
        login_required(CreateFeatures.as_view()),
        name='feature-create'),

    path('features/list/',
        login_required(CreateFeatures.as_view()),
        name='feature-list'),

    path('features/edit/',
        login_required(EditFeatures.as_view()),
        name='feature-edit'),

    path('features/classify/',
        login_required(ClassifyFeatures.as_view()),
        name='classify-feature'),

    # path('features/read/?$',
    #     login_required(ReadFeatures.as_view()),
    #     name='feature-read'),

    path('feature-types/create/',
        login_required(CreateView.as_view(template_name='maps/crispy_form.html', form_class=FeatureTypeForm)),
        name='feature-type-create'),

    path('feature-types/update/<int:pk>/',
        login_required(UpdateView.as_view(template_name='core/crispy_form.html',
                           queryset=FeatureTypeForm.Meta.model.objects.all(),
                           form_class=FeatureTypeForm)),
        name='feature-type-update'),

    path('feature-types/delete/<int:pk>/',
        login_required(FeatureTypeDelete.as_view()),
        name='feature-type-delete'),

    # Map list
    path('maps/', MapListView.as_view(queryset=Map.objects.all()),
                                              name='map-list'),

    path('maps/delete/<int:pk>/',
        login_required(MapDelete.as_view()),
        name='map-delete'),


    # Map CRUD Views
    path('create/',
        login_required(create_update_map),
        name='map-create'),

    path('update/<int:job_id>/<int:map_id>/',
        login_required(create_update_map),
        name='map-update'),

    # Layer CRUD Views
    path('layers/',
        LayerListView.as_view(queryset=Layer.objects.all()),
                         name='layer-list'),

    path('layers/create/',
        login_required(CreateView.as_view(template_name='maps/crispy_form.html', form_class=LayerForm)),
        name='layer-create'),

    path('layers/update/<int:pk>/',
        login_required(UpdateView.as_view(template_name='maps/crispy_form.html',
                           queryset=LayerForm.Meta.model.objects.all(),
                           form_class=LayerForm)),
        name='layer-update'),

    path('layers/delete/<int:pk>/',
        login_required(LayerDelete.as_view()),
        name='layer-delete'),

    path('layers/import/',
        LayerImport.as_view(),
        name='layer-import'),


    # MapLayer CRUD Views

    path('map-layers/create/',
        login_required(CreateView.as_view(template_name='maps/generic_form.html',
                           form_class=MapLayerForm)),
        name='map-layer-create'),

    path('map-layers/update/<int:pk>/',
        login_required(UpdateView.as_view(template_name='maps/generic_form.html',
                           queryset=MapLayerForm.Meta.model.objects.all(),
                           form_class=MapLayerForm)),
        name='map-layer-update'),

    # maplayeruserparams

    path('api/map-layers-params/',
        login_required(update_user_maplayer_param), name="update-user-maplayer-param"),

    # other urls
    path('api/map-layers/create/create-kml-layer', KMZLayerImport.as_view(), name='create-kml-layer'),

    path('api/map-layers/create/create-json-layer', JSONLayerImport.as_view(), name='create-json-layer'),

    path('api/map-layers/<int:pk>.json', JSONLayerExport.as_view(), name='json-layer-export'),

]
