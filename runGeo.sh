#!/bin/sh

service=postgresql-9.4

if (( $(ps -ef | grep -v grep | grep $service | wc -l) > 0 ))
then
echo "$service is running!!!"
else
/etc/rc.d/init.d/$service start
fi

../bin/python manage.py runserver 0.0.0.0:8000
