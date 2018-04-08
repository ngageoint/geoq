# -*- coding: UTF-8 -*-
"""
Models for Workflows.

Copyright (c) 2009 Nicholas H.Tollervey (http://ntoll.org/contact)

All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice,
this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in
the documentation and/or other materials provided with the
distribution.
* Neither the name of ntoll.org nor the names of its
contributors may be used to endorse or promote products
derived from this software without specific prior written
permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND
CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

"""
from django.db import models
from jsonfield import JSONField
from django.core.exceptions import ObjectDoesNotExist
from django.utils.translation import ugettext_lazy as _, ugettext as __
from django.contrib.auth.models import User
import django.dispatch
import datetime
import json

############
# Exceptions
############

class UnableToActivateWorkflow(Exception):
    """
    To be raised if unable to activate the workflow because it did not pass the
    validation steps
    """

class UnableToCloneWorkflow(Exception):
    """
    To be raised if unable to clone a workflow model (and related models)
    """

class UnableToStartWorkflow(Exception):
    """
    To be raised if a WorkflowActivity is unable to start a workflow
    """

class UnableToProgressWorkflow(Exception):
    """
    To be raised if the WorkflowActivity is unable to progress a workflow with a
    particular transition.
    """

class UnableToLogWorkflowEvent(Exception):
    """
    To be raised if the WorkflowActivity is unable to log an event in the
    WorkflowHistory
    """

class UnableToAddCommentToWorkflow(Exception):
    """
    To be raised if the WorkflowActivity is unable to log a comment in the
    WorkflowHistory
    """

class UnableToDisableParticipant(Exception):
    """
    To be raised if the WorkflowActivity is unable to disable a participant
    """

class UnableToEnableParticipant(Exception):
    """
    To be raised if the WorkflowActivity is unable to enable a participant
    """

#########
# Signals
#########

# Fired when a role is assigned to a user for a particular run of a workflow
# (defined in the WorkflowActivity). The sender is an instance of the
# WorkflowHistory model logging this event.
role_assigned = django.dispatch.Signal()
# Fired when a role is removed from a user for a particular run of a workflow
# (defined in the WorkflowActivity). The sender is an instance of the
# WorkflowHistory model logging this event.
role_removed = django.dispatch.Signal()
# Fired when a new WorkflowActivity starts navigating a workflow. The sender is
# an instance of the WorkflowActivity model
workflow_started = django.dispatch.Signal()
# Fired just before a WorkflowActivity creates a new item in the Workflow History
# (the sender is an instance of the WorkflowHistory model)
workflow_pre_change = django.dispatch.Signal()
# Fired after a WorkflowActivity creates a new item in the Workflow History (the
# sender is an instance of the WorkflowHistory model)
workflow_post_change = django.dispatch.Signal()
# Fired when a WorkflowActivity causes a transition to a new state (the sender is
# an instance of the WorkflowHistory model)
workflow_transitioned = django.dispatch.Signal()
# Fired when some event happens during the life of a WorkflowActivity (the
# sender is an instance of the WorkflowHistory model)
workflow_event_completed = django.dispatch.Signal()
# Fired when a comment is created during the lift of a WorkflowActivity (the
# sender is an instance of the WorkflowHistory model)
workflow_commented = django.dispatch.Signal()
# Fired when an active WorkflowActivity reaches a workflow's end state. The
# sender is an instance of the WorkflowActivity model
workflow_ended = django.dispatch.Signal()

########
# Models
########
class Role(models.Model):
    """
    Represents a type of user who can be associated with a workflow. Used by
    the State and Transition models to define *who* has permission to view a
    state or use a transition. The Event model uses this model to reference
    *who* should be involved in a particular event.
    """
    name = models.CharField(
            _('Name of Role'),
            max_length=64
            )
    description = models.TextField(
            _('Description'),
            blank=True
            )

    def __unicode__(self):
        return self.name

    class Meta:
        ordering = ['name',]
        verbose_name = _('Role')
        verbose_name_plural = _('Roles')
        permissions = (
                ('can_define_roles', __('Can define roles')),
            )

