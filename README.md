# GeoQ

#### Geographic Work Queueing and Tasking System ####

GeoQ is an open source (MIT License) geographic tasking system that allows teams to collect geographic structured observations across a large area, but manage the work in smaller geographic regions. Large areas can be quickly broken up into small 1km squares and assigned to a team. System transparency informs all groups about workflow to avoid duplication of effort.

The GeoQ software was developed at the National Geospatial-Intelligence Agency (NGA) in collaboration with [The MITRE Corporation] (http://www.mitre.org).  The government has "unlimited rights" and is releasing this software to increase the impact of government investments by providing developers with the opportunity to take things in new directions. The software use, modification, and distribution rights are stipulated within the [MIT] (http://choosealicense.com/licenses/mit/) license.  

###Pull Requests
If you'd like to contribute to this project, please make a pull request. We'll review the pull request and discuss the changes. All pull request contributions to this project will be released under the MIT license.  

Software source code previously released under an open source license and then modified by NGA staff is considered a "joint work" (see 17 USC § 101); it is partially copyrighted, partially public domain, and as a whole is protected by the copyrights of the non-government authors and must be released according to the terms of the original open source license.

###In the News
Former NGA Director Letitia Long talks about NGA's GitHub initiative and our first offering, GeoQ, at the GEOINT Symposium.  Her comments start at 40 minutes and 40 seconds in the [video clip] (http://geointv.com/archive/geoint-2013-keynote-letitia-a-long/).  

NGA Leaders speak at the 2014 White House Innovation for Disaster Response and Recovery Demo Day about [GeoQ] (https://www.youtube.com/watch?v=X8eiXjbhfOc#t=26m13s).

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

Cloud Installation::

1. You can optionally deploy GeoQ with all dependencies to a Virtual Machine or a cloud VM (such as an Amazon Web Services EC2 box) by using the chef installer at [https://github.com/ngageoint/geoq-chef-installer](https://github.com/ngageoint/geoq-chef-installer)

2. Chef scripts are our preferred method of automating cloud builds

Mac OSX Development Build Instructions::

1. Install PostGIS 2.0 using instructions at [https://docs.djangoproject.com/en/dev/ref/contrib/gis/install/#macosx](https://docs.djangoproject.com/en/dev/ref/contrib/gis/install/#macosx). There are several options there, but for most, the easiest option is to follow the Homebrew instructions. If you don't have Homebrew installed, you can either buid it securely yourself or follow the quick (yet not secure) one line instruction at [http://brew.sh](http://brew.sh).

	One exception: Instead of using brew to install postgres, it's usually easier to install Postgres.app from [postgresapp.com](http://postgresapp.com). After installing, add the app's bin directory (``/Applications/Postgres.app/Contents/MacOS/bin``) to your PATH.

2. (Optional) Install a Geoserver (we recommend the OGC Geoserver at [https://github.com/geoserver](https://github.com/geoserver))

3. Make sure Python, Virtualenv, npm, and Git are installed

        % Note that some distros (Debian) might need additional libraries:
        % sudo apt-get build-dep python-psycopg2
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

6. Modify local settings (modify entries below based on your system settings):

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

6. (Optional) Load development fixtures:

        % paver install_dev_fixtures # creates an admin/admin superuser

7. Build user accounts:

        % python manage.py createsuperuser

8. Install less and add its folder ("type -p less") to your bash profile:

        % npm install -g less
        % python manage.py collectstatic

9. Start it up!

        % paver start_django
        

Centos 6.6 Development Build Instructions:

  Note:

  If you're installing this behind a proxy you will need to configure a few things.
  Open /etc/yum.conf and add 'proxy=http://myproxy'

	$ export http_proxy=http://myproxy
        # All non-yum installation commands will require the sudo -E flag

0. Add Repos to yum

        $ sudo yum install epel-release
        $ sudo -E rpm -Uvh http://yum.postgresql.org/9.4/redhat/rhel-6-x86_64/pgdg-redhat94-9.4-1.noarch.rpm

1. Ensure you have at least Postgresql 9.x, if not uninstall it first, then install 9.x

        $ psql --version
        $ sudo yum erase postgresql
        $ sudo yum install postgresql94 postgresql94-server postgresql94-devel
        $ psql --version # This should be 9.x now

	If your version of Postgresql is NOT 9.4, try adding the Postgresql to your $PATH

        $ export PATH=/usr/pgsql-9.4/bin:$PATH
        $ psql --version # This should ABSOLUTELY be 9.x now

2. Install Postgis-2.x, check yum for packages to match your version of Postgresql

  Example: Postgresql-9.4

        # This will install all postgis dependencies
        $ sudo yum install postgis2_94
        $ sudo yum install postgis2_94-client

3. Install Pip and Virtualenv
        
        $ python --version	# ensure python is installed (version 2.6.6 will work)
        $ sudo yum install -y python-pip
        $ sudo yum install python-devel

        # if you're behind a proxy
        $ export https_proxy=https://myprox
	$ sudo -E pip install virtualenv

4. Initialize Postgresql

        $ sudo service postgresql-9.4 initdb
        $ sudo service postgresql-9.4 start

        # Now you have edit a Postgresql config file
        $ su
        $ emacs /var/lib/pgsql/9.4/data/pg_hba.conf
        # emacs > vi

        # Change the METHOD column to trust
        # Example:
        # local   all     all                      trust
        # host    all     all     127.0.0.1/32     trust
        # host    all     all     ::1/128          trust

        $ exit
        $ sudo service postgresql-9.4 restart

5. Environment Setup

        $ mkdir -p ~/pyenv
        $ git clone https://github.com/ngageoint/geoq
        $ virtualenv --no-site-packages ~/pyenv/geoq
        $ source ~/pyenv/geoq/bin/activate

6. Installing and Using Paver

        $ cd geoq
        $ pip install paver
        $ paver install_dependencies
        # see common errors below
        $ paver createdb
        $ paver create_db_user
        $ paver sync
        
	Common Error: "python setup.py egg_info failed" The problem is the pg_config file cannot be found
	To solve add Postgresql to your $PATH (if you haven't already)
	
	$ export PATH=/usr/pgsql-9.4/bin:$PATH
         
	Common Error: 'ROLE username does not exist'
	To solve this you have to log in as postgresql (the default user)
	
	$ export PGUSER=postgresql
	
	or add your username as a ROLE:

	$ psql -U postgres # open postgres prompt (postgres is the default user)
	postgres=# CREATE ROLE username WITH SUPERUSER;
	postgres=# ALTER ROLE username WITH LOGIN;
	postgres=# \q


7. Modify local settings (modify entries below based on your system settings):

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


8. Installing Final Dependencies

        $ sudo yum install nodejs-less
        $ sudo -E easy_install BeautifulSoup

9. Run Server

        $ sudo mkdir /var/www
        $ sudo mkdir /var/www/static
        $ sudo chown username static
        $ python manage.py collectstatic

        $ paver start_django 
        # point browser to localhost:8000
