#!/bin/bash

# wait until we have a database connection
./wait-for db:5432 -- 'echo "Ready..."'

# Run database migrations and import initial data
python manage.py migrate
python manage.py collectstatic --noinput
paver install_dev_fixtures