# -*- coding: utf-8 -*-

import zipfile
import tempfile
import json
import platform
from ctypes import c_void_p, c_uint64, c_char_p, c_int
from django.http import HttpResponse
from django.utils.encoding import smart_str
from django.views.generic import ListView

from geoq.maps.models import AOI, Feature
from models import Job
from cStringIO import StringIO

from django.contrib.gis.gdal.libgdal import lgdal
from django.contrib.gis.gdal import Driver, OGRGeometry, OGRGeomType, SpatialReference, check_err

# Function signatures for running on x86_64
if platform.architecture()[0] == '64bit':
    lgdal.OGR_Dr_CreateDataSource.restype = c_uint64
    lgdal.OGR_DS_Destroy.argtypes = [c_uint64]
    lgdal.OGR_DS_CreateLayer.argtypes = [c_uint64, c_char_p, c_void_p, c_int, c_void_p]
    lgdal.OGR_DS_CreateLayer.restype = c_uint64
    lgdal.OGR_Fld_Create.argtypes = [c_char_p, c_int]
    lgdal.OGR_Fld_Create.restype = c_uint64
    lgdal.OGR_L_CreateField.argtypes = [c_uint64, c_uint64, c_int]
    lgdal.OGR_L_CreateField.restype = c_int
    lgdal.OGR_L_GetLayerDefn.argtypes = [c_uint64]
    lgdal.OGR_L_GetLayerDefn.restype = c_void_p
    lgdal.OGR_F_Create.argtypes = [c_void_p]
    lgdal.OGR_F_Create.restype = c_uint64
    lgdal.OGR_F_SetFieldString.argtypes = [c_uint64, c_int, c_char_p]
    lgdal.OGR_F_SetGeometry.argtypes = [c_uint64, c_void_p]
    lgdal.OGR_F_SetGeometry.restype = c_uint64
    lgdal.OGR_L_CreateFeature.argtypes = [c_uint64, c_uint64]
    lgdal.OGR_L_CreateFeature.restype = c_uint64
    lgdal.OGR_L_SyncToDisk.argtypes = [c_uint64]

class JobAsShape(ListView):
    model = Job

    def get(self, request, *args, **kwargs):
        job_pk = self.kwargs.get('pk')
        content_type = self.kwargs.get('type')

        try:
            shape_response = ShpResponder(job_pk=job_pk)

            if content_type == 'points':
                shape_out = shape_response.points()
            elif content_type == 'polygons':
                shape_out = shape_response.polygons()
            elif content_type == 'lines':
                shape_out = shape_response.lines()
            else:
                shape_out = shape_response.work_cells()

        except Exception, e:
            import traceback

            output = json.dumps(dict(message='Generic Exception', details=traceback.format_exc(), exception=str(e),
                                     last_data=shape_response.last_data))
            shape_out = HttpResponse(output, mimetype="application/json", status=200)

        return shape_out


