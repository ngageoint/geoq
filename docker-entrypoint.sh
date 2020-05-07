#!/bin/bash

# wait until we have a database connection
./wait-for -t 25 db:5432 -- 'echo "Ready..."'

export DJANGO_SETTINGS_MODULE=geoq.settings
export PATH=$PATH:/usr/lib/postgresql/9.4/bin

export HOST="$ALLOWED_HOST"

python manage.py migrate
python manage.py collectstatic --noinput
paver install_dev_fixtures

# set the ALLOWED_HOST
cat ./geoq/settings.py | sed "s/\'localhost\'/\'$ALLOWED_HOST\'/" > ./geoq/settings.py.new
mv ./geoq/settings.py.new ./geoq/settings.py

python manage.py runserver 0.0.0.0:8000
