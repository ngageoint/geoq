# GeoQ

#### Geographic Work Queueing and Tasking System ####

<a href="http://www.youtube.com/watch?feature=player_embedded&v=HL_2CuoGz1w
" target="_blank"><img src="https://raw.githubusercontent.com/wiki/ngageoint/geoq/images/geoq_video.jpg"
alt="GeoQ video" width="240" height="180" border="10" /></a>

GeoQ is an open source (MIT License) geographic tasking system that allows teams to collect geographic structured observations across a large area, but manage the work in smaller geographic regions. Large areas can be quickly broken up into small 1km squares and assigned to a team. System transparency informs all groups about workflow to avoid duplication of effort.

The GeoQ software was developed at the National Geospatial-Intelligence Agency (NGA) in collaboration with [The MITRE Corporation] (http://www.mitre.org).  The government has "unlimited rights" and is releasing this software to increase the impact of government investments by providing developers with the opportunity to take things in new directions. The software use, modification, and distribution rights are stipulated within the [MIT] (http://choosealicense.com/licenses/mit/) license.  

###Pull Requests
If you'd like to contribute to this project, please make a pull request. We'll review the pull request and discuss the changes. All pull request contributions to this project will be released under the MIT license.  

Software source code previously released under an open source license and then modified by NGA staff is considered a "joint work" (see 17 USC § 101); it is partially copyrighted, partially public domain, and as a whole is protected by the copyrights of the non-government authors and must be released according to the terms of the original open source license.

###In the News
For current news regarding GeoQ, see our [Wiki Page](https://github.com/ngageoint/geoq/wiki/In-The-News)

### Screenshots
![GeoQ Main page](https://cloud.githubusercontent.com/assets/147580/3464387/e58da414-024b-11e4-9a02-f9074f26047e.png)

![List of active jobs](https://cloud.githubusercontent.com/assets/147580/3464388/e593310e-024b-11e4-86b1-4c613551f984.png)

![Details of a job](https://cloud.githubusercontent.com/assets/147580/3464389/e59763dc-024b-11e4-86ea-90e2f6969eb6.png)

![Importing a complex shapefile as work cells](https://cloud.githubusercontent.com/assets/147580/3464390/e598cd76-024b-11e4-9cfa-a25da96490b0.png)

![Work cell status](https://cloud.githubusercontent.com/assets/147580/3464391/e5991754-024b-11e4-8c0e-48027aefc4d6.png)

![Drawing observations within a work cell](https://cloud.githubusercontent.com/assets/147580/3464392/e59b852a-024b-11e4-987f-b5ff749aa18e.png)

![Creating observations and socially tagging them](https://cloud.githubusercontent.com/assets/147580/3464393/e59bd46c-024b-11e4-826c-9db901af4d9d.png)

![Viewing work cells and observations in Google Earth](https://cloud.githubusercontent.com/assets/147580/3464394/e59d1cb4-024b-11e4-92b1-43a10fecf9f0.png)

![Work cells in Google Earth](https://cloud.githubusercontent.com/assets/147580/3464395/e5a0e4ca-024b-11e4-9500-ee468e66085e.png)


###This project relies heavily on open source packages, particularly:###
Django under [BSD] (https://github.com/django/django/blob/master/LICENSE)

Leaflet under [BSD] (https://github.com/Leaflet/Leaflet/blob/master/LICENSE)

Postgres under [PostgreSQL license] (http://www.postgresql.org/about/licence/)

PostGIS under [GPL version 2] (http://opensource.org/licenses/gpl-2.0.php)


### GeoQ Configuration ###

The ``geoq/settings.py`` file contains installation-specific settings. The Database name/pw and server URLs will need to be configured here.


### GeoQ Installation ###

**Cloud Installation::**

1. You can optionally deploy GeoQ with all dependencies to a Virtual Machine or a cloud VM (such as an Amazon Web Services EC2 box) by using the chef installer at [https://github.com/ngageoint/geoq-chef-installer](https://github.com/ngageoint/geoq-chef-installer)

2. Chef scripts are our preferred method of automating cloud builds

**Mac OSX Development Build Instructions::**

1. Install PostGIS 2.0 using instructions at [https://docs.djangoproject.com/en/dev/ref/contrib/gis/install/#macosx](https://docs.djangoproject.com/en/dev/ref/contrib/gis/install/#macosx). There are several options there, but for most, the easiest option is to follow the Homebrew instructions. If you don't have Homebrew installed, you can either buid it securely yourself or follow the quick (yet not secure) one line instruction at [http://brew.sh](http://brew.sh).

	Note for MITRE users: To install software by downloading from Internet, the computer should be connected to Outernet. 

	One exception: Instead of using brew to install postgres, it's usually easier to install Postgres.app from [postgresapp.com](http://postgresapp.com). After installing, add the app's bin directory (``/Applications/Postgres.app/Contents/Versions/X.Y/bin``) to your PATH.  After Postgres.app is installed, postGIS, gdal, and libgeoip need to be installed using the following commands:

		$ brew install postgis
		$ brew install gdal
		$ brew install libgeoip

	Note: Homebrew needs to be installed to run these commands.


2. (Optional) Install a Geoserver (we recommend the OGC Geoserver at [https://github.com/geoserver](https://github.com/geoserver))

3. Make sure Python, Virtualenv, npm, and Git are installed

        % Note that some distros (Debian) might need additional libraries:
        % sudo pip install psycopg2
        % (optional) sudo apt-get install sendmail

4. Install and setup geoq:

        % mkdir -p ~/pyenv
        % virtualenv --no-site-packages ~/pyenv/geoq
        % source ~/pyenv/geoq/bin/activate
        % git clone https://github.com/ngageoint/geoq

5. Create the database and sync dependencies and data:

        % cd geoq
        % pip install paver
        % paver install_dependencies
        % paver createdb
        % paver create_db_user
        % paver sync

6. Modify local settings (Modify entries below based on your system settings. Hit Ctl + D to save local settings file.):

        % cd geoq
        % cat > local_settings.py
        
          EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
          EMAIL_PORT = 25
          EMAIL_HOST = "localhost"
          DEFAULT_FROM_EMAIL = "geoq-alerts@server.com"
          MEDIA_ROOT = '/opt/src/pyenv/geoq/geoq-django'
          STATIC_URL_FOLDER = ''
          STATIC_ROOT = '{0}{1}'.format('/usr/src/static/', STATIC_URL_FOLDER)
          GAMIFICATION_SERVER = ''
          GAMIFICATION_PROJECT = ''
          GEOSERVER_WFS_JOB_LAYER = ''

	Note: To test GeoQ front page after starting GeoQ server, set STATIC_ROOT as follows:
		STATIC_ROOT = '{0}{1}'.format('~/geoq-static/static/', STATIC_URL_FOLDER)

6. (Optional) Load development fixtures:

        % paver install_dev_fixtures # creates an admin/admin superuser

7. Build user accounts:

        % python manage.py createsuperuser

8. Install less and add its folder ("type -p less") to your bash profile:

        % sudo npm install -g less
        % sudo python manage.py collectstatic

9. Start it up!

        % paver start_django
        
**CentOS Development build instructions (tested on CentOS 6.6)::**

*Dependencies*

* Python 2.6+
* Postgres 9.X (stock pg_hba.conf configuration)
* virtualenv
* node / npm

The following commands worked on a 64-bit CentOS 6.x system (as a privileged user):

		% yum update
		% yum localinstall http://yum.postgresql.org/9.4/redhat/rhel-6-x86_64/pgdg-centos94-9.4-1.noarch.rpm
		% yum install postgresql94-server postgresql94-python postgresql94-devel
		% rpm -Uvh http://download.fedoraproject.org/pub/epel/6/x86_64/epel-release-6-8.noarch.rpm
		% yum install postgis2_94 postgis2_94-devel python-virtualenv python-pip nodejs jodejs-devel npm git mod_wsgi
		% service postgresql-9.4 initdb
		% service postgresql-9.4 start

From a shell:

```bash
* If accessing the Internet through a proxy, set the http_proxy and https_proxy environment settings
export http_proxy=<your proxy setting>
export https_proxy=<your proxy setting>

cd /usr/local/src
mkdir geoq
virtualenv ~/geoq
cd ~/geoq
source bin/activate
git clone https://github.com/ngageoint/geoq.git
cd geoq
sudo -u postgres psql << EOF
create role geoq login password 'geoq';
create database geoq with owner geoq;
\c geoq
create extension postgis;
create extension postgis_topology;
EOF

export PATH=$PATH:/usr/pgsql-9.4/bin
pip install paver
paver install_dependencies

* Before executing the following commands, make sure the configuration for PostgreSQL allows the connection
* This can be done by modifying /var/lib/pgsql/9.4/data and changing the connection METHOD near the bottom of the file for 
* the 'local' connections. Changing the METHOD from 'ident' to 'md5' should be sufficient
* Restart postgresql (or reload config) afterwards

paver sync
paver install_dev_fixtures

npm install -g less

* Static files will be installed in a location where a web server can access them. This can be changed depending on your server
* If necessary, create the local directory ('/var/www/html' in this case)
cat << EOF > geoq/local_settings.py
STATIC_URL_FOLDER = '/static'
STATIC_ROOT = '{0}{1}'.format('/var/www/html', STATIC_URL_FOLDER)
EOF

python manage.py collectstatic

```

All that's left is to create a super user account => `python manage.py createsuperuser` and then you're ready to start GEOQ!

```bash
paver start_django
```
