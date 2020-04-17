from django.urls import include, path
from django.contrib.auth.decorators import login_required
from .views import mage_login, get_events, get_all_users, get_observations, get_icon, get_attachment, get_event_users


urlpatterns = [
    path('api/events/', get_events, name='get-events'),
    path('api/users/', get_all_users, name='get-all-users'),
    path('api/events/<int:id>/observations/', get_observations, name='get-observations'),
    path('api/events/<int:id>/form/icons/<str:type>/', get_icon, name='get-icon'),
    path('api/events/<int:id>/observations/<str:obs>/attachments/<str:att>/', get_attachment, name='get-attachment'),
    path('api/events/<int:id>/locations/users/', get_event_users, name='get-event-users'),
]
