# -*- coding: UTF-8 -*-
from django.contrib import admin
from models import Role, Workflow, State, Transition, EventType, Event

class RoleAdmin(admin.ModelAdmin):
    """
    Role administration
    """
    list_display = ['name', 'description']
    search_fields = ['name', 'description']
    save_on_top = True

class WorkflowAdmin(admin.ModelAdmin):
    """
    Workflow administration
    """
    list_display = ['name', 'description', 'status', 'created_on', 'created_by',
            'cloned_from']
    search_fields = ['name', 'description']
    save_on_top = True
    exclude = ['created_on', 'cloned_from']
    list_filter = ['status']

class StateAdmin(admin.ModelAdmin):
    """
    State administration
    """
    list_display = ['name', 'description']
    search_fields = ['name', 'description']
    save_on_top = True

class TransitionAdmin(admin.ModelAdmin):
    """
    Transition administation
    """
    list_display = ['name', 'from_state', 'to_state']
    search_fields = ['name',]
    save_on_top = True

class EventTypeAdmin(admin.ModelAdmin):
    """
    EventType administration
    """
    list_display = ['name', 'description']
    save_on_top = True
    search_fields = ['name', 'description']

class EventAdmin(admin.ModelAdmin):
    """
    Event administration
    """
    list_display = ['name', 'description', 'workflow', 'state', 'is_mandatory']
    save_on_top = True
    search_fields = ['name', 'description']
    list_filter = ['event_types', 'is_mandatory']

admin.site.register(Role, RoleAdmin)
admin.site.register(Workflow, WorkflowAdmin)
admin.site.register(State, StateAdmin)
admin.site.register(Transition, TransitionAdmin)
admin.site.register(EventType, EventTypeAdmin)
admin.site.register(Event, EventAdmin)
