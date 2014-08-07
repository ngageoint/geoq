from django.forms import ModelForm
from django.views.generic.list import ListView
from django.views.generic.base import TemplateView, View
from django.views.generic.edit import CreateView
from django.shortcuts import get_object_or_404
from django.http import HttpResponse

from .models import SourceDocument, ChildDocument

class ProxyListView(ListView):
    template_name = "proxy/listview.html"
    model = SourceDocument


class ProxyRegisterForm(ModelForm):
    class Meta:
        model = SourceDocument
        fields = ('Name','Refresh','Expires','Type','SourceURL')
    

class ProxyRegisterView(CreateView):
    model = SourceDocument
    template_name = "proxy/createview.html"
    form_class = ProxyRegisterForm #apparently being able to specify fields here is after our Django 1.5
    def form_valid(self, form):
        self.object = form.save()
        self.object.refresh(force=True)
        return super(ProxyRegisterView, self).form_valid(form)


class ProxyGetView(View):
    def get(self, request, *args, **kwargs):
        obj = get_object_or_404(SourceDocument,slug=args[0])
        return HttpResponse(content=obj.get_document(),content_type="text/xml")


class ProxyAuxGetView(View):
    def get(self, request, *args, **kwargs):
        parentobj = get_object_or_404(SourceDocument,slug=args[0])
        obj = get_object_or_404(ChildDocument,slug=args[1],Parent=parentobj)
        print "Todo: need to somehow handle imgs etc. content"
        return HttpResponse(content=obj.get_document())

