# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

# based somewhat on https://djangosnippets.org/snippets/261

from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from .models import Feedback, Topic
from django.template import RequestContext, Context
from django.core.urlresolvers import reverse
from .forms import FeedbackForm
from django.views.generic import ListView

def feedbackcreate(request):

    form = FeedbackForm(request.POST or None)
    topics = Topic.objects.all()

    if request.method == 'POST':
        if form.is_valid():
            form.save(commit=True)
            return HttpResponseRedirect(reverse('thanks'))
        else:
            return render(request, 'feedback.html', {'form': form, 'topics': topics })

    return render(request, 'feedback.html', {'form': FeedbackForm(), 'topics': topics})

def thankyou(request):
		return render(request, 'thankyou.html')


class FeedbackListView(ListView):
    model = Feedback

    def get_context_data(self, **kwargs):
        context = super(FeedbackListView, self).get_context_data(**kwargs)
        return context