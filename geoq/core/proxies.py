# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import patch_cache_control, cache_page
from django.http import HttpResponse
import json
import mimetypes
import urllib2

import logging

logger = logging.getLogger(__name__)


@login_required
@cache_page(60 * 5)
def proxy_to(request, path, target_url):
    url = '%s%s' % (target_url, path)

    url = url.replace('http:/', 'http://', 1)
    url = url.replace('http:///', 'http://')

    url = url.replace('https:/', 'https://', 1)
    url = url.replace('https:///', 'https://')

    testurl = False
    errorCode = ''
    status = {}

    if request.META.has_key('QUERY_STRING'):
        qs = request.META['QUERY_STRING']
        if len(qs) > 1:
            url = '%s?%s' % (url, qs)

    try:
        if testurl:
            content = url
            status_code = 200
            mimetype = 'text/plain'
        else:
            headers = {}
            if 'HTTP_X_API_KEY' in request.META:
                headers['X-API-KEY'] = request.META['HTTP_X_API_KEY']

            newrequest = urllib2.Request(url, headers = headers)
            proxied_request = urllib2.urlopen(newrequest, timeout=120)
            status_code = proxied_request.code
            mimetype = proxied_request.headers.typeheader or mimetypes.guess_type(url)
            content = proxied_request.read()
    except urllib2.HTTPError, e:
        status = {'status': 'error', 'details': 'Proxy HTTPError = ' + str(e.code)}
        errorCode = 'Proxy HTTPError = ' + str(e.code)
    except urllib2.URLError, e:
        status = {'status': 'error', 'details': 'Proxy URLError = ' + str(e.reason)}
        errorCode = 'Proxy URLError = ' + str(e.reason)
    except Exception:
        status = {'status': 'error', 'details': 'Proxy generic exception'}
        import traceback

        errorCode = 'Proxy generic exception: ' + traceback.format_exc()
    else:
        response = HttpResponse(content, status=status_code, mimetype=mimetype)

        if ".png" in url or ".jpg" in url:
            patch_cache_control(response, max_age=60 * 60 * 1, public=True) #Cache for 1 hour

        return response

    if errorCode and len(errorCode):
        logger.error(errorCode)
    output = json.dumps(status)
    return HttpResponse(output, content_type="application/json")