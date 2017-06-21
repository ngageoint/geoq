FROM python:2.7

ENV http_proxy http://gatekeeper.mitre.org:80/
ENV https_proxy http://gatekeeper.mitre.org:80/

RUN apt-get update && apt-get -y upgrade

ADD . /usr/src/geoq
WORKDIR /usr/src/geoq

RUN pip install -r geoq/requirements.txt --proxy=http://gatekeeper.mitre.org:80/

EXPOSE 8000

COPY ./docker-entrypoint.sh /

ENTRYPOINT ["/docker-entrypoint.sh"]