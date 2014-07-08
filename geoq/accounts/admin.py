# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import reversion
from django.contrib.gis import admin
from models import EmailDomain, Organization, UserAuthorization, UserProfile


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
    list_display = ('user', 'organization', 'score')
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

admin.site.register(EmailDomain, EmailDomainAdmin)
admin.site.register(Organization, OrganizationAdmin)
admin.site.register(UserProfile, UserProfileAdmin)
admin.site.register(UserAuthorization, UserAuthorizationAdmin)