class Workflow(models.Model):
    """
    Instances of this class represent a named workflow that achieve a particular
    aim through a series of related states / transitions. A name for a directed
    graph.
    """

    # A workflow can be in one of three states:
    #
    # * definition: you're building the thing to meet whatever requirements you
    # have
    #
    # * active: you're using the defined workflow in relation to things in your
    # application - the workflow definition is frozen from this point on.
    #
    # * retired: you no longer use the workflow (but we keep it so it can be
    # cloned as the basis of new workflows starting in the definition state)
    #
    # Why do this? Imagine the mess that could be created if a "live" workflow
    # was edited and states were deleted or orphaned. These states at least
    # allow us to check things don't go horribly wrong. :-/
    DEFINITION = 0
    ACTIVE = 1
    RETIRED = 2

    STATUS_CHOICE_LIST  = (
                (DEFINITION, _('In definition')),
                (ACTIVE, _('Active')),
                (RETIRED, _('Retired')),
            )

    name = models.CharField(
            _('Workflow Name'),
            max_length=128
            )
    slug = models.SlugField(
            _('Slug')
            )
    description = models.TextField(
            _('Description'),
            blank=True
            )
    status = models.IntegerField(
            _('Status'),
            choices=STATUS_CHOICE_LIST,
            default = DEFINITION
            )
    # These next fields are helpful for tracking the history and devlopment of a
    # workflow should it have been cloned
    created_on = models.DateTimeField(
            auto_now_add=True
            )
    created_by = models.ForeignKey(
            User
            )
    cloned_from = models.ForeignKey(
            'self',
            null=True
            )

    # To hold error messages created in the validate method
    errors = {
                'workflow':[],
                'states': {},
                'transitions':{},
             }

    def is_valid(self):
        """
        Checks that the directed graph doesn't contain any orphaned nodes (is
        connected), any cul-de-sac nodes (non-end nodes with no exit
        transition), has compatible roles for transitions and states and
        contains exactly one start node and at least one end state.

        Any errors are logged in the errors dictionary.

        Returns a boolean
        """
        self.errors = {
                'workflow':[],
                'states': {},
                'transitions':{},
             }
        valid = True

        # The graph must have only one start node
        if self.states.filter(is_start_state=True).count() != 1:
            self.errors['workflow'].append(__('There must be only one start'\
                ' state'))
            valid = False

        # The graph must have at least one end state
        if self.states.filter(is_end_state=True).count() < 1:
            self.errors['workflow'].append(__('There must be at least one end'\
                ' state'))
            valid = False

        # Check for orphan nodes / cul-de-sac nodes
        all_states = self.states.all()
        for state in all_states:
            if state.transitions_into.all().count() == 0 and state.is_start_state == False:
                if not state.id in self.errors['states']:
                    self.errors['states'][state.id] = list()
                self.errors['states'][state.id].append(__('This state is'\
                        ' orphaned. There is no way to get to it given the'\
                        ' current workflow topology.'))
                valid = False

            if state.transitions_from.all().count() == 0 and state.is_end_state == False:
                if not state.id in self.errors['states']:
                    self.errors['states'][state.id] = list()
                self.errors['states'][state.id].append(__('This state is a'\
                        ' dead end. It is not marked as an end state and there'\
                        ' is no way to exit from it.'))
                valid = False

        # Check the role collections are compatible between states and
        # transitions (i.e. there cannot be any transitions that are only
        # available to participants with roles that are not also roles
        # associated with the parent state).
        for state in all_states:
            # *at least* one role from the state must also be associated
            # with each transition where the state is the from_state
            state_roles = state.roles.all()
            for transition in state.transitions_from.all():
                if not transition.roles.filter(pk__in=[r.id for r in state_roles]):
                    if not transition.id in self.errors['transitions']:
                        self.errors['transitions'][transition.id] = list()
                    self.errors['transitions'][transition.id].append(__('This'\
                            ' transition is not navigable because none of the'\
                            ' roles associated with the parent state have'\
                            ' permission to use it.'))
                    valid = False
        return valid

    def has_errors(self, thing):
        """
        Utility method to quickly get a list of errors associated with the
        "thing" passed to it (either a state or transition)
        """
        if isinstance(thing, State):
            if thing.id in self.errors['states']:
                return self.errors['states'][thing.id]
            else:
                return []
        elif isinstance(thing, Transition):
            if thing.id in self.errors['transitions']:
                return self.errors['transitions'][thing.id]
            else:
                return []
        else:
            return []

    def activate(self):
        """
        Puts the workflow in the "active" state after checking the directed
        graph doesn't contain any orphaned nodes (is connected), is in
        DEFINITION state, has compatible roles for transitions and states and
        contains exactly one start state and at least one end state
        """
        # Only workflows in definition state can be activated
        if not self.status == self.DEFINITION:
            raise UnableToActivateWorkflow, __('Only workflows in the'\
                    ' "definition" state may be activated')
        if not self.is_valid():
            raise UnableToActivateWorkflow, __("Cannot activate as the"\
                    " workflow doesn't validate.")
        # Good to go...
        self.status = self.ACTIVE
        self.save()

    def retire(self):
        """
        Retires the workflow so it can no-longer be used with new
        WorkflowActivity models
        """
        self.status = self.RETIRED
        self.save()

    def clone(self, user):
        """
        Returns a clone of the workflow. The clone will be in the DEFINITION
        state whereas the source workflow *must* be ACTIVE or RETIRED (so we
        know it *must* be valid).
        """

        # TODO: A target for refactoring so calling this method doesn't hit the
        # database so hard. Would welcome ideas..?

        if self.status >= self.ACTIVE:
            # Clone this workflow
            clone_workflow = Workflow()
            clone_workflow.name = self.name
            clone_workflow.slug = self.slug+'_clone'
            clone_workflow.description = self.description
            clone_workflow.status = self.DEFINITION
            clone_workflow.created_by = user
            clone_workflow.cloned_from = self
            clone_workflow.save()
            # Clone the states
            state_dict = dict() # key = old pk of state, val = new clone state
            for s in self.states.all():
                clone_state = State()
                clone_state.name = s.name
                clone_state.description = s.description
                clone_state.is_start_state = s.is_start_state
                clone_state.is_end_state = s.is_end_state
                clone_state.workflow = clone_workflow
                clone_state.estimation_value = s.estimation_value
                clone_state.estimation_unit = s.estimation_unit
                clone_state.save()
                for r in s.roles.all():
                    clone_state.roles.add(r)
                state_dict[s.id] = clone_state
            # Clone the transitions
            for tr in self.transitions.all():
                clone_trans = Transition()
                clone_trans.name = tr.name
                clone_trans.workflow = clone_workflow
                clone_trans.from_state = state_dict[tr.from_state.id]
                clone_trans.to_state = state_dict[tr.to_state.id]
                clone_trans.save()
                for r in tr.roles.all():
                    clone_trans.roles.add(r)
            # Clone the events
            for ev in self.events.all():
                clone_event = Event()
                clone_event.name = ev.name
                clone_event.description = ev.description
                clone_event.workflow = clone_workflow
                clone_event.state = state_dict[ev.state.id]
                clone_event.is_mandatory = ev.is_mandatory
                clone_event.save()
                for r in ev.roles.all():
                    clone_event.roles.add(r)
            return clone_workflow
        else:
            raise UnableToCloneWorkflow, __('Only active or retired workflows'\
                    ' may be cloned')

    def path(self):
        #if not self.is_valid():
        #    # throw some error
        start = self.states.filter(is_start_state=True).first()
        last = self.states.filter(is_end_state=True).first()
        return self.find_path(start,last,[])

    def find_path(self,start,end,wpath):
        wpath = wpath + [start]
        if start == end:
            return wpath
        for t in start.transitions_from.all():
            node = t.to_state
            if node not in wpath:
                newpath = self.find_path(node,end,wpath)
                if newpath: return newpath
        return None

    def __unicode__(self):
        return self.name

    class Meta:
        ordering = ['status', 'name']
        verbose_name = _('Workflow')
        verbose_name_plural = _('Workflows')
        permissions = (
                ('can_manage_workflows', __('Can manage workflows')),
            )

