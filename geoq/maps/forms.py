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

    def __init__(self, *args, **kwargs):
        super(FeatureTypeForm, self).__init__(*args, **kwargs)

        self.helper = FormHelper()
        self.helper.layout = Layout(
            Fieldset(None, 'name', 'type', 'category', 'order', 'properties'),
            HTML('<hr/><p><a id="property-toggle" class="btn" data-toggle="collapse" data-target="#property-list">Edit Properties &raquo;</a></p>'),
            HTML('<div id="property-list" class="collapse">'),
            #HTML('<label for="type">Type</label><input type="text" id="type">'),
            #HTML('<label for="severity">Severity</label><input type="text" id="severity">'),
            #HTML('<label for="name">Name</label><input type="text" id="name">'),
            HTML('<table id="property-table" class="table"><tr><th>Property</th><th>Value</th></tr>'),
            HTML('<tr><td>Type</td><td><input type="text" id="type"></td></tr>'),
            HTML('<tr><td>Severity</td><td><input type="text" id="severity"></td></tr>'),
            HTML('<tr><td>Name</td><td><input type="text" id="name"></td></tr>'),
            HTML('</table>'),
            HTML('<p><a id="property-ok" class="btn" >OK</a><a id="property-cancel" class="btn" style="margin-left: 50px;" >Cancel</a>'),
            HTML('<a id="property-add" class="btn" style="margin-left: 50px;" >Add Property</a></p>'),
            HTML('</div>'),
            HTML('<hr/><p></p>'),
            Fieldset(None, 'style'),
            HTML('<hr/><p><a id="style-toggle" class="btn" data-toggle="collapse" data-target="#style-list">Edit Style &raquo;</a></p>'),
            HTML('<div id="style-list" class="collapse">'),
            #HTML('<label for="color">Color</label><input type="text" id="color">'),
            #HTML('<label for="opacity">Opacity</label><input type="text" id="opacity">'),
            #HTML('<label for="weight">Weight</label><input type="text" id="weight">'),
            #HTML('<label for="iconUrl">Icon URL</label><input type="text" id="iconUrl">'),
            #HTML('<label for="backgroundColor">Background Color</label><input type="text" id="backgroundColor">'),
            #HTML('<label for="mapTextStyle">Map Text Style</label><input type="text" id="mapTextStyle">'),
            HTML('<table id="style-table" class="table"><tr><th>Option</th><th>Value</th></tr>'),
            HTML('<tr id="color-row"><td>Color</td><td><input type="text" id="color"></td></tr>'),
            HTML('<tr id="opacity-row"><td>Opacity</td><td><input type="text" id="opacity"></td></tr>'),
            HTML('<tr id="weight-row"><td>Weight</td><td><input type="text" id="weight"></td></tr>'),
            HTML('<tr id="fill-row"><td>Fill</td><td><input type="text" id="fill"></td></tr>'),
            HTML('<tr id="iconUrl-row"><td>Icon Url</td><td><input type="text" id="iconUrl"></td></tr>'),
            HTML('</table>'),
            HTML('<p><a id="style-ok" class="btn" >OK</a><a id="style-cancel" class="btn" style="margin-left: 50px;" >Cancel</a></p>'),
            HTML('</div>'),
            ButtonHolder(
                HTML('<hr/><p></p>'),
                Submit('Save', 'Save', css_class='button white btn'),
            ),
        )


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
