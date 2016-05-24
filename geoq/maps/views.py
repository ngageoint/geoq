# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import json

from django.contrib.auth.decorators import login_required
from django.contrib.gis.geos import GEOSGeometry
from django.core import serializers
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect, Http404
from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext
from django.views.generic import ListView, View, DeleteView
from django.views.decorators.http import require_http_methods

from forms import MapForm, MapInlineFormset, UploadKMZForm, UploadJSONForm

from geoq.core.models import AOI
from geoq.locations.models import Counties

from models import Feature, FeatureType, Map, Layer, MapLayerUserRememberedParams, MapLayer, GeoeventsSource
from kmz_handler import save_kmz_file
from json import load

import logging

logger = logging.getLogger(__name__)


class CreateFeatures(View):
    """
    Reads GeoJSON from post request and creates AOIS for each features.
    """

    http_method_names = ['post']

    def post(self, request, *args, **kwargs):
        feature = None
        tpi = request.META.get('HTTP_TEMP_POINT_ID', "none")
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
        geom_obj = GEOSGeometry(json.dumps(geometry))
        attrs['the_geom'] = geom_obj

        county_list = Counties.objects.filter(poly__contains=geom_obj.centroid.wkt)
        county = None
        if len(county_list):
            county = str(county_list[0].name)

        try:
            feature = Feature(**attrs)
            feature.full_clean()
            if not feature.properties:
                feature.properties = {}
            if county:
                feature.properties['county'] = county

            feature.save()
        except ValidationError as e:
            response =  HttpResponse(content=json.dumps(dict(errors=e.messages)), mimetype="application/json", status=400)
            response['Temp-Point-Id'] = tpi
            return response
        # This feels a bit ugly but it does get the GeoJSON into the response
        feature_json = serializers.serialize('json', [feature,])
        feature_list = json.loads(feature_json)
        feature_list[0]['geojson'] = feature.geoJSON(True)

        response = HttpResponse(json.dumps(feature_list), mimetype="application/json")
        response['Temp-Point-Id'] = tpi
        return response


class EditFeatures(View):
    """
    Reads feature info from post request and updates associated feature object.
    """

    http_method_names = ['post']

    def post(self, request, *args, **kwargs):

        geometry = request.POST.get('geometry')
        geojson = json.loads(geometry)
        properties = geojson.get('properties')

        try:
            feature = Feature.objects.get(pk=properties.get('id'))
        except ObjectDoesNotExist:
            raise Http404

        geometry = geojson.get('geometry')
        feature.the_geom = GEOSGeometry(json.dumps(geometry))

        template = properties.get('template') if properties else None

        # TODO: handle exceptions
        if template:
            feature.template = FeatureType.objects.get(id=template)

        try:
            feature.full_clean()
            feature.save()
        except ValidationError as e:
            return HttpResponse(content=json.dumps(dict(errors=e.messages)), mimetype="application/json", status=400)

        return HttpResponse("{}", mimetype="application/json")

@login_required
@require_http_methods(["POST"])
def update_user_maplayer_param(request, *args, **kwargs):
    user = request.user

    try:
        json_stuff = json.loads(request.body)
    except ValueError:
        return HttpResponse("{\"status\":\"Bad Request\"}", mimetype="application/json", status=400)

    mlq = MapLayer.objects.filter(id=json_stuff['maplayer'])

    if not mlq.exists():
        return HttpResponse("{\"status:\":\"Bad Request\", \"reason\":\"MapLayer does not exist\"}", status=400)
    else:
        ml = mlq.get()
        mlurpq = MapLayerUserRememberedParams.objects.filter(maplayer=ml, user=user)
        if mlurpq.exists():
            mlurp = mlurpq.get()
        else:
            mlurp = MapLayerUserRememberedParams(maplayer=ml, user=user, values={})

        mlurp.values[json_stuff['param']] = json_stuff['newValue']

        mlurp.save()

    return HttpResponse(json.dumps(mlurp.values), mimetype="application/json", status=200)

def feature_delete(request, pk):
    try:
        feature = Feature.objects.get(pk=pk)
        feature.delete()
    except ObjectDoesNotExist:
        raise Http404

    return HttpResponse( content=pk, status=200 )

