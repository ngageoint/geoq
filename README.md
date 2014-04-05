# GeoQ

#### Geographic Work Queueing and Tasking System ####

The aim of this project is to create an open-source Geographic tasking system that allows teams to collect geographic data across a large area, but manage the work in smaller geographic chunks. Large areas can be quickly broken up into small 1km square chunks and assigned to be worked by a team that has insight into what each other are doing.

The GeoQ software was developed at the National Geospatial-Intelligence Agency (NGA) as a joint effort between NGA and The MITRE Corporation. The government has "unlimited rights" and is releasing this software to increase the impact of government investments by providing developers with the opportunity to take things in new directions.  You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission.  NGA assumes no responsibility for the use of the software by any parties, and makes no guarantees, expressed or implied, about the software quality, reliability, or any other characteristic.  The GeoQ software can be redistributed and/or modified freely provided that any derivative work bears the following notice: "Elements of this work contain GeoQ: The National Geospatial-Intelligence Agency and The MITRE Corporation jointly produced this work."

###Pull request 

If you'd like to contribute to this project, please make a pull request. We'll review the pull request and discuss the changes. By submitting a pull request you agree to keep this work free of restrictions.  You are free to fork this project and add unique elements with your own stipulations in another repository or platform, but this version shall remain free of restrictions.

###This project uses:
Django under [BSD] (https://github.com/django/django/blob/master/LICENSE)

Leaflet under [BSD] (https://github.com/Leaflet/Leaflet/blob/master/LICENSE)

Postgres under [PostgreSQL license] (http://www.postgresql.org/about/licence/)

PostGIS under [GPL version 2] (http://opensource.org/licenses/gpl-2.0.php)


### GeoQ Configuration ###

The ``geoq/settings.py`` file contains installation-specific settings. The Database name/pw and server URLs will need to be configured here.


### GeoQ Installation ###

Mac OSX Development Build Instructions::

1. Install PostGIS 2.0 using instructions at [https://docs.djangoproject.com/en/dev/ref/contrib/gis/install/#macosx](https://docs.djangoproject.com/en/dev/ref/contrib/gis/install/#macosx). There are several options there, but for most, the easiest option is to follow the Homebrew instructions. If you don't have Homebrew installed, follow the (one line) instruction at [http://brew.sh](http://brew.sh).

	One exception: Instead of using brew to install postgres, it's usually easier to install Postgres.app from [postgresapp.com](http://postgresapp.com). After installing, add the app's bin directory (``/Applications/Postgres.app/Contents/MacOS/bin``) to your PATH.

2. (Optional) Install a Geoserver (we recommend the OGC Geoserver at [https://github.com/geoserver](https://github.com/geoserver))

3. Make sure Python, Virtualenv, and Git are installed

4. Install and setup geoq-django:

        % mkdir -p ~/pyenv
        % virtualenv --no-site-packages ~/pyenv/geoq
        % source ~/pyenv/geoq/bin/activate
        % git clone https://github.com/jaycrossler/geoq-django

5. Create the database and sync dependencies and data

        % cd geoq-django
        % pip install paver
        % paver install_dependencies
        % paver createdb
        % paver create_db_user
        % paver sync

6. (Optional) Load development fixtures:

        % paver install_dev_fixtures # creates an admin/admin superuser

7. Build user accounts:

        % python manage.py createsuperuser

8. Install less and add its folder ("type -p less") to your bash profile:

        % npm install -g less

9. Start it up!

        % paver start_django