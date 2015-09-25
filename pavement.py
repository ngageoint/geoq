# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7014 (FEB 2012)

import os
import sys
import time

from paver.easy import *
from paver.setuputils import setup

sys.path.append(os.path.dirname(os.path.realpath(__file__)))

setup(
    name="geoq",
    packages=['geoq'],
    version='0.0.0.2',
    url="",
    author="Site Admin",
    author_email="admin@localhost"
)


@task
def install_dependencies():
    """ Installs dependencies."""
    sh('pip install --upgrade -r geoq/requirements.txt')


@cmdopts([
    ('fixture=', 'f', 'Fixture to install"'),
])
@task
def install_fixture(options):
    """ Loads the supplied fixture """
    fixture = options.get('fixture')
    sh("python manage.py loaddata {fixture}".format(fixture=fixture))


def _perms_check():
    sh("python manage.py check_permissions")  # Check userena perms
    sh("python manage.py clean_expired")  # Clean our expired userena perms


@task
def install_dev_fixtures():
    """ Installs development fixtures in the correct order """
    fixtures = [
        'geoq/fixtures/initial_data.json',  # user permissions
        'geoq/accounts/fixtures/initial_data.json',  # dummy users and groups
        'geoq/maps/fixtures/initial_data_types.json',  # Maps
        'geoq/core/fixtures/initial_data.json',
        #'geoq/badges/fixtures/initial_data.json', # Removing badges for now, b/c not working
        ]

    for fixture in fixtures:
        sh("python manage.py loaddata {fixture}".format(fixture=fixture))

    sh("python manage.py migrate --all")
    _perms_check()


@task
def sync():
    """ Runs the syncdb process with migrations """
    sh("python manage.py syncdb --noinput")
    sh("python manage.py migrate --all --no-initial-data")

    fixture = 'geoq/fixtures/initial_data.json'
    sh("python manage.py loaddata {fixture}".format(fixture=fixture))
    _perms_check()


@task
def reset_dev_env():
    """ Resets your dev environment from scratch in the current branch you are in. """
    from geoq import settings
    database = settings.DATABASES.get('default').get('NAME')
    sh('dropdb {database}'.format(database=database))
    createdb()
    sync()
    install_dev_fixtures()


@cmdopts([
    ('bind=', 'b', 'Bind server to provided IP address and port number.'),
])
@task
def start_django(options):
    """ Starts the Django application. """
    bind = options.get('bind', '')
    sh('python manage.py runserver %s &' % bind)


@task
def delayed_fixtures():
    """Loads maps"""
    sh('python manage.py loaddata initial_data.json')


@task
def stop_django():
    """
    Stop the GeoNode Django application
    """
    kill('python', 'runserver')


@needs(['stop_django',
        'sync',
        'start_django'])
def start():
    """ Syncs the database and then starts the development server. """
    info("GeoQ is now available.")


@task
def createdb(options):
    """ Creates the database in postgres. """
    from geoq import settings
    database = settings.DATABASES.get('default').get('NAME')
    sh('createdb {database}'.format(database=database))
    sh('echo "CREATE EXTENSION postgis;CREATE EXTENSION postgis_topology" | psql -d  {database}'.format(database=database))


@task
def create_db_user():
    """ Creates the database in postgres. """
    from geoq import settings
    database = settings.DATABASES.get('default').get('NAME')
    user = settings.DATABASES.get('default').get('USER')
    password = settings.DATABASES.get('default').get('PASSWORD')

    sh('psql -d {database} -c {sql}'.format(
        database=database,
        sql='"CREATE USER {user} WITH PASSWORD \'{password}\';"'.format(user=user, password=password)))
# Order matters for the list of apps, otherwise migrations reset may fail.
_APPS = ['maps', 'accounts', 'badges', 'core']


@task
def reset_migrations():
    """
        Takes an existing environment and updates it after a full migration reset.
    """
    for app in _APPS:
        sh('python manage.py migrate %s 0001 --fake  --delete-ghost-migrations' % app)


@task
def reset_migrations_full():
    """
        Resets south to start with a clean setup.
        This task will process a default list: accounts, core, maps, badges
        To run a full reset which removes all migraitons in repo -- run paver reset_south full

    """
    for app in _APPS:
        sh('rm -rf geoq/%s/migrations/' % app)
        sh('python manage.py schemamigration %s --initial' % app)

    # Finally, we execute the last setup.
    reset_migrations()


def kill(arg1, arg2):
    """Stops a proces that contains arg1 and is filtered by arg2
    """
    from subprocess import Popen, PIPE

    # Wait until ready
    t0 = time.time()
    # Wait no more than these many seconds
    time_out = 30
    running = True
    lines = []

    while running and time.time() - t0 < time_out:
        p = Popen('ps aux | grep %s' % arg1, shell=True,
                  stdin=PIPE, stdout=PIPE, stderr=PIPE, close_fds=True)

        lines = p.stdout.readlines()

        running = False
        for line in lines:

            if '%s' % arg2 in line:
                running = True

                # Get pid
                fields = line.strip().split()

                info('Stopping %s (process number %s)' % (arg1, fields[1]))
                kill_cmd = 'kill -9 %s 2> /dev/null' % fields[1]
                os.system(kill_cmd)

        # Give it a little more time
        time.sleep(1)
    else:
        pass

    if running:
        raise Exception('Could not stop %s: '
                        'Running processes are\n%s'
                        % (arg1, '\n'.join([l.strip() for l in lines])))
