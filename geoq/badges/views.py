# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.shortcuts import render_to_response, get_object_or_404
from django.template import RequestContext

from .models import Badge

def overview(request, extra_context={}):
    badges = Badge.objects.active().order_by("level")
    
    context = locals()
    context.update(extra_context)
    return render_to_response("badges/overview.html", context, context_instance=RequestContext(request))

def detail(request, slug, extra_context={}):
    badge = get_object_or_404(Badge, id=slug)
    users = badge.user.all()
    
    context = locals()
    context.update(extra_context)
    return render_to_response("badges/detail.html", context, context_instance=RequestContext(request))