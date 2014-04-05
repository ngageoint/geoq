# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from core.models import Job, AOI, Project
from badges.models import Badge as Badges

from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.test import Client
from django.test import TestCase
from geoq.core.models import Project
from django.test import TestCase
from django.test import Client
from django.core.urlresolvers import reverse
from django.contrib.auth.models import User

class CoreTest(TestCase):
    # TODO test requests to all views

    fixtures = ['core/initial_data.json']
    def setUp(self):

        self.get_views = [
                           'home',
                           'project-list',
                           'project-create',
                           'job-list',
                           'job-create',
                           'aoi-create',
                          ]

        self.admin, created = User.objects.get_or_create(username='admin', password='admin', is_superuser=True)

    def test_get_requests(self):
        """
        Makes a get request to views and ensures the view returns a 200.
        """
        c = Client()
        for view in self.get_views:
            response = c.get(reverse(view))
            self.assertEqual(200, response.status_code, "Problem with GET request to {0}".format(view))

    def test_usng_proxy(self):
        """
        Tests the USNG proxy.

        Given a comma seperated bbox (-77.6348876953125,37.81846319511331,-77.5360107421875,37.87051721701939) the
        service should USNG grids as GeoJSON.
        """

        pass


    def test_change_aoi_status(self):
        """
        Tests the ChangeAOIStatus View.

        Given an AOI id and a status, update the AOI's status attribute to the new status if user is allowed to update
        the AOI.  View should return JSON of the updated value.
        """

        pass

    def test_job_detailed_list_view(self):
        """
        Tests the JobDetailedList View.

        Given a job object return the job and related aois filtered by an optional status.  Error should return a
        human readable message with numeric response status both as JSON.

        Context data returned:
        object: The job, return a 404 if it does not exist.
        object_list: A list of aois related to the project.
        statuses: A list of all possible statuses (returned from the AOI model).
        active_status: The currently selected status, as received in a url parameter.
        """

        pass

    def test_detailed_list_view(self):
        """
        Tests the DetailedList View.

        Given a project object return the project and related jobs.  Errors should return a human readable message
        with numeric response status both as JSON.

        Context data returned:
        object: The project, return a 404 if it does not exist.
        object_list: A list of jobs related to the project.
        """

        pass

    def batch_create_views(self):
        """
        Tests the BatchCreateAOIS View.

        Given a job id received via the URL pattern return the job in the appropriate template on GET requests.  POST
        requests should contain the job (supplied via the URL route) and a GeoJSON representation of new AOIs.  The
        view will bulk create new AOIS from GeoJSON and relate them to the job.  Errors should return a human readable message
        with numeric response status both as JSON.

        Context data returned:

        GET:
        object: The job, return a 404 if it does not exist.
        """

        pass


    def dashboard(self):
        """
        Tests the Dashboard View.

        Returns the dashboard.

        Context data returned:

        GET:
        projects: List of projects.
        """

        pass

    def test_create_project_view(self):
        """
        Tests the create project view.
        """

        project = dict(name='Test project.', description="This is a test.", project_type='Fire')

        c = Client()
        c.login(username='admin', password='admin')
        response = c.post(reverse('project-create'), data=project)
        self.assertEqual(response.status_code, 201)

        # Make sure the user that creates the job becomes a supervisor
        proj = Project.objects.filter(name=project.get('name'))
        self.assertTrue(self.admin in proj.supervisors)


