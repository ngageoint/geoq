from django.contrib  import admin
from .models import *
from datetime import datetime
#TODO: are we going to use Role model?


class ChildDocInline(admin.StackedInline):
    model = ChildDocument
    verbose_name = "Child Document"


class KMZAdmin(admin.ModelAdmin):
    inlines = [ChildDocInline]
    actions = ['refresh']
    def refresh(self, request, queryset):
        for kmz in queryset:
            kmz.refresh()
    refresh.short_description = "Force refresh of selected files"



admin.site.register(SourceDocument,KMZAdmin)