class State(models.Model):
    """
    Represents a specific state that a thing can be in during its progress
    through a workflow. A node in a directed graph.
    """

    # Constant values to denote a period of time in seconds
    SECOND = 1
    MINUTE = 60
    HOUR = 3600
    DAY = 86400
    WEEK = 604800

    DURATIONS = (
            (SECOND, _('Second(s)')),
            (MINUTE, _('Minute(s)')),
            (HOUR, _('Hour(s)')),
            (DAY, _('Day(s)')),
            (WEEK, _('Week(s)')),
            )

    name = models.CharField(
            _('Name'),
            max_length=256
            )
    description = models.TextField(
            _('Description'),
            blank=True
            )
    is_start_state = models.BooleanField(
            _('Is the start state?'),
            help_text=_('There can only be one start state for a workflow'),
            default=False
            )
    is_end_state = models.BooleanField(
            _('Is an end state?'),
            help_text=_('An end state shows that the workflow is complete'),
            default=False
            )
    workflow = models.ForeignKey(
            Workflow,
            related_name='states')
    # The roles defined here define *who* has permission to view the item in
    # this state.
    roles = models.ManyToManyField(
            Role,
            blank=True
            )
    # The following two fields allow a specification of expected duration to be
    # associated with a state. The estimation_value field stores the amount of
    # time, whilst estimation_unit stores the unit of time estimation_value is
    # in. For example, estimation_value=5, estimation_unit=DAY means something
    # is expected to be in this state for 5 days. By doing estimation_value *
    # estimation_unit we can get the number of seconds to pass into a timedelta
    # to discover when the deadline for a state is.
    estimation_value = models.IntegerField(
            _('Estimated time (value)'),
            default=0,
            help_text=_('Use whole numbers')
            )
    estimation_unit = models.IntegerField(
            _('Estimation unit of time'),
            default=DAY,
            choices = DURATIONS
            )

    # for display on GeoQ
    slug = models.SlugField(
            _('Slug'),
            blank=True
            )
    color = JSONField(
            null=True,blank=True,
            help_text="Color properties for this state. Should be json that includes color, fillColor, fillOpacity, opacity and weight"
            )

    def deadline(self):
        """
        Will return the expected deadline (or None) for this state calculated
        from datetime.today()
        """
        if self.estimation_value > 0:
            duration = datetime.timedelta(
                    seconds=(self.estimation_value*self.estimation_unit)
                    )
            return (self._today()+duration)
        else:
            return None

    def _today(self):
        """
        To help with the unit tests
        """
        return datetime.datetime.today()

    @property
    def color_json(self):
        return eval(json.dumps(self.color))

    def __unicode__(self):
        return self.name

    class Meta:
        ordering = ['-is_start_state','is_end_state']
        verbose_name = _('State')
        verbose_name_plural = _('States')

