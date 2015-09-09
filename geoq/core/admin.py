# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import reversion
from django.contrib.gis import admin
from django.shortcuts import render
from django.http import HttpResponseRedirect
from django import forms
from models import Project, Job, AOI, Setting, Organization
from guardian.admin import GuardedModelAdmin


class ObjectAdmin(admin.OSMGeoAdmin, reversion.VersionAdmin,):
    list_display = ('name', 'created_at', 'updated_at')


class AOIAdmin(ObjectAdmin):
    filter_horizontal = ("reviewers",)
    save_on_top = True
    actions = ['rename_aois']
    search_fields = ['name', 'id']

    class NameInputForm(forms.Form):
        _selected_action = forms.CharField(widget=forms.MultipleHiddenInput)
        name_field = forms.CharField(max_length=200, required=True, label="Workcell Name")

    def rename_aois(self, request, queryset):
        form = None

        if 'apply' in request.POST:
            form = self.NameInputForm(request.POST)

            if form.is_valid():
                namestring = form.cleaned_data['name_field']
                queryset.update(name=namestring)

                self.message_user(request, "Succesfully renamed selected Workcells")
                return HttpResponseRedirect(request.get_full_path())

        if not form:
            form = self.NameInputForm(initial={'_selected_action': request.POST.getlist('_selected_action')})

        return render(request, 'core/name_input.html', {'name_form': form})
    rename_aois.short_description = "Rename Workcells"


class JobAdmin(GuardedModelAdmin, ObjectAdmin):
    filter_horizontal = ("analysts", "reviewers", "feature_types", "required_courses")
    list_display = ('name', 'project', 'created_at', 'updated_at', 'map')

    fields = ('name', 'map', 'analysts',  'reviewers', 'feature_types', 'required_courses', 'project', 'tags', 'editor')
    readonly_fields = ('created_at', 'updated_at')

    save_on_top = True
    save_as = True


class SettingAdmin(admin.ModelAdmin):
    list_display = ['name', 'value']


class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'updated_at')
    filter_horizontal = ('project_admins', 'contributors',)


admin.site.register(Setting, SettingAdmin)
admin.site.register(Project, ProjectAdmin)
admin.site.register(Job, JobAdmin)
admin.site.register(AOI, AOIAdmin)
admin.site.register(Organization)
