# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import reversion
from django.contrib.gis import admin
from models import EmailDomain, Organization, UserAuthorization, UserProfile

from django import forms
from django.utils.translation import ugettext_lazy as _
#from django.contrib.admin.widgets import FilteredSelectMutiple
from django.contrib.admin import widgets

from django.contrib.auth.models import User, Group, Permission


class ObjectAdmin(reversion.VersionAdmin,):
    pass


class EmailDomainInline(admin.TabularInline):
    model = EmailDomain
    extra = 5


class EmailDomainAdmin(ObjectAdmin):
    pass


class OrganizationAdmin(ObjectAdmin):
    inlines = [EmailDomainInline]
    pass


# Unregister userena's admin to add to it.
admin.site.unregister(UserProfile)
class UserProfileAdmin(ObjectAdmin):
    list_display = ('user', 'organization', 'score', 'openbadge_id')
    readonly_fields = ('email',)

    def __unicode__(self):
        return self.user.organization


class UserAuthorizationAdmin(ObjectAdmin):
    list_display = ('user', 'Organization', 'Email', 'authorized')
    list_editable = ('authorized',)
    readonly_fields = ('permissions_granted_by',)

    list_filter = ('user_profile__organization',)
    raw_id_admin = ('user_profile',)

    def Organization(self, obj):
        return '%s' % (obj.user_profile.organization)

    def Email(self, obj):
        return '%s' % (obj.user.email)
    
##
class GroupAdminForm(forms.ModelForm):
    
    permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.all(), 
        required=False,
        widget=widgets.FilteredSelectMultiple(
            verbose_name=_('Permissions'),
            is_stacked=False
        )
    )
    users = forms.ModelMultipleChoiceField(
        queryset=User.objects.all(), 
        required=False,
        widget=widgets.FilteredSelectMultiple(
            verbose_name=_('Users'),
            is_stacked=False
        )
    )

    class Meta:
        model = Group

    def __init__(self, *args, **kwargs):
        super(GroupAdminForm, self).__init__(*args, **kwargs)

        if self.instance and self.instance.pk:
            self.fields['permissions'].initial = self.instance.permissions.all()
            self.fields['users'].initial = self.instance.user_set.all()
    
    def save(self, commit=True):
        group = super(GroupAdminForm, self).save(commit=commit)

        if commit:
            group.user_set = self.cleaned_data['users']
        else:
            old_save_m2m = self.save_m2m
            def new_save_m2m():
                old_save_m2m()
                group.user_set = self.cleaned_data['users']
            self.save_m2m = new_save_m2m
        return group

class GroupAdmin(admin.ModelAdmin):
    form = GroupAdminForm


admin.site.register(EmailDomain, EmailDomainAdmin)
admin.site.register(Organization, OrganizationAdmin)
admin.site.register(UserProfile, UserProfileAdmin)
admin.site.register(UserAuthorization, UserAuthorizationAdmin)
admin.site.unregister(Group)
admin.site.register(Group, GroupAdmin)
