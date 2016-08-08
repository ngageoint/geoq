cat << EOF > geoq/local_settings.py
STATIC_URL_FOLDER = '/static'
STATIC_ROOT = '{0}{1}'.format('/var/www/html', STATIC_URL_FOLDER)
EOF