class Transition(models.Model):
    """
    Represents how a workflow can move between different states. An edge
    between state "nodes" in a directed graph.
    """
    name = models.CharField(
            _('Name of transition'),
            max_length=128,
            help_text=_('Use an "active" verb. e.g. "Close Issue", "Open'\
                ' Vacancy" or "Start Interviews"')
            )
    # This field is the result of denormalization to help with the Workflow
    # class's clone() method.
    workflow = models.ForeignKey(
            Workflow,
            related_name = 'transitions'
            )
    from_state = models.ForeignKey(
            State,
            related_name = 'transitions_from'
            )
    to_state = models.ForeignKey(
            State,
            related_name = 'transitions_into'
            )
    # The roles referenced here define *who* has permission to use this
    # transition to move between states.
    roles = models.ManyToManyField(
            Role,
            blank=True
            )

    def __unicode__(self):
        return self.name

    class Meta:
        verbose_name = _('Transition')
        verbose_name_plural = _('Transitions')

class EventType(models.Model):
    """
    Defines the types of event that can be associated with a workflow. Examples
    might include: meeting, deadline, review, assessment etc...
    """
    name = models.CharField(
            _('Event Type Name'),
            max_length=256
            )
    description = models.TextField(
            _('Description'),
            blank=True
            )

    def __unicode__(self):
        return self.name

class Event(models.Model):
    """
    A definition of something that is supposed to happen when in a particular
    state.
    """
    name = models.CharField(
            _('Event summary'),
            max_length=256
            )
    description = models.TextField(
            _('Description'),
            blank=True
            )
    # The workflow field is the result of denormalization to help with the
    # Workflow class's clone() method.
    # Also, workflow and state can be nullable so an event can be treated as
    # "generic" for all workflows / states in the database.
    workflow = models.ForeignKey(
            Workflow,
            related_name='events',
            null=True,
            blank=True
            )
    state = models.ForeignKey(
            State,
            related_name='events',
            null=True,
            blank=True
            )
    # The roles referenced here indicate *who* is supposed to be a part of the
    # event
    roles = models.ManyToManyField(Role)
    # The event types referenced here help define what sort of event this is.
    # For example, a meeting and review (an event might be of more than one
    # type)
    event_types = models.ManyToManyField(EventType)
    # If this field is true then the workflow cannot progress beyond the related
    # state without it first appearing in the workflow history
    is_mandatory = models.BooleanField(
            _('Mandatory event'),
            default=False,
            help_text=_('This event must be marked as complete before moving'\
                    ' out of the associated state.')
            )

    def __unicode__(self):
        return self.name

    class Meta:
        verbose_name = _('Event')
        verbose_name_plural = _('Events')

