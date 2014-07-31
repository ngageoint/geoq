from django.test import TestCase,Client
from httmock import urlmatch, response, HTTMock
import os
from django.contrib.auth.models import User
from django.template.defaultfilters import slugify

from .models import *


def register_valid_proxy(name,url,refresh=100):
    p = SourceDocument.objects.create(Name=name,SourceURL=url,Refresh=refresh)
    p.save()
    p.refresh(force=True)


class MyMock:
    """ uses HTTMock but adds a state variable so I can check which calls got made and how many """
    def __init__(self):
        self.state = []

    @urlmatch(netloc=r'(.*\.)?validkmz\.com$')
    def validkmz_mock(self,url, request):
        self.state.append("downloaded"+str(url))
        return open(os.path.join("proxy","testdata","mykmz.kmz")).read()

    @urlmatch(netloc=r'(.*\.)?boguskmz\.com$')
    def boguskmz_mock(self,url, request):
        self.state.append("failed to download"+str(url))
        return response(404)


class Duplicates(TestCase):
    """ placeholder for needing to test trying to register kmz with the same name or two kmz with the same child names or a kmz with two dupe children """
    pass

class RegisterTests(TestCase):
    """ As a user, I want to be able to access proxies but I can't configure/edit them without having appropiate permissions """
    def setUp(self):
        """ create a test user and log them in, setup new mock object"""
        self.user = User.objects.create_user("bob",password="bob")
        self.user.save()
        self.c = Client()
        self.c.login(username="bob",password="bob")
        self.myMock = MyMock()

    def test_permissions(self):
        """ check that an anoymous user can access proxies but can't register new ones"""
        with HTTMock(self.myMock.validkmz_mock):
            self.c.logout()
            r = self.c.get("/proxy/")
            self.assertEqual(200, r.status_code)
            register_valid_proxy("bob",url="http://validkmz.com/data/some.kmz",refresh=100) #this should be long enough that we don't refresh from registration
            r = self.c.get("/proxy/")
            self.assertEqual(200, r.status_code)
            self.assertContains(r,"bob")
            r = self.c.get("/proxy/kmz/bob/")
            self.assertEqual(200, r.status_code)
            r = self.c.get("/proxy/kmz/notbob/")
            self.assertEqual(404, r.status_code)
            r = self.c.post("/proxy/register/",{"Name":"bob2","SourceURL":"http://validkmz.com/data/someother.kmz","Type":"kmz"})
            self.assertEqual(302, r.status_code) #redirects to login (or would try to ... )
            newloc = r._headers.get('location',("","fail"))[1]
            self.assertNotEqual(-1,newloc.find("login"),"Should have redirected user to login")
            self.assertEqual(1,len(self.myMock.state),"should have only had one call go out")
            self.assertTrue(self.myMock.state[0].find("downloaded") != -1)
    def test_valid_registration(self):
        """ test that a valid user can register a new kmz file"""
        with HTTMock(self.myMock.validkmz_mock):
            r = self.c.post("/proxy/register/",{"Name":"bob2","SourceURL":"http://validkmz.com/data/someother.kmz","Type":"kmz"})
            self.assertEqual(302, r.status_code)
            r = self.c.get("/proxy/")
            self.assertEqual(200, r.status_code)
            self.assertContains(r,"bob2")
            r = self.c.get("/proxy/kmz/bob2/")
            self.assertEqual(200, r.status_code)

    def test_invalid_registration(self):
        """ allow the user to register a non-working KMZ file but warn them (and return dummy kml """
        with HTTMock(self.myMock.boguskmz_mock):
            r = self.c.post("/proxy/register/",{"Name":"badbob","SourceURL":"http://boguskmz.com/data/someother.kmz","Type":"kmz"})
            self.assertEqual(302, r.status_code)
            r = self.c.get("/proxy/kmz/badbob/")
            self.assertContains(r,"Warning")
            r = self.c.get("/proxy/")
            self.assertEqual(200, r.status_code)
            self.assertContains(r,"badbob")
            r = self.c.get("/proxy/kmz/badbob/")
            self.assertEqual(200, r.status_code)
            self.assertContains(r,"Warning: KMZ file is currently unavailable")
            
class CacheTests(TestCase):
    def setUp(self):
        """ create a kmz file registration """
        self.myMock = MyMock()
        self.user = User.objects.create_user("bob",password="bob")
        self.user.save()
        self.c = Client()
        self.c.login(username="bob",password="bob")
        with HTTMock(self.myMock.validkmz_mock):
            register_valid_proxy("proxytest",url="http://validkmz.com/data/some.kmz",refresh=3) 
        
    def makeRequest(self,n="proxytest"):
        with HTTMock(self.myMock.validkmz_mock):
            r = self.c.get("/proxy/kmz/"+n+"/")
            self.assertEqual(200, r.status_code)
            #todo: introspection 
            for img in [slugify("files/neko.png"),slugify("files/icon56.png")]:
                r = self.c.get("/proxy/image/%s/%s/"%(n,img))
                self.assertEqual(200, r.status_code)
            r = self.c.get("/proxy/image/%s/boguspng/"%n)
            self.assertEqual(404, r.status_code)

    
    def stestFirstRequest(self):
        """ test that the first request after registration works (assumes right after registration """
        self.makeRequest("proxytest")
        self.assertEqual(1,len(self.myMock.state),"should have only had one call go out")

        
    def testLaterRequest(self):
        """ test that a subsequent request triggers a refresh """
        import time
        time.sleep(5) # ugh...
        self.makeRequest("proxytest")
        self.assertEqual(2,len(self.myMock.state),"should have only had one call go out")

class ConncurrentTests(TestCase):
    def setUp(self):
        pass
    def testDualUpdates(self):
        print "Do concurrent tests once we figure out how to do so"
        #self.assertEqual("do I know how to test this","yes")
