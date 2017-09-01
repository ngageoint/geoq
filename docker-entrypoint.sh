#!/bin/bash

# wait until we have a database connection
./wait-for db:5432 -- 'echo "Ready..."'

export DJANGO_SETTINGS_MODULE=geoq.settings
export PATH=$PATH:/usr/lib/postgresql/9.4/bin

python manage.py migrate
paver install_dev_fixtures


python manage.py runserver 0.0.0.0:8000