class WorkflowActivity(models.Model):
    """
    Other models in a project reference this model so they become associated
    with a particular workflow.

    The WorkflowActivity object also contains *all* the methods required to
    start, progress and stop a workflow.
    """
    workflow = models.ForeignKey(Workflow)
    created_by = models.ForeignKey(User)
    created_on = models.DateTimeField(auto_now_add=True)
    completed_on = models.DateTimeField(
            null=True,
            blank=True
            )

    def current_state(self):
        """
        Returns the instance of the WorkflowHistory model that represents the
        current state this WorkflowActivity is in.
        """
        if self.history.all():
            return self.history.all()[0]
        else:
            return None

    def start(self, user):
        """
        Starts a WorkflowActivity by putting it into the start state of the
        workflow defined in the "workflow" field after validating the workflow
        activity is in a state appropriate for "starting"
        """
        participant = Participant.objects.get(workflowactivity=self, user=user,
                disabled=False)

        start_state_result = State.objects.filter(
                workflow=self.workflow,
                is_start_state=True
                )
        # Validation...
        # 1. The workflow activity isn't already started
        if self.current_state():
            if self.current_state().state:
                raise UnableToStartWorkflow, __('Already started')
        # 2. The workflow activity hasn't been force_stopped before being
        # started
        if self.completed_on:
            raise UnableToStartWorkflow, __('Already completed')
        # 3. There is exactly one start state
        if not len(start_state_result) == 1:
            raise UnableToStartWorkflow, __('Cannot find single start state')
        # Good to go...
        first_step = WorkflowHistory(
                workflowactivity=self,
                state=start_state_result[0],
                log_type=WorkflowHistory.TRANSITION,
                participant=participant,
                note=__('Started workflow'),
                deadline=start_state_result[0].deadline()
            )
        first_step.save()
        return first_step

    def progress(self, transition, user, note=''):
        """
        Attempts to progress a workflow activity with the specified transition
        as requested by the specified participant.

        The transition is validated (to make sure it is a legal "move" in the
        directed graph) and the method returns the new WorkflowHistory state or
        raises an UnableToProgressWorkflow exception.
        """
        participant = Participant.objects.get(workflowactivity=self, user=user,
                disabled=False)
        # Validate the transition
        current_state = self.current_state()

        # 1. Make sure the workflow activity is started
        if not current_state:
            raise UnableToProgressWorkflow, __('Start the workflow before'\
                    ' attempting to transition')
        # 2. Make sure it's parent is the current state
        if not transition.from_state == current_state.state:
            raise UnableToProgressWorkflow, __('Transition not valid (wrong'\
                    ' parent)')
        # 3. Make sure all mandatory events for the current state are found in
        # the WorkflowHistory
        mandatory_events = current_state.state.events.filter(is_mandatory=True)
        for me in mandatory_events:
            if not me.history.filter(workflowactivity=self):
                raise UnableToProgressWorkflow, __('Transition not valid'\
                    ' (mandatory event missing)')
        # 4. Make sure the user has the appropriate role to allow them to make
        # the transition
        if not transition.roles.filter(pk__in=[role.id for role in participant.roles.all()]):
            raise UnableToProgressWorkflow, __('Participant has insufficient'\
                    ' authority to use the specified transition')
        # The "progress" request has been validated to store the transition into
        # the appropriate WorkflowHistory record and if it is an end state then
        # update this WorkflowActivity's record with the appropriate timestamp
        if not note:
            note = transition.name
        wh = WorkflowHistory(
                workflowactivity=self,
                state=transition.to_state,
                log_type=WorkflowHistory.TRANSITION,
                transition=transition,
                participant=participant,
                note=note,
                deadline=transition.to_state.deadline()
                )
        wh.save()
        # If we're at the end then mark the workflow activity as completed on
        # today
        if transition.to_state.is_end_state:
            self.completed_on = datetime.datetime.today()
            self.save()
        return wh

    def log_event(self, event, user, note=''):
        """
        Logs the occurance of an event in the WorkflowHistory of a
        WorkflowActivity and returns the resulting record.

        If the event is associated with a workflow or state then this method
        validates that the event is associated with the workflow, that the
        participant logging the event is also one of the event participants and
        if the event is mandatory then it must be done whilst in the
        appropriate state.
        """
        participant = Participant.objects.get(workflowactivity=self, user=user,
                disabled=False)
        current_state = self.current_state()
        if event.workflow:
            # Make sure we have an event for the right workflow
            if not event.workflow == self.workflow:
                raise UnableToLogWorkflowEvent, __('The event is not associated'\
                        ' with the workflow for the WorkflowActivity')
            if event.state:
                # If the event is mandatory then it must be completed whilst in
                # the associated state
                if event.is_mandatory:
                    if not event.state == current_state.state:
                        raise UnableToLogWorkflowEvent, __('The mandatory'\
                                ' event is not associated with the current'\
                                ' state')
        if event.roles.all():
            # Make sure the participant is associated with the event
            if not event.roles.filter(pk__in=[p.id for p in participant.roles.all()]):
                raise UnableToLogWorkflowEvent, __('The participant is not'\
                        ' associated with the specified event')
        if not note:
            note=event.name
        # Good to go...
        current_state = self.current_state().state if self.current_state() else None
        deadline = self.current_state().deadline if self.current_state() else None
        wh = WorkflowHistory(
                workflowactivity=self,
                state=current_state,
                log_type=WorkflowHistory.EVENT,
                event=event,
                participant=participant,
                note=note,
                deadline=deadline
                )
        wh.save()
        return wh

    def add_comment(self, user, note):
        """
        In many sorts of workflow it is necessary to add a comment about
        something at a particular state in a WorkflowActivity.
        """
        if not note:
            raise UnableToAddCommentToWorkflow, __('Cannot add an empty comment')
        p, created = Participant.objects.get_or_create(workflowactivity=self,
                user=user)
        current_state = self.current_state().state if self.current_state() else None
        deadline = self.current_state().deadline if self.current_state() else None
        wh = WorkflowHistory(
                workflowactivity=self,
                state=current_state,
                log_type=WorkflowHistory.COMMENT,
                participant=p,
                note=note,
                deadline=deadline
                )
        wh.save()
        return wh

    def assign_role(self, user, assignee, role):
        """
        Assigns the role to the assignee for this instance of a workflow
        activity. The arg 'user' logs who made the assignment
        """
        p_as_user = Participant.objects.get(workflowactivity=self, user=user,
                disabled=False)
        p_as_assignee, created = Participant.objects.get_or_create(
                workflowactivity=self,
                user=assignee)
        p_as_assignee.roles.add(role)
        name = assignee.get_full_name() if assignee.get_full_name() else assignee.username
        note = _('Role "%s" assigned to %s')%(role.__unicode__(), name)
        current_state = self.current_state().state if self.current_state() else None
        deadline = self.current_state().deadline if self.current_state() else None
        wh = WorkflowHistory(
                workflowactivity=self,
                state=current_state,
                log_type=WorkflowHistory.ROLE,
                participant=p_as_user,
                note=note,
                deadline=deadline
                )
        wh.save()
        role_assigned.send(sender=wh)
        return wh

    def remove_role(self, user, assignee, role):
        """
        Removes the role from the assignee. The 'user' argument is used for
        logging purposes.
        """
        try:
            p_as_user = Participant.objects.get(workflowactivity=self,
                        user=user, disabled=False)
            p_as_assignee = Participant.objects.get(workflowactivity=self,
                    user=assignee)
            if role in p_as_assignee.roles.all():
                p_as_assignee.roles.remove(role)
                name = assignee.get_full_name() if assignee.get_full_name() else assignee.username
                note = _('Role "%s" removed from %s')%(role.__unicode__(), name)
                current_state = self.current_state().state if self.current_state() else None
                deadline = self.current_state().deadline if self.current_state() else None
                wh = WorkflowHistory(
                        workflowactivity=self,
                        state=current_state,
                        log_type=WorkflowHistory.ROLE,
                        participant=p_as_user,
                        note=note,
                        deadline=deadline
                        )
                wh.save()
                role_removed.send(sender=wh)
                return wh
            else:
                # The role isn't associated with the assignee anyway so there is
                # nothing to do
                return None
        except ObjectDoesNotExist:
            # If we can't find the assignee as a participant then there is
            # nothing to do
            return None

    def clear_roles(self, user, assignee):
        """
        Clears all the roles from assignee. The 'user' argument is used for
        logging purposes.
        """
        try:
            p_as_user = Participant.objects.get(workflowactivity=self,
                        user=user, disabled=False)
            p_as_assignee = Participant.objects.get(workflowactivity=self,
                    user=assignee)
            p_as_assignee.roles.clear()
            name = assignee.get_full_name() if assignee.get_full_name() else assignee.username
            note = _('All roles removed from %s')%name
            current_state = self.current_state().state if self.current_state() else None
            deadline = self.current_state().deadline if self.current_state() else None
            wh = WorkflowHistory(
                        workflowactivity=self,
                        state=current_state,
                        log_type=WorkflowHistory.ROLE,
                        participant=p_as_user,
                        note=note,
                        deadline=deadline
                        )
            wh.save()
            role_removed.send(sender=wh)
            return wh
        except ObjectDoesNotExist:
            # If we can't find the assignee then there is nothing to do
            pass

    def disable_participant(self, user, user_to_disable, note):
        """
        Mark the user_to_disable as disabled. Must include a note explaining
        reasons for this action. Also the 'user' arg is used for logging who
        carried this out
        """
        if not note:
            raise UnableToDisableParticipant, __('Must supply a reason for'\
                    ' disabling a participant. None given.')
        try:
            p_as_user = Participant.objects.get(workflowactivity=self,
                            user=user, disabled=False)
            p_to_disable = Participant.objects.get(workflowactivity=self,
                    user=user_to_disable)
            if not p_to_disable.disabled:
                p_to_disable.disabled = True
                p_to_disable.save()
                name = user_to_disable.get_full_name() if user_to_disable.get_full_name() else user_to_disable.username
                note = _('Participant %s disabled with the reason: %s')%(name, note)
                current_state = self.current_state().state if self.current_state() else None
                deadline = self.current_state().deadline if self.current_state() else None
                wh = WorkflowHistory(
                            workflowactivity=self,
                            state=current_state,
                            log_type=WorkflowHistory.ROLE,
                            participant=p_as_user,
                            note=note,
                            deadline=deadline
                            )
                wh.save()
                return wh
            else:
                # They're already disabled
                return None
        except ObjectDoesNotExist:
            # If we can't find the assignee then there is nothing to do
            return None

    def enable_participant(self, user, user_to_enable, note):
        """
        Mark the user_to_enable as enabled. Must include a note explaining
        reasons for this action. Also the 'user' arg is used for logging who
        carried this out
        """
        if not note:
            raise UnableToEnableParticipant, __('Must supply a reason for'\
                    ' enabling a disabled participant. None given.')
        try:
            p_as_user = Participant.objects.get(workflowactivity=self,
                            user=user, disabled=False)
            p_to_enable = Participant.objects.get(workflowactivity=self,
                    user=user_to_enable)
            if p_to_enable.disabled:
                p_to_enable.disabled = False
                p_to_enable.save()
                name = user_to_enable.get_full_name() if user_to_enable.get_full_name() else user_to_enable.username
                note = _('Participant %s enabled with the reason: %s')%(name,
                        note)
                current_state = self.current_state().state if self.current_state() else None
                deadline = self.current_state().deadline if self.current_state() else None
                wh = WorkflowHistory(
                            workflowactivity=self,
                            state=current_state,
                            log_type=WorkflowHistory.ROLE,
                            participant=p_as_user,
                            note=note,
                            deadline=deadline
                            )
                wh.save()
                return wh
            else:
                # The participant is already enabled
                return None
        except ObjectDoesNotExist:
            # If we can't find the participant then there is nothing to do
            return None

    def force_stop(self, user, reason):
        """
        Should a WorkflowActivity need to be abandoned this method cleanly logs
        the event and puts the WorkflowActivity in the appropriate state (with
        reason provided by participant).
        """
        # Lets try to create an appropriate entry in the WorkflowHistory table
        current_state = self.current_state()
        participant = Participant.objects.get(
                        workflowactivity=self,
                        user=user)
        if current_state:
            final_step = WorkflowHistory(
                workflowactivity=self,
                state=current_state.state,
                log_type=WorkflowHistory.TRANSITION,
                participant=participant,
                note=__('Workflow forced to stop! Reason given: %s') % reason,
                deadline=None
                )
            final_step.save()

        self.completed_on = datetime.datetime.today()
        self.save()

    class Meta:
        ordering = ['-completed_on', '-created_on']
        verbose_name = _('Workflow Activity')
        verbose_name_plural = _('Workflow Activites')
        permissions = (
                ('can_start_workflow',__('Can start a workflow')),
                ('can_assign_roles',__('Can assign roles'))
            )

