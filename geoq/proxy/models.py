from django.db import models
from django.conf import settings
from django.core.urlresolvers import reverse_lazy
from django.template.defaultfilters import slugify
from django.utils import timezone

import datetime
import requests
import base64
from StringIO import StringIO
from zipfile import ZipFile


class SourceDocument(models.Model):
    Name = models.CharField(max_length=1024)
    OriginalDocument = models.TextField(blank=True)
    LastUpdated = models.DateTimeField(auto_now=True,auto_now_add=True)
    Refresh = models.IntegerField(default=-1,blank=True,null=True)
    Expires = models.DateTimeField(null=True,blank=True)
    TranslatedDocument = models.TextField(blank=True)
    Type = models.CharField(default="kmz",max_length=1024)
    SourceURL = models.URLField(max_length=1000)
    slug = models.SlugField(max_length=200, null=True, blank=True, unique=True)
    def get_document(self):
        self.refresh()
        if self.TranslatedDocument:
            return self.TranslatedDocument
        return """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <name>Warning: KMZ file is currently unavailable</name>
    <description>Placeholder KMZ</description>
    <Point>
      <coordinates>-122.0822035425683,37.42228990140251,0</coordinates>
    </Point>
  </Placemark>
</kml>"""
    def __unicode__(self):
        return self.Name
    def cacheExpired(self):
        if self.Refresh < 0: return False
        delta = datetime.timedelta(seconds=self.Refresh)
        return self.LastUpdated + delta < timezone.now()
    def refresh(self,force=False):
        if force or self.cacheExpired():
            resp = requests.get(self.SourceURL)
            if resp.status_code == 200:
                kmzdata = resp.content # DO NOT use resp.text as that will be Unicode which is the tool of the DEVIL 
                # (Obligatory: my car gets 40 rods to the hogshead, and that's the ways I likes it.)
                myzip = ZipFile(StringIO(kmzdata))
                contents = myzip.namelist()
                doc = [x for x in contents if x.endswith(".kml")]
                other = [x for x in contents if not x.endswith(".kml")]
                if len(doc) != 1: # per https://developers.google.com/kml/documentation/kmzarchives?csw=1, This main KML file can have any name, as long as it ends in .kml, and as long as there is only one .kml file.
                    print "ERROR: invalid kmz detected... skipping refreshing ", self.SourceURL
                    return
                doc = doc[0]
                self.OriginalDocument = base64.b64encode(kmzdata)
                newdoc = myzip.open(doc).read()
                slug = slugify(self.Name)
                fixedhrefs = newdoc.replace("<href>","<href>/images/%s/"%slug)
                fixedimgs = fixedhrefs.replace("src=","src=/images/%s/"%slug)
                self.TranslatedDocument = fixedimgs
                oldChildren = [oc for oc in self.childdocument_set.all()]
                # Go through all the 
                for f in other:
                    if f.endswith("/"): #skip directoreis
                        continue
                    newchild = base64.b64encode(myzip.open(f).read())
                    isNew = True
                    for oc in oldChildren:
                        if oc.Name == f:
                            oc.Document = newchild
                            oc.save()
                            isNew = False
                            break
                    if isNew:
                        oc = ChildDocument.objects.create(Name=f,Document=newchild,Parent=self)
                        oc.save()
                    else:
                        oldChildren.remove(oc)
                    fixedimgs.replace(f,oc.slug)
                for od in oldChildren:
                    od.delete()
                self.save() # this will update LastUpdated
            else:
                print "Not refreshing data, should possibly warn user"

    def get_absolute_url(self):
        return reverse_lazy('proxy:getkmz', args=[self.slug])
    def save(self, *args, **kwargs):
        self.slug = slugify(self.Name)
        super(SourceDocument, self).save(*args, **kwargs)




class ChildDocument(models.Model):
    Name = models.CharField(max_length=1024)
    Document = models.TextField()
    Parent = models.ForeignKey(SourceDocument)
    slug = models.SlugField(max_length=200, null=True, blank=True)
    class Meta:
        unique_together = ("slug","Parent")
    def get_document(self):
        return base64.b64decode(self.Document)
    def __unicode__(self):
        return self.Name + ", child of " + self.Parent.Name
    def save(self, *args, **kwargs):
        self.slug = slugify(self.Name)
        super(ChildDocument, self).save(*args, **kwargs)
