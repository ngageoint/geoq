# -*- coding: UTF-8 -*-
"""

A custom test runner that includes reporting of unit test coverage. Based upon
code found here:

    http://www.thoughtspark.org/node/6

You should also have coverage.py in your python path. See:

    http://nedbatchelder.com/code/modules/coverage.html

for more information.

To use this test runner modify your settings.py file with the following:

# Specify your custom test runner to use
TEST_RUNNER='workflow.test_runner.test_runner_with_coverage'
     
# List of modules to enable for code coverage
COVERAGE_MODULES = ['workflow.models', 'workflow.views',] # etc...

You'll get a code coverage report for your unit tests:

------------------------------------------------------------------
 Unit Test Code Coverage Results
------------------------------------------------------------------
 Name           Stmts   Exec  Cover   Missing
--------------------------------------------
 sample.urls        2      0     0%   1-3
 sample.views       3      0     0%   1-5
--------------------------------------------
 TOTAL              5      0     0%
------------------------------------------------------------------

For every module added to COVERAGE_MODULES you'll get an entry telling you the
number of executable statements, the number executed, the percentage executed
and a list of the code lines not executed (in the above play example, no tests
have been written). Aim for 100% :-)

!!!! WARNING !!!

Because of the use of coverage, this test runner is SLOW.

Also, use with care - this code works with the command:

    python manage.py test workflow

(Where workflow is the name of this app in your project) 

It probably won't work for all other manage.py test cases.

TODO: Fix the cause of the warning above!

"""
import os, shutil, sys, unittest

# Look for coverage.py in __file__/lib as well as sys.path
sys.path = [os.path.join(os.path.dirname(__file__), "lib")] + sys.path
 
import coverage
from django.test.simple import run_tests as django_test_runner
  
from django.conf import settings

def test_runner_with_coverage(test_labels, verbosity=1, interactive=True, extra_tests=[]):
    """
    Custom test runner.  Follows the django.test.simple.run_tests() interface.
    """
    # Start code coverage before anything else if necessary
    if hasattr(settings, 'COVERAGE_MODULES'):
        coverage.use_cache(0) # Do not cache any of the coverage.py stuff
        coverage.start()

    test_results = django_test_runner(test_labels, verbosity, interactive, extra_tests)

    # Stop code coverage after tests have completed
    if hasattr(settings, 'COVERAGE_MODULES'):
        coverage.stop()

    # Print code metrics header
    print ''
    print '----------------------------------------------------------------------'
    print ' Unit Test Code Coverage Results'
    print '----------------------------------------------------------------------'

    # Report code coverage metrics
    if hasattr(settings, 'COVERAGE_MODULES'):
        coverage_modules = []
        for module in settings.COVERAGE_MODULES:
            coverage_modules.append(__import__(module, globals(), locals(), ['']))
        coverage.report(coverage_modules, show_missing=1)
        # Print code metrics footer
        print '----------------------------------------------------------------------'

    return test_results
