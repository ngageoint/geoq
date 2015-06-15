# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django import forms
from geoq.core.forms import StyledModelForm
from django.forms.models import inlineformset_factory
from models import Feature, FeatureType, Map, Layer, MapLayer

from crispy_forms.helper import FormHelper
from crispy_forms.layout import HTML, Layout, Fieldset, ButtonHolder, Submit


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

class UploadKMZForm(forms.Form):
    title = forms.CharField(max_length=50)
    kmzfile = forms.FileField()


class LayerForm(StyledModelForm):
    class Meta:
        model = Layer

    def __init__(self, *args, **kwargs):
        super(LayerForm, self).__init__(*args, **kwargs)

        self.helper = FormHelper()
        self.helper.layout = Layout(
            Fieldset(None, 'name', 'type', 'url', 'layer', 'attribution', 'description'),
            HTML('<hr/><p><a class="btn" data-toggle="collapse" data-target="#more-options">extended form options &raquo;</a></p>'),
            Fieldset('Advanced',
                     'image_format',
                     # 'styles',
                     'refreshrate',
                     'transparent',
                     # 'enable_identify',
                     'token',
                     'additional_domains',
                     # 'constraints',
                     # 'extent',
                     # 'layer_parsing_function',
                     # 'info_format',
                     # 'root_field',
                     # 'fields_to_show',
                     'downloadableLink',
                     # 'spatial_reference',
                     'layer_params',
                     'dynamic_params',
                     css_class='collapse',
                     css_id='more-options',
                     ),
            ButtonHolder(
                HTML('<hr/><p></p>'),
                Submit('Save', 'Save', css_class='button white btn'),
            ),
        )


class MapLayerForm(StyledModelForm):
    class Meta:
        model = MapLayer

MapInlineFormset = inlineformset_factory(Map, MapLayer, extra=3)
