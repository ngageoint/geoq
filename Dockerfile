FROM python:2.7

ENV http_proxy http://gatekeeper.mitre.org:80/
ENV https_proxy http://gatekeeper.mitre.org:80/

RUN apt-get update && apt-get -y upgrade
RUN apt-get install python-gdbm python-tk

ADD . /usr/src/geoq
WORKDIR /usr/src/geoq

RUN pip install -r geoq/requirements.txt --proxy=http://gatekeeper.mitre.org:80/

RUN sudo -u postgres bash
RUN export DJANGO_SETTINGS_MODULE=geoq.settings
RUN paver createdb
RUN paver create_db_user
RUN python manage.py migrate
RUN paver install_dev_fixtures

EXPOSE 8000

COPY ./docker-entrypoint.sh /

ENTRYPOINT ["/docker-entrypoint.sh"]