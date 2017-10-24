#!/bin/bash

# wait until we have a database connection
./wait-for db:5432 -- 'echo "Ready..."'

export DJANGO_SETTINGS_MODULE=geoq.settings
export PATH=$PATH:/usr/lib/postgresql/9.4/bin

python manage.py migrate
python manage.py collectstatic --noinput
paver install_dev_fixtures

# Prepare log files
touch /var/log/gunicorn.log
touch /var/log/access.log
tail -n 0 -f /var/log/gunicorn.log /var/log/access.log &


# Start Gunicorn
echo Starting Gunicorn
exec gunicorn geoq.wsgi:application \
    --name geoq \
    --bind unix:django_app.sock \
    --workers 3 \
    --log-level=info \
    --log-file=/var/log/gunicorn.log \
    --access-logfile=/var/log/access.log &

echo Starting nginx
exec service nginx start