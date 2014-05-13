# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

class OutofGZDError(Exception):
    # Exception raised when the requested grid crosses over a GZD boundary. Will handle this at some point
    def __init__(self,value):
        self.value = value
    def __str__(self):
        return repr(self.value)


class GridTooLargeError(Exception):
    # Exception raised when the requested grid is too big.
    def __init__(self,value):
        self.value = value
    def __str__(self):
        return repr(self.value)


class ProgramException(Exception):
    # Exception raised when an internal error occurs
    def __init__(self,value):
        self.value = value
    def __str__(self):
        return repr(self.value)