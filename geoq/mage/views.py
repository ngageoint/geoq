from django.conf import settings
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from datetime import datetime

import requests
import json

token = None


def mage_login(request):
    if settings.MAGE_USERNAME and settings.MAGE_UID and settings.MAGE_PASSWORD and settings.MAGE_URL:
        body = {'username': settings.MAGE_USERNAME, 'uid': settings.MAGE_UID, 'password': settings.MAGE_PASSWORD}
        try:
            r = requests.post(settings.MAGE_URL+'/login', data=body, verify=False)
            resp = json.loads(r.text)

            # pull information needed from the response
            expirationDatetime = datetime.strptime(resp['expirationDate'],'%Y-%m-%dT%H:%M:%S.%fZ')
            cache.set("mage.token", resp['token'], (expirationDatetime-datetime.now()).seconds)
        except Exception as e:
            print('Unable to connect to MAGE')
            raise requests.exceptions.ConnectionError('Unable to connect to MAGE server')


def get_events(request):

    if cache.get('mage.token') is None:
        # try to log in
        try:
            mage_login(request)
        except requests.exceptions.ConnectionError:
            return HttpResponse('{"status":"Can not connect to server"}', status=403)

    try:
        params = {'access_token': cache.get('mage.token') }
        r = requests.get(settings.MAGE_URL+'/events',params=params, verify=False)
        return HttpResponse(r.text, status=200, mimetype="application/json")
    except Exception as e:
        print('Error retrieving events')
        return HttpResponse('{"status":"Unable to retrieve Events"}', status=500)

def get_all_users(request):
    if cache.get('mage.token') is None:
        # try to log in
        try:
            mage_login(request)
        except requests.exceptions.ConnectionError:
            return HttpResponse('{"status":"Can not connect to server"}', status=403)

    try:
        params = {'access_token': cache.get('mage.token') }
        r = requests.get(settings.MAGE_URL+'/users',params=params, verify=False)
        return HttpResponse(r.text, status=200, mimetype="application/json")
    except Exception as e:
        print('Error retrieving users')
        return HttpResponse('{"status":"Unable to retrieve Events"}', status=500)


def get_observations(request, id):
    if cache.get('mage.token') is None:
        # try to log in
        try:
            mage_login(request)
        except requests.ConnectionError:
            return HttpResponse('{"status":"Can not connect to server"}', status=403)

    try:
        params = {'access_token': cache.get('mage.token') }
        if len(request.GET) > 0:
            for key,val in request.GET.items():
                params[key] = val;

        r = requests.get('%s/events/%s/observations' % (settings.MAGE_URL,id),params=params, verify=False)
        return HttpResponse(r.text, status=200, mimetype="application/json")
    except Exception as e:
        print('Error retrieving events')
        return HttpResponse('{"status":"Unable to retrieve Events"}', status=500)


def get_icon(request,id,type):
    if cache.get('mage.token') is None:
        # try to log in
        try:
            mage_login(request)
        except requests.ConnectionError:
            return HttpResponse('{"status":"Can not connect to server"}', status=403)

    try:
        params = {'access_token': cache.get('mage.token') }
        r = requests.get('%s/events/%s/form/icons/%s' % (settings.MAGE_URL,id,type), params=params, verify=False)
        headers = r.headers
        response = HttpResponse()
        if 'content-type' in headers:
            response['Content-type'] = headers['content-type']
        if 'length' in headers:
            response['Length'] = headers['length']
        for block in r.iter_content(1024):
            response.write(block)
        return response
    except Exception as e:
        print('Error retrieving icon')
        return HttpResponse('{"status":"unable to retrieve icon"}', status=404)


def get_attachment(request,id,obs,att):
    if cache.get('mage.token') is None:
        # try to log in
        try:
            mage_login(request)
        except requests.ConnectionError:
            return HttpResponse('{"status":"Can not connect to server"}', status=403)

    try:
        params = request.GET.dict()
        params['access_token'] = cache.get('mage.token')
        r = requests.get('%s/events/%s/observations/%s/attachments/%s' % (settings.MAGE_URL,id,obs,att),
            params=params, verify=False)
        headers = r.headers
        response = HttpResponse()
        if 'content-type' in headers:
            response['Content-type'] = headers['content-type']
        if 'length' in headers:
            response['Length'] = headers['length']
        for block in r.iter_content(1024):
            response.write(block)
        return response
    except Exception as e:
        print('Error retrieving attachment')
        return HttpResponse('{"status":"unable to retrieve attachment"}', status=404)

def get_event_users(request, id):
    if cache.get('mage.token') is None:
        # try to log in
        try:
            mage_login(request)
        except requests.ConnectionError:
            return HttpResponse('{"status":"Can not connect to server"}', status=403)

    try:
        params = {'access_token': cache.get('mage.token') }
        r = requests.get('%s/events/%s/locations/users' % (settings.MAGE_URL,id),params=params, verify=False)
        return HttpResponse(r.text, status=200, mimetype="application/json")
    except Exception as e:
        print('Error retrieving events')
        return HttpResponse('{"status":"Unable to retrieve Events"}', status=500)



