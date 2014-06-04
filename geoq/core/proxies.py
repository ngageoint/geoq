# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.http import HttpResponse
import json
import mimetypes
import urllib2

import logging

logger = logging.getLogger(__name__)


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
            proxied_request = urllib2.urlopen(url, timeout=10)
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
        return HttpResponse(content, status=status_code, mimetype=mimetype)

    if errorCode and len(errorCode):
        logger.error(errorCode)
    output = json.dumps(status)
    return HttpResponse(output, content_type="application/json")