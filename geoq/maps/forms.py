# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from geoq.core.forms import StyledModelForm
from django.forms.models import inlineformset_factory
from models import Feature, FeatureType, Map, Layer, MapLayer


class FeatureForm(StyledModelForm):
    class Meta:
        model = Feature
        excluded_fields = ("aoi")


class FeatureTypeForm(StyledModelForm):
    class Meta:
        model = FeatureType


class MapForm(StyledModelForm):
    class Meta:
        model = Map


class LayerForm(StyledModelForm):
    class Meta:
        model = Layer


class MapLayerForm(StyledModelForm):
    class Meta:
        model = MapLayer

MapInlineFormset = inlineformset_factory(Map, MapLayer, extra=3)