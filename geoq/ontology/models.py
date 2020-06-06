from django.db import models
from django.urls import reverse_lazy


class Vocabulary(models.Model):
    """
    Model for ontology vocabulary.
    """
    name = models.CharField(max_length=200, help_text="Name of Vocabulary")

    def __unicode__(self):
        return self.name

class Term(models.Model):
    """
    Ontological Term
    """
    label = models.CharField(max_length=100, help_text="Value of term")
    identifier = models.UrlField(max_length=200, help_text="Term Identifier")

    def __unicode__(self):
        return self.word


class Ontology(models.Model):
    """
    Representation of an Ontology
    """

    name = models.CharField(max_length=200, help_text="Ontology Name")
    url = models.UrlField(max_length=200, help_text="Location of ontology")
