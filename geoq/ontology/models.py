from django.db import models
from django.urls import reverse_lazy



class Term(models.Model):
    """
    Ontological Term
    """
    word = models.CharField(max_length=100, help_text="Value of term")
    identifier = models.URLField(max_length=200, help_text="Term Identifier")

    def __unicode__(self):
        return self.word

class Vocabulary(models.Model):
    """
    Model for ontology vocabulary.
    """
    name = models.CharField(max_length=200, help_text="Name of Vocabulary")
    terms = models.ManyToManyField(Term)

    def __unicode__(self):
        return self.name

class Ontology(models.Model):
    """
    Representation of an Ontology
    """

    name = models.CharField(max_length=200, help_text="Ontology Name")
    url = models.URLField(max_length=200, help_text="Location of ontology")

    def __unicode__(self):
        return self.name
