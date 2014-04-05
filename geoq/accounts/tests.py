"""
This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""

from django.test import TestCase
from accounts.models import UserProfile


class Accounts(TestCase):
    def testUserProfile(self):
        """ Verify that creating a new user also creates a new profile """
        numberObjectsPre = UserProfile.objects.count()
        self.assertEqual(User.objects.count(),numberObjectsPre)
        newuser = User.objects.create_user(username="user",email="myemail@test.com",password="dummy")
        numberObjectsPost = UserProfile.objects.count()
        self.assertEqual(User.objects.count(),numberObjectsPost)

    def testBadges(self):
        """ Verify that a new user has no badges but can get them for being the analyst for one or more approved AOI's """
        newuser = User.objects.create_user(username="user",email="myemail@test.com",password="dummy")

        self.assertEqual(0,len(Badges.objects.filter(user=newuser)))
        # Check that score is set to default score
        self.assertEqual(UserProfile.defaultScore,newuser.get_profile().score)

        # TODO: make this into part of the fixture
        project = Project.objects.create(name="Project", description = "project", project_type="Exercise")
        project.save()

        jobs = [Job.objects.create(name="Job%d" % i, description = "blah", project=project) for i in range(3)]
        jobs.append(jobs[-1])
        for j in jobs:
            j.save()

        oldAOI = AOI.objects.all()[0]
        newAOIs = [AOI.objects.create(job=jobs[i],polygon=oldAOI.polygon) for i in range(4)]
        for n in newAOIs:
            n.save()

        # We've created 4 AOI's but none of them have analysts yet
        self.assertEqual(0,len(Badges.objects.filter(user=newuser)))
        self.assertEqual(UserProfile.defaultScore,newuser.get_profile().score)

        newAOIs[0].analyst = newuser
        newAOIs[0].save()

        # AOI hasn't been marked completed yet
        self.assertEqual(0,len(Badges.objects.filter(user=newuser)))
        self.assertEqual(UserProfile.defaultScore,newuser.get_profile().score)

        newAOIs[0].status = 'Completed'
        newAOIs[0].save()

        # Yay, we have a badge
        # TODO: why isn't badges getting updated here?
        #self.assertEqual(1,len(Badges.objects.filter(user=newuser)))
        # TODO: where/how to score the value
        self.assertEqual(UserProfile.defaultScore + 5,newuser.get_profile().score)
        # Change something other than status
        newAOIs[0].description = 'Completed'
        newAOIs[0].save()

        # Still only one badge
        #self.assertEqual(1,len(Badges.objects.filter(user=newuser)))
        # and same score
        self.assertEqual(UserProfile.defaultScore + 5,newuser.get_profile().score)
        #TODO: should a user lose points if someone else is set to be analyst

        for i in range(4):
            newAOIs[i].status = 'Completed'
            newAOIs[i].analyst = newuser
            newAOIs[i].save()

        # Two badges: 1 for supporting multiple efforts, 1 for first approved AOI
        #self.assertEqual(2,len(Badges.objects.filter(user=newuser)))
        # and score is now defaul + 5 * 4
        # TODO: should badges also be worth points?
        self.assertEqual(UserProfile.defaultScore + 5 * 4,newuser.get_profile().score)


        pass
