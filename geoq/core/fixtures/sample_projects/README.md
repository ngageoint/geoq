Sample Data Projects
====

The data in this direction as sample projects.

### Moore, OK Tornado Project
The 2013 Moore tornado was an EF5 tornado that struck Moore, Oklahoma, and adjacent areas on the afternoon of May 20, 2013.

This project is a sample project that has one job that pulls in imagery from The Civil Air Patrol and allows users to evaluate that imagary for damage.

There are four sample users: 1 admin and 3 regular staff users. All the users have various permissions settings. Every user in sample project has the password 'password'. As a result, this is intended for a non-production sample project only.

To load the project, you must start with an empty database to ensure you do not have conflicting primary keys. Then run the following:
```
python manage.py loaddata sample_projects/moore_ok_tornados.json
```
