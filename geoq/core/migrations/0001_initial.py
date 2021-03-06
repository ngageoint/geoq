# Generated by Django 3.0.5 on 2020-04-17 14:32

from django.conf import settings
import django.contrib.gis.db.models.fields
from django.db import migrations, models
import django.db.models.deletion
import jsonfield.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('workflow', '0001_initial'),
        ('maps', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('training', '0001_initial'),
        ('auth', '0011_update_proxy_permissions'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='AOI',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('assignee_id', models.PositiveIntegerField(null=True)),
                ('active', models.BooleanField(default=True, help_text="Check to make project 'Active' and visible to all users. Uncheck this to 'Archive' the project")),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('properties', jsonfield.fields.JSONField(blank=True, help_text='JSON key/value pairs associated with this object, e.g. {"usng":"18 S TJ 87308 14549", "favorite":"true"}', null=True)),
                ('polygon', django.contrib.gis.db.models.fields.MultiPolygonField(srid=4326)),
                ('priority', models.SmallIntegerField(choices=[(1, 1), (2, 2), (3, 3), (4, 4), (5, 5)], default=5)),
                ('status', models.CharField(default='Unassigned', max_length=15)),
                ('analyst', models.ForeignKey(blank=True, help_text='User assigned to work the workcell.', null=True, on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
                ('assignee_type', models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, to='contenttypes.ContentType')),
            ],
            options={
                'verbose_name': 'Area of Interest',
                'verbose_name_plural': 'Areas of Interest',
                'ordering': ['id'],
                'permissions': (('assign_workcells', 'Assign Workcells'), ('certify_workcells', 'Certify Workcells')),
            },
        ),
        migrations.CreateModel(
            name='Organization',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Short name of this organization', max_length=200, unique=True)),
                ('url', models.CharField(blank=True, help_text='Link that users should be directed to if icon is clicked', max_length=600, null=True)),
                ('icon', models.ImageField(blank=True, help_text='Upload an icon of the organization here', null=True, upload_to='static/organizations/')),
                ('show_on_front', models.BooleanField(default=False, help_text='Show on the front of the GeoQ App')),
                ('order', models.IntegerField(blank=True, default=0, help_text='Optionally specify the order orgs should appear on the front page. Lower numbers appear sooner.', null=True)),
            ],
            options={
                'verbose_name_plural': 'Organizations',
                'ordering': ['order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='Responder',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=250)),
                ('contact_instructions', models.CharField(max_length=1024)),
                ('in_field', models.BooleanField()),
                ('last_seen', models.DateTimeField(null=True)),
                ('longitude', models.DecimalField(decimal_places=7, max_digits=10)),
                ('latitude', models.DecimalField(decimal_places=7, max_digits=10)),
            ],
        ),
        migrations.CreateModel(
            name='Setting',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Name of site-wide variable', max_length=200)),
                ('value', jsonfield.fields.JSONField(blank=True, help_text='Value of site-wide variable that scripts can reference - must be valid JSON', null=True)),
            ],
        ),
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('active', models.BooleanField(default=True, help_text="Check to make project 'Active' and visible to all users. Uncheck this to 'Archive' the project")),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('properties', jsonfield.fields.JSONField(blank=True, help_text='JSON key/value pairs associated with this object, e.g. {"usng":"18 S TJ 87308 14549", "favorite":"true"}', null=True)),
                ('project_type', models.CharField(choices=[('Hurricane/Cyclone', 'Hurricane/Cyclone'), ('Tornado', 'Tornado'), ('Earthquake', 'Earthquake'), ('Extreme Weather', 'Extreme Weather'), ('Fire', 'Fire'), ('Flood', 'Flood'), ('Tsunami', 'Tsunami'), ('Volcano', 'Volcano'), ('Pandemic', 'Pandemic'), ('Exercise', 'Exercise'), ('Special Event', 'Special Event'), ('Training', 'Training')], max_length=50)),
                ('private', models.BooleanField(default=False, help_text="Check this to make this project 'Private' and available only to users assigned to it.")),
                ('contributors', models.ManyToManyField(blank=True, help_text='User that will be able to take on jobs.', related_name='contributors', to=settings.AUTH_USER_MODEL)),
                ('project_admins', models.ManyToManyField(blank=True, help_text='User that has admin rights to project.', related_name='project_admins', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('-created_at',),
                'permissions': (('open_project', 'Open Project'), ('close_project', 'Close Project'), ('archive_project', 'Archive Project')),
            },
        ),
        migrations.CreateModel(
            name='Job',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('assignee_id', models.PositiveIntegerField(null=True)),
                ('active', models.BooleanField(default=True, help_text="Check to make project 'Active' and visible to all users. Uncheck this to 'Archive' the project")),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('properties', jsonfield.fields.JSONField(blank=True, help_text='JSON key/value pairs associated with this object, e.g. {"usng":"18 S TJ 87308 14549", "favorite":"true"}', null=True)),
                ('progress', models.SmallIntegerField(blank=True, null=True)),
                ('grid', models.CharField(choices=[('usng', 'usng'), ('mgrs', 'mgrs')], default='usng', help_text='Select usng for Jobs inside the US, otherwise use mgrs', max_length=5)),
                ('tags', models.CharField(blank=True, help_text='Useful tags to search social media with', max_length=50, null=True)),
                ('editor', models.CharField(choices=[('geoq', 'geoq'), ('osm', 'osm')], default=('geoq', 'geoq'), help_text='Editor to be used for creating features', max_length=20)),
                ('analysts', models.ManyToManyField(blank=True, related_name='analysts', to=settings.AUTH_USER_MODEL)),
                ('assignee_type', models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, to='contenttypes.ContentType')),
                ('editable_layer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='maps.EditableMapLayer')),
                ('feature_types', models.ManyToManyField(blank=True, to='maps.FeatureType')),
                ('map', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='maps.Map')),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='project', to='core.Project')),
                ('required_courses', models.ManyToManyField(blank=True, help_text='Courses that must be passed to open these cells', to='training.Training')),
                ('reviewers', models.ManyToManyField(blank=True, related_name='reviewers', to=settings.AUTH_USER_MODEL)),
                ('teams', models.ManyToManyField(blank=True, related_name='teams', to='auth.Group')),
                ('workflow', models.ForeignKey(blank=True, help_text='Workflow to be used for job', null=True, on_delete=django.db.models.deletion.PROTECT, to='workflow.Workflow')),
            ],
            options={
                'ordering': ('-created_at',),
                'permissions': (),
            },
        ),
        migrations.CreateModel(
            name='Comment',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.CharField(max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('aoi', models.ForeignKey(help_text='Associated AOI for comment', on_delete=django.db.models.deletion.PROTECT, to='core.AOI')),
                ('user', models.ForeignKey(blank=True, help_text='User who made comment', null=True, on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='AOITimer',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(default='Unassigned', max_length=20)),
                ('started_at', models.DateTimeField()),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('aoi', models.ForeignKey(help_text='Workcell that was changed', on_delete=django.db.models.deletion.PROTECT, to='core.AOI')),
                ('user', models.ForeignKey(help_text='User who worked on workcell', on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ('user', 'aoi'),
                'permissions': (),
            },
        ),
        migrations.AddField(
            model_name='aoi',
            name='job',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='aois', to='core.Job'),
        ),
        migrations.AddField(
            model_name='aoi',
            name='reviewers',
            field=models.ManyToManyField(blank=True, help_text='Users that actually reviewed this work.', related_name='aoi_reviewers', to=settings.AUTH_USER_MODEL),
        ),
    ]