# Updated From Django Shapes 0.2.0
class ShpResponder(object):
    def __init__(self, readme=None, geo_field=None, proj_transform=None, mimetype='application/zip', job_pk=1):
        self.readme = readme
        self.geo_field = geo_field
        self.proj_transform = proj_transform
        self.mimetype = mimetype
        self.file_name = smart_str('geoq_job_' + str(job_pk) + '_shapefile')
        self.last_data = "Initialized"
        self.job_pk = job_pk

    def __call__(self, *args, **kwargs):
        tmp = self.write_shapefile_to_tmp_file()
        return self.zip_response(tmp, self.file_name, self.mimetype, self.readme)

    def work_cells(self, *args, **kwargs):
        tmp = self.write_shapefile_to_tmp_file('workcells')
        file_name = smart_str('geoq_workcells_' + str(self.job_pk) + '_shapefile')
        return self.zip_response(tmp, file_name, self.mimetype, self.readme)

    def points(self, *args, **kwargs):
        tmp = self.write_shapefile_to_tmp_file('points')
        file_name = smart_str('geoq_points_' + str(self.job_pk) + '_shapefile')
        return self.zip_response(tmp, file_name, self.mimetype, self.readme)

    def polygons(self, *args, **kwargs):
        tmp = self.write_shapefile_to_tmp_file('polygons')
        file_name = smart_str('geoq_polygons_' + str(self.job_pk) + '_shapefile')
        return self.zip_response(tmp, file_name, self.mimetype, self.readme)

    def lines(self, *args, **kwargs):
        tmp = self.write_shapefile_to_tmp_file('lines')
        file_name = smart_str('geoq_lines_' + str(self.job_pk) + '_shapefile')
        return self.zip_response(tmp, file_name, self.mimetype, self.readme)

    def zip_response(self, shapefile_path, file_name, mimetype, readme=None):
        buffer = StringIO()
        zip = zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED)
        files = ['shp', 'shx', 'prj', 'dbf']
        for item in files:
            filename = '%s.%s' % (shapefile_path.replace('.shp', ''), item)
            zip.write(filename, arcname='%s.%s' % (file_name.replace('.shp', ''), item))
        if readme:
            zip.writestr('README.txt', readme)
        zip.close()
        buffer.flush()
        zip_stream = buffer.getvalue()
        buffer.close()

        # Stick it all in a django HttpResponse
        response = HttpResponse()
        response['Content-Disposition'] = 'attachment; filename=%s.zip' % file_name.replace('.shp', '')
        response['Content-length'] = str(len(zip_stream))
        response['Content-Type'] = mimetype
        response.write(zip_stream)
        return response

    def write_shapefile_to_tmp_file(self, content_type='workcells'):
        tmp = tempfile.NamedTemporaryFile(suffix='.shp', mode='w+b')
        # we must close the file for GDAL to be able to open and write to it
        tmp.close()
        args = tmp.name, self.job_pk, content_type
        self.write_geoq_shape(*args)

        return tmp.name

    def write_geoq_shape(self, tmp_name, job_pk, content_type='workcells'):
        job_object = Job.objects.get(id=job_pk)

        # Get the shapefile driver
        dr = Driver('ESRI Shapefile')

        # Creating the datasource
        ds = lgdal.OGR_Dr_CreateDataSource(dr._ptr, tmp_name, None)
        if ds is None:
            raise Exception('Could not create file!')

        if content_type == 'workcells':
            self.add_aois_to_shapefile(ds, job_object)
        else:
            self.add_features_to_shapefile(ds, job_object, content_type)

        # Cleaning up
        lgdal.OGR_DS_Destroy(ds)
        lgdal.OGRCleanupAll()

    def add_aois_to_shapefile(self, ds, job_object):
        aois = job_object.aois.all()
        if len(aois) == 0:
            return

        geo_field = aois[0].polygon

        # Get the right geometry type number for ogr
        ogr_type = OGRGeomType(geo_field.geom_type).num

        # Set up the native spatial reference of the geometry field using the srid
        native_srs = SpatialReference(geo_field.srid)

        # create the AOI layer
        layer = lgdal.OGR_DS_CreateLayer(ds, 'lyr', native_srs._ptr, ogr_type, None)

        # Create the fields that each feature will have
        fields = AOI._meta.fields
        attributes = []
        for field in fields:
            if field.name in 'id, active, name, created_at, updated_at, analyst, priority, status, properties':
                attributes.append(field)

        for field in attributes:
            data_type = 4
            if field.name == 'id':
                data_type = 0
            fld = lgdal.OGR_Fld_Create(str(field.name), data_type)
            added = lgdal.OGR_L_CreateField(layer, fld, 0)
            check_err(added)

        # Getting the Layer feature definition.
        feature_def = lgdal.OGR_L_GetLayerDefn(layer)

        # Loop through queryset creating features
        for item in aois:
            feat = lgdal.OGR_F_Create(feature_def)

            for idx, field in enumerate(attributes):
                if field.name == 'properties':
                    value = json.dumps(item.properties)
                else:
                    value = getattr(item, field.name)
                string_value = str(value)[:80]
                lgdal.OGR_F_SetFieldString(feat, idx, string_value)

            # Transforming & setting the geometry
            geom = item.polygon
            ogr_geom = OGRGeometry(geom.wkt, native_srs)
            check_err(lgdal.OGR_F_SetGeometry(feat, ogr_geom._ptr))

            # create the feature in the layer.
            check_err(lgdal.OGR_L_CreateFeature(layer, feat))

        check_err(lgdal.OGR_L_SyncToDisk(layer))

    def add_features_to_shapefile(self, ds, job_object, content_type):
        features = job_object.feature_set.all()
        if len(features) == 0:
            return

        features_points = []
        features_polys = []
        features_lines = []

        for f in features:
            if f.the_geom.geom_type == 'Point':
                features_points.append(f)
            elif f.the_geom.geom_type == 'Polygon':
                features_polys.append(f)
            elif f.the_geom.geom_type == 'Line':
                features_lines.append(f)

        # This builds the array twice. It's duplicative, but works
        if content_type == 'points':
            self.add_features_subset_to_shapefile(ds, features_points, "lyr")
        elif content_type == 'lines':
            self.add_features_subset_to_shapefile(ds, features_lines, "lyr")
        else:  # Polygons
            self.add_features_subset_to_shapefile(ds, features_polys, "lyr")

    def add_features_subset_to_shapefile(self, ds, features, layer_name):
        if len(features) == 0:
            return

        geo_field = features[0].the_geom

        # Get the right geometry type number for ogr
        ogr_type = OGRGeomType(geo_field.geom_type).num

        # Set up the native spatial reference of the geometry field using the srid
        native_srs = SpatialReference(geo_field.srid)

        # create the Feature layer
        layer = lgdal.OGR_DS_CreateLayer(ds, layer_name, native_srs._ptr, ogr_type, None)

        # Create the fields that each feature will have
        fields = Feature._meta.fields
        attributes = []
        for field in fields:
            if field.name in 'id, analyst, template, created_at, updated_at, job, project':
                attributes.append(field)

        for field in attributes:
            data_type = 4
            if field.name == 'id':
                data_type = 0
            fld = lgdal.OGR_Fld_Create(str(field.name), data_type)
            added = lgdal.OGR_L_CreateField(layer, fld, 0)
            check_err(added)

        # Getting the Layer feature definition.
        feature_def = lgdal.OGR_L_GetLayerDefn(layer)

        # Loop through queryset creating features
        for item in features:
            feat = lgdal.OGR_F_Create(feature_def)

            for idx, field in enumerate(attributes):
                value = getattr(item, field.name)
                # if field.name == 'template':
                #     value = value.name
                string_value = str(value)
                lgdal.OGR_F_SetFieldString(feat, idx, string_value)

            # Transforming & setting the geometry
            geom = item.the_geom
            ogr_geom = OGRGeometry(geom.wkt, native_srs)
            check_err(lgdal.OGR_F_SetGeometry(feat, ogr_geom._ptr))

            # create the feature in the layer.
            check_err(lgdal.OGR_L_CreateFeature(layer, feat))

        check_err(lgdal.OGR_L_SyncToDisk(layer))
