from django.http import HttpResponse
from PIL import Image, ImageChops
from django.conf import settings
from tancolor import tint_image
import os
import posixpath

def tancolor_view(request):
    filename = _clean_filename(request.GET.get('image'))

    try:
        image = Image.open(settings.STATIC_ROOT + '/images/' + filename)
    except IOError:
        image = Image.new('RGBA', (16, 16), (255, 0, 0, 255))

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
