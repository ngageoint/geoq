from django.http import Http404

# When restoring accounts, this view can be deleted.
def point_to_404(request):
    raise Http404