@login_required
def create_update_map(request, job_id, map_id):
    if map_id:
        map_obj = Map.objects.get(pk=map_id)
    else:
        map_obj = None

    if request.method == 'POST':
        form = MapForm(request.POST, prefix='map', instance=map_obj)
        maplayers_formset = MapInlineFormset(request.POST, prefix='layers', instance=map_obj)

        if form.is_valid() and maplayers_formset.is_valid():
            form.save()
            maplayers_formset.instance = form.instance
            maplayers_formset.save()
            return HttpResponseRedirect(reverse('job-detail', kwargs = {'pk': job_id}))
    else:
        form = MapForm(prefix='map', instance=map_obj)
        maplayers_formset = MapInlineFormset(prefix='layers', instance=map_obj)

    # form = [f for f in form if f.name not in ['zoom', 'projection', 'center_x', 'center_y']]

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
        context['admin'] = self.request.user.has_perm('maps.add_map')
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
        context['admin'] = self.request.user.has_perm('maps.add_featuretype')
        return context


class FeatureTypeDelete(DeleteView):
    model = FeatureType
    template_name = "core/generic_confirm_delete.html"

    def get_success_url(self):
        #TODO: Add a signal to context to
        #tell user that is was sucessful.
        return reverse('feature-type-list')


class LayerListView(ListView):

    model = Layer

    def get_context_data(self, **kwargs):
        context = super(LayerListView, self).get_context_data(**kwargs)
        context['admin'] = self.request.user.has_perm('maps.add_layer')
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
                    # if key == 'layer_params':
                    #     # TODO: need to pass json object here
                    #     pass
                    # else:
                    setattr(new_layer, key, value)

                new_layer.save()

        return HttpResponseRedirect(reverse('layer-list'))


class LayerDelete(DeleteView):
    model = Layer
    template_name = "core/generic_confirm_delete.html"

    def get_success_url(self):
        return reverse('layer-list')

class KMZLayerImport(ListView):

    model = Layer
    template_name = "maps/kmz_upload.html"

    def get_context_data(self, **kwargs):
        context = super(KMZLayerImport, self).get_context_data(**kwargs)
        return context

    def post(self, request, *args, **kwargs):
        form = UploadKMZForm(request.POST, request.FILES)
        if form.is_valid():
            localdir = save_kmz_file(request.FILES['kmzfile'])
            uri = request.build_absolute_uri(localdir)
            if localdir != None:
                layer = Layer.objects.create(name = request.POST['title'],type="KML",url=uri,layer="",styles="",description="")

        return HttpResponseRedirect(reverse('layer-list'))



class JSONLayerImport(ListView):

    model = Layer
    template_name = "maps/json_upload.html"

    def get_context_data(self, **kwargs):
        context = super(JSONLayerImport, self).get_context_data(**kwargs)
        return context

    def post(self, request, *args, **kwargs):
        form = UploadJSONForm(request.POST, request.FILES)
        try:
            dataFromFile = load(request.FILES["jsonfile"])
        except ValueError as e:
                ##This is a bad jsonFile, We should never get to this point but it is the last layer of defense.
                return HttpResponseRedirect(reverse('layer-list'))
        #Check to make sure that we actually have data
        if dataFromFile != None:
            layerName = request.POST['title']
            if not layerName.strip():
                layerName = dataFromFile["name"]
            #Due to the naming errors between the actual DB names and the exporting function built in the maps/models.py file for layers we have to do this in one line and not pretty.
            layer = Layer.objects.create(id=dataFromFile["id"], name = layerName, image_format=dataFromFile["format"], type=dataFromFile["type"],
                                         url=dataFromFile["url"], additional_domains=dataFromFile["subdomains"], layer=dataFromFile["layer"], transparent=dataFromFile["transparent"],
                                         layer_params=dataFromFile["layerParams"], dynamic_params=dataFromFile["dynamicParams"], refreshrate=dataFromFile["refreshrate"],
                                         token=dataFromFile["token"], attribution=dataFromFile["attribution"], spatial_reference=dataFromFile["spatialReference"],
                                         layer_parsing_function=dataFromFile["layerParsingFunction"], enable_identify=dataFromFile["enableIdentify"],
                                         root_field=dataFromFile["rootField"], info_format=dataFromFile["infoFormat"], fields_to_show=dataFromFile["fieldsToShow"],
                                         description=dataFromFile["description"], downloadableLink=dataFromFile["downloadableLink"], layer_info_link=dataFromFile["layer_info_link"],
                                         styles=dataFromFile["styles"])

        return HttpResponseRedirect(reverse('layer-list'))

class JSONLayerExport(ListView):

    model = Layer

    def get(self, request, *args, **kwargs):
        name = self.kwargs.get('pk').replace("%20", " ");
        layer = Layer.objects.get(name__iexact = name)
        layerJson = json.dumps(layer.layer_json(), indent=2);
        return HttpResponse(layerJson, mimetype="application/json", status=200)