class Participant(models.Model):
    """
    Defines which users have what roles in a particular run of a workflow
    """
    user = models.ForeignKey(User)
    # can be nullable because a participant *might* not have a role assigned to
    # them (yet), and is many-to-many as they might have many different roles.
    roles = models.ManyToManyField(
            Role,
            blank=True)
    workflowactivity= models.ForeignKey(
            WorkflowActivity,
            related_name='participants'
            )
    disabled = models.BooleanField(default=False)

    def __unicode__(self):
        name = self.user.get_full_name() if self.user.get_full_name() else self.user.username
        if self.roles.all():
            roles = u' - ' + u', '.join([r.__unicode__() for r in self.roles.all()])
        else:
            roles = ''
        disabled = _(' (disabled)') if self.disabled else ''
        return u"%s%s%s"%(name, roles, disabled)

    class Meta:
        ordering = ['-disabled', 'workflowactivity', 'user',]
        verbose_name = _('Participant')
        verbose_name_plural = _('Participants')
        unique_together = ('user', 'workflowactivity')

class WorkflowHistory(models.Model):
    """
    Records what has happened and when in a particular run of a workflow. The
    latest record for the referenced WorkflowActivity will indicate the current
    state.
    """

    # The sort of things we can log in the workflow history
    TRANSITION = 1
    EVENT = 2
    ROLE = 3
    COMMENT = 4

    # Used to indicate what sort of thing we're logging in the workflow history
    TYPE_CHOICE_LIST = (
            (TRANSITION, _('Transition')),
            (EVENT, _('Event')),
            (ROLE, _('Role')),
            (COMMENT, _('Comment')),
            )

    workflowactivity= models.ForeignKey(
            WorkflowActivity,
            related_name='history')
    log_type = models.IntegerField(
            help_text=_('The sort of thing being logged'),
            choices=TYPE_CHOICE_LIST
            )
    state = models.ForeignKey(
            State,
            help_text=_('The state at this point in the workflow history'),
            null=True
            )
    transition = models.ForeignKey(
            Transition,
            null=True,
            related_name='history',
            help_text=_('The transition relating to this happening in the'\
                ' workflow history')
            )
    event = models.ForeignKey(
            Event,
            null=True,
            related_name='history',
            help_text=_('The event relating to this happening in the workflow'\
                    ' history')
            )
    participant = models.ForeignKey(
            Participant,
            help_text=_('The participant who triggered this happening in the'\
                ' workflow history')
            )
    created_on = models.DateTimeField(auto_now_add=True)
    note = models.TextField(
            _('Note'),
            blank=True
            )
    deadline = models.DateTimeField(
            _('Deadline'),
            null=True,
            blank=True,
            help_text=_('The deadline for staying in this state')
            )

    def save(self):
        workflow_pre_change.send(sender=self)
        super(WorkflowHistory, self).save()
        workflow_post_change.send(sender=self)
        if self.log_type==self.TRANSITION:
            workflow_transitioned.send(sender=self)
        if self.log_type==self.EVENT:
            workflow_event_completed.send(sender=self)
        if self.log_type==self.COMMENT:
            workflow_commented.send(sender=self)
        if self.state:
            if self.state.is_start_state:
                workflow_started.send(sender=self.workflowactivity)
            elif self.state.is_end_state:
                workflow_ended.send(sender=self.workflowactivity)

    def __unicode__(self):
        return u"%s created by %s"%(self.note, self.participant.__unicode__())

    class Meta:
        ordering = ['-created_on']
        verbose_name = _('Workflow History')
        verbose_name_plural = _('Workflow Histories')
