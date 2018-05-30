# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from reversion.admin import VersionAdmin
from django.contrib.gis import admin
from django.shortcuts import render
from django.contrib.gis import admin
from django.http import HttpResponseRedirect
from django import forms
from models import Project, Job, AOI, Setting, Organization, AOITimer, Responder
from guardian.admin import GuardedModelAdmin


class ObjectAdmin(admin.OSMGeoAdmin, VersionAdmin,):
    list_display = ('name', 'created_at', 'updated_at')


@admin.register(AOI)
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

@admin.register(Job)
class JobAdmin(GuardedModelAdmin, ObjectAdmin):
    filter_horizontal = ("analysts", "reviewers", "feature_types", "required_courses")
    list_display = ('name', 'project', 'created_at', 'updated_at', 'map')

    fields = ('name', 'map', 'workflow', 'analysts',  'reviewers', 'feature_types', \
        'required_courses', 'project', 'tags', 'editor')
    readonly_fields = ('created_at', 'updated_at')

    save_on_top = True
    save_as = True

@admin.register(Setting)
class SettingAdmin(admin.ModelAdmin):
    list_display = ['name', 'value']

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'updated_at')
    filter_horizontal = ('project_admins', 'contributors',)

@admin.register(AOITimer)
class AOITimerAdmin(admin.ModelAdmin):
    list_display = ('user', 'aoi', 'status', 'started_at', 'completed_at',)

    fields = ('user','aoi','status','started_at','completed_at',)


admin.site.register(Organization)

@admin.register(Responder)
class ResponderAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_instructions', 'in_field','last_seen', 'longitude', 'latitude')
    fields = ('name', 'contact_instructions', 'in_field','last_seen', 'longitude', 'latitude')
