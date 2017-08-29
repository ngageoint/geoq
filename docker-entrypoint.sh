#!/bin/bash

export DJANGO_SETTINGS_MODULE=geoq.settings
paver createdb
paver create_db_user
paver create_admin
python manage.py migrate
paver install_dev_fixtures


python manage.py runserver 0.0.0.0:8000