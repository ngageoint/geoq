#!/usr/bin/env python
# -*- coding: utf-8 -*-
import os
import sys

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "geoq.settings")

    manage_dir = os.path.dirname(os.path.realpath(__file__))
    sys.path.append(os.path.join(manage_dir, 'geoq'))

    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)
