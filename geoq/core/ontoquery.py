from django.views.generic import ListView

import json
from django.http import HttpResponse
from .models import Job, AOI
from geoq.maps.models import FeatureType
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

@require_http_methods(["POST"])
@csrf_exempt
def retrieve_features(request, pk):

    aoi = get_object_or_404(AOI, pk=pk)

    # get the features for this AOI filtered by the ontology reference list provided
    body = request.read()
    input = json.loads(body)
    if 'references' in input:
        features = aoi.features.filter(template__ontology_reference__in=input['references']).all()
        objs = [x.details() for x in features]
        output = {"type": "FeatureCollection", "features": objs }

        return HttpResponse(json.dumps(output), content_type="application/json", status=200)
