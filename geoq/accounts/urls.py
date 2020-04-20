
from django.urls import include, path, re_path
from django.views.generic import RedirectView
from django.conf import settings
from geoq.accounts.views import OnlineUserView

from .forms import SignupFormExtra
from django.contrib.auth.decorators import login_required
from userena import views as userena_views
from .views import accept_terms_of_use, UserExpertiseView

logout_page = getattr(settings, 'LOGOUT_URL', '/geoq')


urlpatterns = [

    # TODO:Accounts -- when you remove accounts, add this back in
    # # Signup
    # path('(?P<username>[\.\w-]+)/signup/complete/$',
    #    userena_views.direct_to_user_template,
    #    {'template_name': 'userena/signup_complete.html',
    #     'extra_context': {'userena_activation_required': userena_settings.USERENA_ACTIVATION_REQUIRED,
    #                       'userena_activation_days': userena_settings.USERENA_ACTIVATION_DAYS}},
    #    name='userena_signup_complete'),

    # Signup, signin and signout
    path('signup/',
        userena_views.signin,
        {'template_name': 'accounts/templates/accounts/signup_form.html'},
        name='userena_signup'),
    path('signin/',
        userena_views.signin,
        {'template_name': 'accounts/templates/accounts/signin_form.html'},
        name='userena_signin'),
    # TODO: see if we need signout
    #path('signout/$',
    #    userena_views.signout,
    #    {'next_page': logout_page},
    #    name='userena_signout'),
    #
    #
    # # Reset password
    # path('password/reset/$',
    #     point_to_404, name='userena_password_reset'),
    # path('password/reset/done/$',
    #     point_to_404, name='userena_password_reset_done'),
    # path('password/reset/confirm/(?P<uidb36>[0-9A-Za-z]+)-(?P<token>.+)/$',
    #     point_to_404, name='userena_password_reset_confirm'),
    # path('password/reset/confirm/complete/$', point_to_404),
    #
    # # Activate
    # path('activate/(?P<activation_key>\w+)/$',
    #     point_to_404, name='userena_activate'),
    #
    # # Retry activation
    # path('activate/retry/(?P<activation_key>\w+)/$',
    #     point_to_404, name='userena_activate_retry'),
    #
    # # Change email and confirm it
    path('<str:username>/email/',
        userena_views.email_change, {'template_name': 'accounts/email_form.html'},
               name='userena_email_change' ),
    # path('(?P<username>[\.\w-]+)/email/complete/$',
    #    point_to_404, name='userena_email_change_complete'),
    # path('(?P<username>[\.\w-]+)/confirm-email/complete/$',
    #    point_to_404, name='userena_email_confirm_complete'),
    # path('confirm-email/(?P<confirmation_key>\w+)/$',
    #    point_to_404, name='userena_email_confirm'),
    #
    # # Disabled account
    # path('(?P<username>[\.\w-]+)/disabled/$',
    #    point_to_404, name='userena_disabled'),
    #
    # # Change password
    path('<str:username>/password/',
        userena_views.password_change, {'template_name': 'accounts/password_form.html'},
               name='userena_password_change' ),
    # path('(?P<username>[\.\w-]+)/password/complete/$',
    #    point_to_404, name='userena_password_change_complete'),
    #
    # # Edit profile
    # path('(?P<username>[\.\w-]+)/edit/$',
    #    point_to_404, name='userena_profile_edit'),
    path('<str:username>/edit/',
       userena_views.profile_edit, {'template_name': 'accounts/profile_form.html'},
       name='userena_profile_edit' ),
    # View profiles
    re_path('(?P<username>(?!signout|signup|signin)[\.@\w-]+)/$',
       userena_views.profile_detail, {'template_name': 'accounts/profile_detail.html'},
       name='userena_profile_detail'),
    #
    # # View profiles
    # path('(?P<username>(?!signout|signup|signin)[\.\w-]+)/$',
    #    RedirectView.as_view(url='/geoq'),
    #    name='userena_profile_detail'),
    # # path('(?P<username>(?!signout|signup|signin)[\.\w-]+)/$',
    # #    point_to_404, name='userena_profile_detail'),
    # path('page/(?P<page>[0-9]+)/$',
    #    point_to_404, name='userena_profile_list_paginated'),
    # path('$',
    #    point_to_404, name='userena_profile_list'),

    path('accept_terms_of_use/', accept_terms_of_use, name='accept_terms_link'),
    path('<str:username>/expertise/',
        UserExpertiseView.as_view(),
        name='user_expertise'),

    path('users/online/', login_required(OnlineUserView.as_view()),
        name='Online-check'),

    # If nothing overrides the urls, then load the default with userena.
    path('', include('userena.urls'))

]
