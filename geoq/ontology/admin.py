from reversion.admin import VersionAdmin
from django.contrib.gis import admin
from .models import Term, Vocabulary


class Entry_inline(admin.TabularInline):
    model = Vocabulary.terms.through
    extra = 2

@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    model = Term
    list_display = ['__unicode__', 'word', 'identifier', 'type']
    fields = ['word','identifier','type']
    inlines = (Entry_inline,)


@admin.register(Vocabulary)
class VocabularyAdmin(admin.ModelAdmin):
    model = Vocabulary
    list_display = ['name']
    fields = ['name']
    inlines = (Entry_inline,)
