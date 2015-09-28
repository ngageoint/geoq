# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.conf import settings
from django.templatetags.static import static
import os
import zipfile
import shutil

def save_kmz_file(kmz_file):
    # figure out where the repository is, create folder, and extract kmz to there
    KMZ_FILE_TYPE = unicode('application/vnd.google-earth.kmz')

    rootdir = getattr(settings, 'STATIC_ROOT')
    kmldir = getattr(settings, 'KML_REPOSITORY_ROOT', "kml/")
    dirname = kmz_file.name.rsplit(".",1)[0] + "/"
    path = '{0}{1}{2}'.format(rootdir,kmldir,dirname)
    filename = 'doc.kml'

    try:
        os.mkdir(path)
    except OSError as e:
        print "Error creating path",path,"due to",e
        shutil.rmtree(path)
        os.mkdir(path)

    if kmz_file.content_type == KMZ_FILE_TYPE:
        z = zipfile.ZipFile(kmz_file)
        for name in z.namelist():
            z.extract(name, path)
    else:
        filename = kmz_file.name
        with open(path + filename, 'wb+') as destination:
            for chunk in kmz_file.chunks():
                destination.write(chunk)


    # see if we have a doc.kml file in the root directory
    if os.path.isfile(path + filename):
        return static(kmldir + dirname + filename)
    else:
        return None
