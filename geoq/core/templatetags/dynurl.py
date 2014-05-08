# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

from django.template import Library,Node,Variable
from django.core.urlresolvers import reverse

register = Library()

class DynamicUrlNode(Node):
    def __init__(self, *args):
        self.name_var = Variable(args[0])
        try:
            self.args = [Variable(a) for a in args[1].split(',')]
        except IndexError:
            self.args = []

    def render(self,context):
        name = self.name_var.resolve(context)
        args = [a.resolve(context) for a in self.args]
        return reverse(name, args = args)

@register.tag
def DynamicUrl(parser,token):
    args = token.split_contents()
    return DynamicUrlNode(*args[1:])