FROM python:2.7.13

ENV http_proxy http://gatekeeper.mitre.org:80/
ENV https_proxy http://gatekeeper.mitre.org:80/

RUN apt-get update && apt-get -y upgrade
RUN apt-get -y install python-gdbm python-tk
RUN apt-get -y install binutils libproj-dev gdal-bin nodejs nodejs-dev npm postgresql-client-common postgresql-client
RUN apt-get -y install nginx
RUN npm install -g less
RUN ln -s /usr/bin/nodejs /usr/bin/node

ADD . /usr/src/geoq
WORKDIR /usr/src/geoq

RUN pip install -r geoq/requirements.txt --proxy=http://gatekeeper.mitre.org:80/

EXPOSE 80

COPY ./docker-entrypoint.sh /
COPY ./django_nginx.conf /etc/nginx/sites-available/django_nginx.conf
RUN ln -s /etc/nginx/sites-available/django_nginx.conf /etc/nginx/sites-enabled
RUN echo "daemon off;" >> /etc/nginx/nginx.conf

ENV http_proxy ""
ENV https_proxy ""

ENTRYPOINT ["/docker-entrypoint.sh"]