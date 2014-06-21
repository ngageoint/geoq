# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import subprocess
# from django.contrib.gis.geos import *
from geojson import MultiPolygon, Feature, FeatureCollection
from exceptions import ProgramException
import json

import logging
logger = logging.getLogger(__name__)

class Grid:

    LETTERS = ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z','A','B','C']

    def __init__(self, sw_lat, sw_lon, ne_lat, ne_lon):
        self.sw_mgrs = self.get_mgrs(sw_lat,sw_lon)
        self.ne_mgrs = self.get_mgrs(ne_lat,ne_lon)

        if self.sw_mgrs[0:2] != self.ne_mgrs[0:2]:
            raise GridException("Can't create grids across longitudinal boundaries.")

        try:
            sw_mgrs_east = self.sw_mgrs[3:4]
            ne_mgrs_east = self.ne_mgrs[3:4]
            sw_mgrs_north = self.sw_mgrs[4:5]
            ne_mgrs_north = self.ne_mgrs[4:5]

            self.start_100k_easting_index = Grid.LETTERS.index(sw_mgrs_east)
            self.end_100k_easting_index = Grid.LETTERS.index(ne_mgrs_east)

            self.start_100k_northing_index = Grid.LETTERS.index(sw_mgrs_north)
            self.end_100k_northing_index = Grid.LETTERS.index(ne_mgrs_north)
        except:
            error = dict(sw_mgrs=self.sw_mgrs, ne_mgrs=self.ne_mgrs)
            raise GeoConvertException(json.dumps(error))
        # need to check for a maximum size limit...

    # specify a grid point with a 1m designation (add zeros to easting and northing)
    def expand(self,original):
        return original[:7] + '000' + original[7:] + '000'

    # given a lat/lon combination, determine its 1km MGRS grid
    def get_mgrs(self,lat,lon):
        try:
            #input = "%s %s" % (float(lon), float(lat))
            # process = subprocess.Popen(["GeoConvert","-w","-m","-p","-3","--input-string",input],stdout=subprocess.PIPE)
            # return process.communicate()[0].rstrip()

            #Note: This gives shell access, be careful to screen your inputs!
            shell_command = "echo " + str(float(lat)) + " " + str(float(lon)) + " | GeoConvert -m -p -3"
            try:
                process = subprocess.check_output(shell_command, shell=True)
                output = process.rstrip()
            except subprocess.CalledProcessError, e:
                output = e.output

            return output

        except Exception:
            import traceback
            errorCode = 'Program Error: ' + traceback.format_exc()
            raise ProgramException('Unable to execute GeoConvert program. errorCode = '+errorCode)

    def get_polygon(self,mgrs_list):
        try:
            # m_string = ';'.join(mgrs_list)
            # process = subprocess.Popen(["GeoConvert","-w","-g","-p","0","--input-string",m_string],stdout=subprocess.PIPE)
            # result = process.communicate()[0].rstrip().split('\n')

            #Note: This gives shell access, be careful to screen your inputs!
            m_string = '\n'.join(mgrs_list)
            shell_command = "printf '" + m_string + "' | GeoConvert -g -p -0"
            try:
                process = subprocess.check_output(shell_command, shell=True)
                result = process.rstrip().split('\n')
            except subprocess.CalledProcessError, e:
                result = e.output

        except Exception:
            import traceback
            errorCode = traceback.format_exc()
            raise ProgramException('Error executing GeoConvert program. errorCode='+errorCode+'. m_string='+m_string)

        for i, val in enumerate(result):
            result[i] = tuple(float(x) for x in val.split())

        # Flip the lat/lngs
        for i, (lat, lon) in enumerate(result):
            result[i] = (lon,lat)

        return MultiPolygon([[result]])

    def create_geojson_polygon_fc(self,coords):
        feature = Feature(geometry=Polygon([coords]))
        return FeatureCollection([feature])

    def get_northing_list(self,count,northing):
        if count:
            return [northing+1,northing]
        else:
            return [northing,northing+1]

    def get_grid_coords(self,mgrs):
        easting = int(mgrs[5:7])
        northing = int(mgrs[7:9])
        heading = mgrs[0:3]
        e_index = Grid.LETTERS.index(mgrs[3:4])
        n_index = Grid.LETTERS.index(mgrs[4:5])
        coords = []


        for x_index in [easting,easting+1]:
            for y_index in self.get_northing_list(x_index-easting,northing):
                e = e_index
                n = n_index
                x = x_index
                y = y_index
                if x == 100:
                    x = 0
                    e = e_index+1
                if y == 100:
                    y = 0
                    n = n_index+1

                corner = "%s%s%s%02d%02d" % (heading, Grid.LETTERS[e], Grid.LETTERS[n], x, y)
                coords.append(self.expand(corner))

        coords.append(coords[0])
        return coords

    def get_array_for_block(self,northing_start,northing_end,easting_start,easting_end,prefix):
        m_array = []

        for n in range(northing_start,northing_end+1):
            for e in range(easting_start,easting_end+1):
                m_array.append("%s%02d%02d" % (prefix,e,n))

        return m_array

    def determine_mgrs_array(self):
        easting_start = int(self.sw_mgrs[5:7])
        easting_end = int(self.ne_mgrs[5:7])
        northing_start = int(self.sw_mgrs[7:9])
        northing_end = int(self.ne_mgrs[7:9])
        gzd_prefix = self.sw_mgrs[0:3]
        mgrs_array = []

        for e in range(self.start_100k_easting_index,self.end_100k_easting_index+1):
            for n in range(self.start_100k_northing_index,self.end_100k_northing_index+1):
                e_start = easting_start if (e == self.start_100k_easting_index) else 0
                e_end = easting_end if (e == self.end_100k_easting_index) else 99
                n_start = northing_start if (n == self.start_100k_northing_index) else 0
                n_end = northing_end if (n == self.end_100k_northing_index) else 99
                prefix = "%s%s%s" % (gzd_prefix,Grid.LETTERS[e],Grid.LETTERS[n])
                mgrs_array.extend(self.get_array_for_block(n_start,n_end,e_start,e_end,prefix))

        return mgrs_array

    def build_grid_fc(self):

        # can probably check for a maximum grid size...

        # and check that bounding box specified correctly

        # if we're not in the same 100,000km grid, will have to do something with this boundary condition
        # probably break each grid down into their components and get the relevant boxes within each

        m_array = self.determine_mgrs_array()

        for i,val in enumerate(m_array):
            gc = self.get_grid_coords(val)
            polygon = self.get_polygon(gc)
            m_array[i] = Feature(geometry=polygon,properties={"mgrs":val},id="mgrs."+val,geometry_name="the_geom")

        return FeatureCollection(m_array)


class GridException(Exception):
    pass


class GeoConvertException(Exception):
    pass

