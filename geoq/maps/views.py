# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import json

from django.contrib.auth.decorators import login_required
from django.contrib.gis.geos import GEOSGeometry
from django.core.exceptions import ValidationError
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.views.generic import ListView, View, DeleteView

from forms import MapForm, MapInlineFormset

from geoq.core.models import AOI
from models import Feature, FeatureType, Map, Layer, GeoeventsSource

import logging

logger = logging.getLogger(__name__)


class CreateFeatures(View):
    """
    Reads GeoJSON from post request and creates AOIS for each features.
    """

    http_method_names = ['post']

    def post(self, request, *args, **kwargs):
        feature = None
        aoi = request.POST.get('aoi')
        geometry = request.POST.get('geometry')
        geojson = json.loads(geometry)
        properties = geojson.get('properties')

        aoi = AOI.objects.get(id=aoi)
        job = getattr(aoi, 'job')
        project = getattr(job, 'project')
        template = properties.get('template') if properties else None

        # TODO: handle exceptions
        if template:
            template = FeatureType.objects.get(id=template)

        attrs = dict(aoi=aoi,
                     job=job,
                     project=project,
                     analyst=request.user,
                     template=template)

        geometry = geojson.get('geometry')
        attrs['the_geom'] = GEOSGeometry(json.dumps(geometry))

        try:
            response = Feature(**attrs)
            response.full_clean()
            response.save()
        except ValidationError as e:
            return HttpResponse(content=json.dumps(dict(errors=e.messages)), mimetype="application/json", status=400)

        return HttpResponse([response], mimetype="application/json")


@login_required
def create_update_map(request, pk=None):

    if pk:
        map_obj = Map.objects.get(pk=pk)
    else:
        map_obj = None

    if request.method == 'POST':
        form = MapForm(request.POST, prefix='map', instance=map_obj)
        maplayers_formset = MapInlineFormset(request.POST, prefix='layers', instance=map_obj)

        if form.is_valid() and maplayers_formset.is_valid():
            form.save()
            maplayers_formset.save()
            return HttpResponseRedirect(reverse('job-list'))
    else:
        form = MapForm(prefix='map', instance=map_obj)
        maplayers_formset = MapInlineFormset(prefix='layers', instance=map_obj)
    return render_to_response('core/generic_form.html', {
        'form': form,
        'layer_formset': maplayers_formset,
        'custom_form': 'core/map_create.html',
        'object': map_obj,
        }, context_instance=RequestContext(request))


class MapListView(ListView):
    model = Map

    def get_context_data(self, **kwargs):
        context = super(MapListView, self).get_context_data(**kwargs)
        return context


class MapDelete(DeleteView):
    model = Map
    template_name = "core/generic_confirm_delete.html"

    def get_success_url(self):
        return reverse('map-list')


class FeatureTypeListView(ListView):

    model = FeatureType

    def get_context_data(self, **kwargs):
        context = super(FeatureTypeListView, self).get_context_data(**kwargs)
        return context


class FeatureTypeDelete(DeleteView):
    model = FeatureType
    template_name = "core/generic_confirm_delete.html"

    def get_success_url(self):
        return reverse('feature-type-update')


class LayerListView(ListView):

    model = Layer

    def get_context_data(self, **kwargs):
        context = super(LayerListView, self).get_context_data(**kwargs)
        return context


class LayerImport(ListView):

    model = Layer
    template_name = "maps/layer_import.html"

    def get_context_data(self, **kwargs):
        context = super(LayerImport, self).get_context_data(**kwargs)
        context['geoevents_sources'] = GeoeventsSource.objects.all()
        return context

    def post(self, request, *args, **kwargs):

        layers = request.POST.getlist('layer')

        for lay in layers:
            layer = json.loads(lay)
            # see if it's already in here. assume 'url' and 'layer' attributes make it unique
            l = Layer.objects.filter(url=layer['url'], layer=layer['layer'])
            if not l:
                # add the layer
                new_layer = Layer()
                for key, value in layer.iteritems():
                    if key == 'layer_params':
                        # TODO: need to pass json object here
                        pass
                    else:
                        setattr(new_layer, key, value)

                new_layer.save()

        return HttpResponseRedirect(reverse('layer-list'))


class LayerDelete(DeleteView):
    model = Layer
    template_name = "core/generic_confirm_delete.html"

    def get_success_url(self):
        return reverse('layer-list')