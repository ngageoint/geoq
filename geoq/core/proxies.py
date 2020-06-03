# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

# parts borrowed from https://github.com/mjumbewu/django-proxy, Copyright © Mjumbe Wawatu Ukweli.

from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import patch_cache_control, cache_page
from django.http import HttpResponse, QueryDict
from .IPy import IP
import json
import mimetypes
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import requests

import logging

logger = logging.getLogger(__name__)

@login_required
@cache_page(60 * 5)
def proxy_to(request, target_url):
    url = target_url
    url = url.replace('/http', 'http')

    url = url.replace('http:/', 'http://', 1)
    url = url.replace('http:///', 'http://')

    url = url.replace('https:/', 'https://', 1)
    url = url.replace('https:///', 'https://')

    testurl = False
    errorCode = ''
    status = {}

    if 'QUERY_STRING' in request.META:
        qs = request.META['QUERY_STRING']
        if len(qs) > 1:
            url = '%s?%s' % (url, qs)

    try:

        if not url.startswith('http'):
            raise URLError('Illegal protocol')

        if testurl:
            content = url
            status_code = 200
            mimetype = 'text/plain'
        else:
            headers = {}
            if 'HTTP_X_API_KEY' in request.META:
                headers['X-API-KEY'] = request.META['HTTP_X_API_KEY']
            if 'CONTENT_TYPE' in request.META:
                headers['Content-type'] = request.META['CONTENT_TYPE']

            newrequest = Request(url, headers = headers)
            # check that if an ip address is passed, it isn't in the local network
            try:
                ip = IP(newrequest.host)
                if ip.iptype() == 'PRIVATE':
                    raise URLError('Private IP addresses may not be used')
            except Exception:
                # hostname was not an IP. Allow to continue
                pass

            if request.body != None and len(request.body) > 0:
                newrequest.add_data(request.body)

            proxied_request = urlopen(newrequest, timeout=20)
            status_code = proxied_request.code
            mimetype = proxied_request.headers.typeheader or mimetypes.guess_type(url)
            content = proxied_request.read()
    except HTTPError as e:
        status = {'status': 'error', 'details': 'Proxy HTTPError = ' + str(e.code)}
        errorCode = 'Proxy HTTPError = ' + str(e.code)
    except URLError as e:
        status = {'status': 'error', 'details': 'Proxy URLError = ' + str(e.reason)}
        errorCode = 'Proxy URLError = ' + str(e.reason)
    except Exception:
        status = {'status': 'error', 'details': 'Proxy generic exception'}
        import traceback

        errorCode = 'Proxy generic exception: ' + traceback.format_exc()
    else:
        response = HttpResponse(content, status=status_code, content_type=mimetype)

        if ".png" in url or ".jpg" in url:
            patch_cache_control(response, max_age=60 * 60 * 1, public=True) #Cache for 1 hour

        return response

    if errorCode and len(errorCode):
        logger.error(errorCode)
    output = json.dumps(status)
    return HttpResponse(output, content_type="application/json")

@login_required
@cache_page(60 * 5)
def proxy_request_to(request, target_url, requests_args=None):
    url = target_url
    url = url.replace('/http', 'http')

    requests_args = (requests_args or {}).copy()
    headers = get_headers(request.META)
    params = request.GET.copy()

    if 'headers' not in requests_args:
        requests_args['headers'] = {}
    if 'data' not in requests_args:
        requests_args['data'] = request.body
    if 'params' not in requests_args:
        requests_args['params'] = QueryDict('', mutable=True)

    # Overwrite any headers and params from the incoming request with explicitly
    # specified values for the requests library.
    headers.update(requests_args['headers'])
    params.update(requests_args['params'])

    # If there's a content-length header from Django, it's probably in all-caps
    # and requests might not notice it, so just remove it.
    for key in list(headers.keys()):
        if key.lower() == 'content-length':
            del headers[key]

    requests_args['headers'] = headers
    requests_args['params'] = params
    requests_args['verify'] = False

    response = requests.request(request.method, url, **requests_args)

    proxy_response = HttpResponse(
        response.content,
        status=response.status_code)

    excluded_headers = set([
        # Hop-by-hop headers
        # ------------------
        # Certain response headers should NOT be just tunneled through.  These
        # are they.  For more info, see:
        # http://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html#sec13.5.1
        'connection', 'keep-alive', 'proxy-authenticate',
        'proxy-authorization', 'te', 'trailers', 'transfer-encoding',
        'upgrade',

        # Although content-encoding is not listed among the hop-by-hop headers,
        # it can cause trouble as well.  Just let the server set the value as
        # it should be.
        'content-encoding',

        # Since the remote server may or may not have sent the content in the
        # same encoding as Django will, let Django worry about what the length
        # should be.
        'content-length',
    ])
    for key, value in response.headers.items():
        if key.lower() in excluded_headers:
            continue
        elif key.lower() == 'location':
            # If the location is relative at all, we want it to be absolute to
            # the upstream server.
            proxy_response[key] = make_absolute_location(response.url, value)
        else:
            proxy_response[key] = value

    return proxy_response


def make_absolute_location(base_url, location):
    """
    Convert a location header into an absolute URL.
    """
    absolute_pattern = re.compile(r'^[a-zA-Z]+://.*$')
    if absolute_pattern.match(location):
        return location

    parsed_url = urlparse(base_url)

    if location.startswith('//'):
        # scheme relative
        return parsed_url.scheme + ':' + location

    elif location.startswith('/'):
        # host relative
        return parsed_url.scheme + '://' + parsed_url.netloc + location

    else:
        # path relative
        return parsed_url.scheme + '://' + parsed_url.netloc + parsed_url.path.rsplit('/', 1)[0] + '/' + location

    return location


def get_headers(environ):
    """
    Retrieve the HTTP headers from a WSGI environment dictionary.  See
    https://docs.djangoproject.com/en/dev/ref/request-response/#django.http.HttpRequest.META
    """
    headers = {}
    for key, value in environ.items():
        # Sometimes, things don't like when you send the requesting host through.
        if key.startswith('HTTP_') and key != 'HTTP_HOST':
            headers[key[5:].replace('_', '-')] = value
        elif key in ('CONTENT_TYPE', 'CONTENT_LENGTH'):
            headers[key.replace('_', '-')] = value

    return headers
