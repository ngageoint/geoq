# -*- coding: UTF-8 -*-
"""
Define a simple document management workflow:

>>> from django.contrib.auth.models import User
>>> from workflow.models import *

A couple of users to interact with the workflow

>>> fred = User.objects.create_user('fred','fred@acme.com','password')
>>> joe = User.objects.create_user('joe','joe@acme.com','password')

A document class that really should be a models.Model class (but you get the
idea)

>>> class Document():
...     def __init__(self, title, body, workflow_activity):
...             self.title = title
...             self.body = body
...             self.workflow_activity = workflow_activity
... 

Roles define the sort of person involved in a workflow.

>>> author = Role.objects.create(name="author", description="Author of a document")
>>> boss = Role.objects.create(name="boss", description="Departmental boss")

EventTypes define what sort of events can happen in a workflow.

>>> approval = EventType.objects.create(name="Document Approval", description="A document is reviewed by an approver")
>>> meeting = EventType.objects.create(name='Meeting', description='A meeting at the offices of Acme Inc')

Creating a workflow puts it into the "DEFINITION" status. It can't be used yet.

>>> wf = Workflow.objects.create(name='Simple Document Approval', slug='docapp', description='A simple document approval process', created_by=joe)

Adding four states:

>>> s1 = State.objects.create(name='In Draft', description='The author is writing a draft of the document', is_start_state=True, workflow=wf)
>>> s2 = State.objects.create(name='Under Review', description='The approver is reviewing the document', workflow=wf)
>>> s3 = State.objects.create(name='Published', description='The document is published', workflow=wf)
>>> s4 = State.objects.create(name='Archived', description='The document is put into the archive', is_end_state=True, workflow=wf)

Defining what sort of person is involved in each state by associating roles.

>>> s1.roles.add(author)
>>> s2.roles.add(boss)
>>> s2.roles.add(author)
>>> s3.roles.add(boss)
>>> s4.roles.add(boss)

Adding transitions to define how the states relate to each other. Notice how the
name of each transition is an "active" description of what it does in order to
get to the next state.

>>> t1 = Transition.objects.create(name='Request Approval', workflow=wf, from_state=s1, to_state=s2)
>>> t2 = Transition.objects.create(name='Revise Draft', workflow=wf, from_state=s2, to_state=s1)
>>> t3 = Transition.objects.create(name='Publish', workflow=wf, from_state=s2, to_state=s3)
>>> t4 = Transition.objects.create(name='Archive', workflow=wf, from_state=s3, to_state=s4)

Once again, using roles to define what sort of person can transition between
states.

>>> t1.roles.add(author)
>>> t2.roles.add(boss)
>>> t3.roles.add(boss)
>>> t4.roles.add(boss)

Creating a mandatory event to be attended by the boss and author during the
"Under Review" state.

>>> approval_meeting = Event.objects.create(name='Approval Meeting', description='Approver and author meet to discuss document', workflow=wf, state=s2, is_mandatory=True)
>>> approval_meeting.roles.add(author)
>>> approval_meeting.roles.add(boss)

Notice how we can define what sort of event this is by associating event types
defined earlier

>>> approval_meeting.event_types.add(approval)
>>> approval_meeting.event_types.add(meeting)

An event doesn't have to be *so* constrained by workflow, roles or state. The
following state can take place in any workflow, at any state by any role:

>>> team_meeting = Event.objects.create(name='Team Meeting', description='A team meeting that can happen in any workflow')
>>> team_meeting.event_types.add(meeting)

The activate method on the workflow validates the directed graph and puts it in
the "active" state so it can be used.

>>> wf.activate()

Lets set up a workflow activity and assign roles to users for a new document so
we can interact with the workflow we defined above.

>>> wa = WorkflowActivity(workflow=wf, created_by=fred)
>>> wa.save()

Use the built in methods associated with the WorkflowActivity class to ensure
such changes are appropriately logged in the history.

>>> p1 = Participant()
>>> p1 = Participant(user=fred, workflowactivity=wa)
>>> p1.save()
>>> p2 = Participant(user=joe, workflowactivity=wa)
>>> p2.save()
>>> wa.assign_role(fred, joe, boss)
<WorkflowHistory: Role "boss" assigned to joe created by fred>
>>> wa.assign_role(joe, fred, author)
<WorkflowHistory: Role "author" assigned to fred created by joe - boss>
>>> d = Document(title='Had..?', body="Bob, where Alice had had 'had', had had 'had had'; 'had had' had had the examiner's approval", workflow_activity=wa)

Starting the workflow via the workflow activity is easy... notice we have to pass
the participant and that the method returns the current state.

>>> d.workflow_activity.start(fred)
<WorkflowHistory: Started workflow created by fred - author>

The WorkflowActivity's current_state() method does exactly what it says. You can
find out lots of interesting things...

>>> current = d.workflow_activity.current_state()
>>> current.participant
<Participant: fred - author>
>>> current.note
u'Started workflow'
>>> current.state
<State: In Draft>
>>> current.state.transitions_from.all()
[<Transition: Request Approval>]

Lets progress the workflow for this document (the author has finished the draft
and submits it for approval)

>>> my_transition = current.state.transitions_from.all()[0]
>>> my_transition
<Transition: Request Approval>
>>> d.workflow_activity.progress(my_transition, fred)
<WorkflowHistory: Request Approval created by fred - author>

Notice the WorkflowActivity's progress method returns the new state. What is 
current_state() telling us..?

>>> current = d.workflow_activity.current_state()
>>> current.state
<State: Under Review>
>>> current.state.roles.all()
[<Role: author>, <Role: boss>]
>>> current.transition
<Transition: Request Approval>
>>> current.note
u'Request Approval'
>>> current.state.events.all()
[<Event: Approval Meeting>]

So we have an event associated with this event. Lets pretend it's happened.
Notice that I can pass a bespoke "note" to store against the event.

>>> my_event = current.state.events.all()[0]
>>> d.workflow_activity.log_event(my_event, joe, "A great review meeting, loved the punchline!")
<WorkflowHistory: A great review meeting, loved the punchline! created by joe - boss>
>>> current = d.workflow_activity.current_state()
>>> current.state
<State: Under Review>
>>> current.event
<Event: Approval Meeting>
>>> current.note
u'A great review meeting, loved the punchline!'

Continue with the progress of the workflow activity... Notice I can also pass a
bespoke "note" to the progress method.

>>> current.state.transitions_from.all().order_by('id')
[<Transition: Revise Draft>, <Transition: Publish>]
>>> my_transition = current.state.transitions_from.all().order_by('id')[1]
>>> d.workflow_activity.progress(my_transition, joe, "We'll be up for a Pulitzer")
<WorkflowHistory: We'll be up for a Pulitzer created by joe - boss>

We can also log events that have not been associated with specific workflows,
states or roles...

>>> d.workflow_activity.log_event(team_meeting, joe)
<WorkflowHistory: Team Meeting created by joe - boss>
>>> current = d.workflow_activity.current_state()
>>> current.event
<Event: Team Meeting>

Lets finish the workflow just to demonstrate what useful stuff is logged:

>>> current = d.workflow_activity.current_state()
>>> current.state.transitions_from.all().order_by('id')
[<Transition: Archive>]
>>> my_transition = current.state.transitions_from.all().order_by('id')[0]
>>> d.workflow_activity.progress(my_transition, joe)
<WorkflowHistory: Archive created by joe - boss>
>>> for item in d.workflow_activity.history.all():
...     print '%s by %s'%(item.note, item.participant.user.username)
... 
Archive by joe
Team Meeting by joe
We'll be up for a Pulitzer by joe
A great review meeting, loved the punchline! by joe
Request Approval by fred
Started workflow by fred
Role "author" assigned to fred by joe
Role "boss" assigned to joe by fred

Unit tests are found in the unit_tests module. In addition to doctests this file
is a hook into the Django unit-test framework. 

Author: Nicholas H.Tollervey

"""
from unit_tests.test_views import *
from unit_tests.test_models import *
from unit_tests.test_forms import *
