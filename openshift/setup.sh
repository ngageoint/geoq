#!/usr/bin/env bash

pushd /opt/app-root/src

mkdir geoq_virtualenv
virtualenv geoq_virtualenv
source geoq_virtualenv/bin/activate

cat > ~/queries.sql << EOF
create role geoq login password '${DATABASE_PASSWORD}';
create database geoq with owner geoq;
\c geoq
create extension postgis;
create extension postgis_topology;
EOF
# This sucks, need to make these queries idempotent. For now always return true.
PGPASSWORD=${DATABASE_PASSWORD} psql -h pg-master -U postgres -f ~/queries.sql || true

pip install paver
paver install_dependencies
paver sync
paver install_dev_fixtures

cat << EOF > ~/geoq/local_settings.py
STATIC_URL_FOLDER = '/static'
STATIC_ROOT = '{0}{1}'.format('/var/www/html', STATIC_URL_FOLDER)
EOF

chmod 777 /var/www/html/static

./manage.py collectstatic
./manage.py createsuperuser --username geoqadmin --email "geoqadmin@example.com" --noinput
#echo "from django.contrib.auth.models import User; User.objects.create_superuser('geoqadmin', 'geoqadmin@example.com', '${DATABASE_PASSWORD}')" | ./manage.py shell