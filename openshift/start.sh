#!/usr/bin/env bash

pushd /opt/app-root/src
./openshift/setup.sh
source ./geoq_virtualenv/bin/activate
LISTEN_ADDRESS=$(ip a | grep eth0 | grep inet | awk '{print $2}' | cut -f1 -d'/')
paver start_django -b ${LISTEN_ADDRESS}:8000
while true; do
    sleep 60
done