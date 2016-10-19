# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from datetime import datetime
from django.db import models
from django.contrib.auth.models import User, Group
from django.core.exceptions import ValidationError
from django.utils.translation import ugettext as _
from django.template.defaultfilters import slugify
from django.utils import timezone
from userena.models import UserenaBaseProfile


class Organization(models.Model):
    name = models.CharField(max_length=250)
    primary_contact = models.ForeignKey(User, help_text="Contact for org.")

    class Meta:
        unique_together = ('name', 'primary_contact')

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """
            Adds a permissions group for the organization if one
            doesn't exist.
        """
        org_name = 'org-%s' % slugify(self.name)
        try:
            group_chk = Group.objects.get(name=org_name)
        except Group.DoesNotExist:
            Group.objects.create(name=org_name)

        super(Organization, self).save(*args, **kwargs)


class EmailDomain(models.Model):
    email_domain = models.CharField(max_length=50)
    organization = models.ForeignKey(Organization)

    def __str__(self):
        return self.email_domain


class UserProfile(UserenaBaseProfile):
    user = models.OneToOneField(User,
                                unique=True,
                                verbose_name=_('user'))
    email = models.CharField(max_length=250, null=True, blank=True)
    organization = models.ForeignKey(Organization, null=True, blank=True,
        help_text="If '------', no Organization records share the email domain.")

    # Badge scores
    defaultScore = 1
    score = models.IntegerField(default=defaultScore)

    last_activity = models.DateTimeField(default = timezone.now())

    # OpenBadge id
    openbadge_id = models.CharField(max_length=250, null=True, blank=True)

    def __str__(self):
        return "%s, %s, %s" % (self.user, self.organization, self.email)

    def save(self, *args, **kwargs):
        """ Creates a user auth record if one doesn't exist. """
        super(UserProfile, self).save()
        self.userauthorization, created = UserAuthorization.objects.get_or_create(
            user=self.user, user_profile=self)
        super(UserProfile, self).save()

    def clean(self):
        """
            Make sure that organization assigned matches the email and
            that the email matches the organization.
        """

        #TODO -- add styling to fields when error occurs.-- Right now
        # there is just an error at the top of the admin.

        # Make sure email matches email in user account
        if self.email != self.user.email:
            self.email = self.user.email

        # domain = self.email.split('@')[1]
        # if self.organization:
        #     accepted_domains = [x['email_domain'] for x in self.organization.emaildomain_set.values('email_domain')]
        #     if domain and domain not in accepted_domains:
        #             raise ValidationError('User email domain must be in \
        #                 Organization domain options. Please add to the \
        #                 Organization record OR add a new Organization. Changes \
        #                 to this record were not saved. ')
        # else:
        #     # If the user doesn't have an org, but they have an email
        #     # assign them an organization.
        #     try:
        #         email_domain = EmailDomain.objects.get(email_domain=domain)
        #         org = email_domain.org
        #
        #         if org:
        #             if self.organization != org:
        #                 self.organization = org
        #
        #     except EmailDomain.DoesNotExist:
        #         raise ValidationError('There is no organization in the database \
        #             with the email domain of %s. Please add one before continuing \
        #             . Changes to this record were not saved.'
        #             % domain)


class UserAuthorization(models.Model):
    user = models.OneToOneField(User)
    user_profile = models.OneToOneField(UserProfile)

    authorized = models.BooleanField(help_text='Check this to approve member access.')
    permissions_granted_by = models.ForeignKey(User, null=True, blank=True,
        related_name='permissions_granted_by')
    permission_granted_on = models.DateTimeField(auto_now_add=True, default=datetime.now())
    user_accepted_terms_on = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return "%s, %s" % (self.user, self.user_profile)

    def permissions_list(self):
        perms = []
        if self.authorized:
            perms.append('authorized')
        if self.permissions_granted_by:
            perms.append('permissions_granted')
            perms.append('permissions_granted_by: '+str(self.permissions_granted_by.username))
        if self.permission_granted_on:
            perms.append('permissions_granted')
            perms.append('permission_granted_on: '+str(self.permission_granted_on))
        if self.user_accepted_terms_on:
            perms.append('user_accepted_terms')
            perms.append('user_accepted_terms_on: '+str(self.user_accepted_terms_on))
        return perms

    def save(self, *args, **kwargs):
        user_presave = User.objects.get(pk=self.user.id)

        # Grant default permissions to user if they are authorized.
        group_ids = [g.id for g in self.user.groups.all()]
        if self.authorized and 1 not in group_ids:
            # give them default auth permissions.
            self.user.groups.add(1)
            self.user.is_staff = True
            self.user.save()
        elif not self.authorized and 1 in group_ids:
            # if they are not staff and they have the permission, remove it.
            self.user.groups.remove(1)

        #If user_profile does not exist, create one for the user
        try:
            profile = UserProfile.objects.get(user=self.user)
        except UserProfile.DoesNotExist:
            profile = UserProfile.objects.create(user=self.user)

        # TODO -- make this work!
        # *** If person is authorized and part of an organization, then they can add people from that org.

        #TODO
        # *** save permissions_granted_by as the user that is granting th permissions.
        # if self.authorized and not user_presave.authorized:
        #     permissions_granted_by
        #     and self.authorized != user_presave.authorized:

        super(UserAuthorization, self).save()

