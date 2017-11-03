FROM python:2.7.13

ENV http_proxy http://gatekeeper.mitre.org:80/
ENV https_proxy http://gatekeeper.mitre.org:80/

RUN apt-get update && apt-get -y upgrade
RUN apt-get -y install python-gdbm python-tk
RUN apt-get -y install binutils libproj-dev gdal-bin nodejs nodejs-dev npm postgresql-client-common postgresql-client netcat
RUN npm install -g less
RUN ln -s /usr/bin/nodejs /usr/bin/node

ADD . /usr/src/geoq
WORKDIR /usr/src/geoq

RUN pip install -r geoq/requirements.txt --proxy=http://gatekeeper.mitre.org:80/

EXPOSE 8000

COPY ./docker-entrypoint.sh /

ENTRYPOINT ["/docker-entrypoint.sh"]