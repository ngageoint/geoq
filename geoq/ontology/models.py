from django.db import models
from django.urls import reverse_lazy
from django.contrib.gis import admin
import json


class Term(models.Model):
    """
    Ontological Term
    """
    TERM_TYPES = [("Object", "Object"), ("Property", "Property"), ("Relationship","Relationship")]
    word = models.CharField(max_length=100, help_text="Value of term")
    identifier = models.CharField(max_length=200, help_text="IRI Identifier")
    type = models.CharField(max_length=30, choices=TERM_TYPES, default=TERM_TYPES[0])

    def __unicode__(self):
        return self.word

    def __str__(self):
        return self.__unicode__()

    @property
    def serialize(self):
        return {"name": self.word, "identifier": self.identifier, "type": self.type}

class Vocabulary(models.Model):
    """
    Model for ontology vocabulary.
    """
    name = models.CharField(max_length=200, help_text="Name of Vocabulary")
    terms = models.ManyToManyField(Term, related_name="entries")

    def __unicode__(self):
        return self.name

    def __str__(self):
        return self.name

    @property
    def toJson(self):
        return json.dumps([t.serialize for t in self.terms.all()])


class Ontology(models.Model):
    """
    Representation of an Ontology
    """

    name = models.CharField(max_length=200, help_text="Ontology Name")
    url = models.CharField(max_length=200, help_text="Location of ontology")

    def __unicode__(self):
        return self.name
    def __str__(self):
        return self.name
