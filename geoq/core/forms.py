# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django import forms
from django.forms.widgets import (RadioInput, RadioSelect, CheckboxInput,
    CheckboxSelectMultiple)
from django.contrib.auth.models import User
from django.utils.html import escape, conditional_escape
from itertools import chain
from models import AOI, Job, Project
from maps.models import Layer

no_style = [RadioInput, RadioSelect, CheckboxInput, CheckboxSelectMultiple]


class StyledModelForm(forms.ModelForm):
    """
    Adds the span5 (in reference to the Twitter Bootstrap element)
    to form fields.
    """
    cls = 'span5'

    def __init__(self, *args, **kwargs):
        super(StyledModelForm, self).__init__(*args, **kwargs)

        for f in self.fields:
            if type(self.fields[f].widget) not in no_style:
                self.fields[f].widget.attrs['class'] = self.cls


class AOIForm(StyledModelForm):
    class Meta:
        fields = ('name', 'description', 'job', 'analyst',
                  'priority', 'status')
        model = AOI

class ItemSelectWidget(forms.SelectMultiple):
    def __init__(self, attrs=None, choices=(), option_title_field=''):
        self.option_title_field = option_title_field
        super(ItemSelectWidget, self).__init__(attrs, choices)

    def render_option(self, selected_choices, option_value, option_label, option_title=''):
        option_value = forms.util.force_text(option_value)
        if option_value in selected_choices:
            selected_html = u' selected="selected"'
            if not self.allow_multiple_selected:
                selected_choices.remove(option_value)
        else:
            selected_html = ''

        return u'<option title="%s" value="%s"%s>%s</option>' % ( \
            escape(option_title), escape(option_value), selected_html, conditional_escape(forms.util.force_text(option_label)))

    def render_options(self, choices, selected_choices):
            # Normalize to strings.
            selected_choices = set(forms.util.force_text(v) for v in selected_choices)
            choices = [(c[0], c[1], '') for c in choices]
            more_choices = [(c[0], c[1]) for c in self.choices]
            try:
                option_title_list = [val_list[0] for val_list in self.choices.queryset.values_list(self.option_title_field)]
                if len(more_choices) > len(option_title_list):
                    option_title_list = [''] + option_title_list # pad for empty label field
                more_choices = [(c[0], c[1], option_title_list[more_choices.index(c)]) for c in more_choices]
            except:
                more_choices = [(c[0], c[1], '') for c in more_choices] # couldn't get title values
            output = []
            for option_value, option_label, option_title in chain(more_choices, choices):
                if isinstance(option_label, (list, tuple)):
                    output.append(u'<optgroup label="%s">' % escape(forms.util.force_text(option_value)))
                    for option in option_label:
                        output.append(self.render_option(selected_choices, *option, **dict(option_title=option_title)))
                    output.append(u'</optgroup>')
                else: # option_label is just a string
                    output.append(self.render_option(selected_choices, option_value, option_label, option_title))
            return u'\n'.join(output)

class JobForm(StyledModelForm):
    analysts = forms.ModelMultipleChoiceField(
        queryset = User.objects.all(),
        widget = ItemSelectWidget(option_title_field='email')
    )
    layers = forms.ModelMultipleChoiceField(
        queryset = Layer.objects.all(),
        widget = ItemSelectWidget()
    )

    class Meta:

        fields = ('name', 'description', 'project', 'analysts',
                  'teams', 'reviewers', 'feature_types', 'required_courses', 'tags', 'layers')
        model = Job

    def __init__(self, project, *args, **kwargs):
        super(JobForm, self).__init__(*args, **kwargs)

        def remove_anonymous(field):
            """ Removes anonymous from choices in form. """
            field_var = self.fields[field].queryset.exclude(id=-1)
            self.fields[field].queryset = field_var
            return None
        remove_anonymous('reviewers')
        remove_anonymous('analysts')
        self.fields['project'].initial = project

        if 'data' in kwargs:
            self.fields['analysts'].initial = kwargs['data'].getlist('analysts',None)
        else:
            if hasattr(kwargs['instance'],'analysts'):
                self.fields['analysts'].initial = kwargs['instance'].analysts.all().values_list('id', flat=True)
            else:
                self.fields['analysts'].initial = []

            if hasattr(kwargs['instance'],'map'):
                self.fields['layers'].initial = [x.layer_id for x in kwargs['instance'].map.layers]


class ProjectForm(StyledModelForm):
    class Meta:
        fields = ('name', 'description', 'project_type', 'active', 'private')
        model = Project
