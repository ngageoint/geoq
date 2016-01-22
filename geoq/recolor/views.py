from django.http import HttpResponse, HttpResponseNotFound, HttpResponseBadRequest
from PIL import Image
from django.conf import settings
from tancolor import tint_image
from django.views.decorators.http import last_modified
import os, posixpath
from datetime import datetime

def _file_age(request):
    path = settings.STATIC_ROOT + '/images/' + _clean_filename(request.GET.get('image'))
    if os.path.exists(path):
        return datetime.fromtimestamp(os.path.getmtime(path))
    else:
        return None

@last_modified(_file_age)
def tancolor_view(request):
    filename = settings.STATIC_ROOT + '/images/' + _clean_filename(request.GET.get('image'))

    if not os.path.exists(filename):
        return HttpResponseNotFound()

    try:
        image = Image.open(filename)
    except IOError:
        return HttpResponseBadRequest()

    tinted_image = tint_image(image, request.GET.dict())

    res = HttpResponse(content_type="image/png")

    tinted_image.save(res, "PNG")
    return res


def _clean_filename(filename):
    in_path = posixpath.normpath(filename)
    clean_path = ''

    for part in in_path.split('/'):
        if not part:
            continue

        drive, part = os.path.splitdrive(part)
        head, part = os.path.split(part)
        if part in (os.curdir, os.pardir):
            continue

        clean_path = os.path.join(clean_path, part)

    return clean_path
