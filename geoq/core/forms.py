# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django import forms
from django.forms.widgets import (RadioInput, RadioSelect, CheckboxInput,
    CheckboxSelectMultiple)
from models import AOI, Job, Project

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


class JobForm(StyledModelForm):
    class Meta:

        fields = ('name', 'description', 'project',
                  'analysts', 'reviewers', 'feature_types', 'map')
        model = Job

    def __init__(self, *args, **kwargs):
        super(JobForm, self).__init__(*args, **kwargs)

        def remove_anonymous(field):
            """ Removes anonymous from choices in form. """
            field_var = self.fields[field].queryset.exclude(id=-1)
            self.fields[field].queryset = field_var
            return None
        remove_anonymous('reviewers')
        remove_anonymous('analysts')


class ProjectForm(StyledModelForm):
    class Meta:
        fields = ('name', 'description', 'project_type', 'active', 'private')
        model = Project
