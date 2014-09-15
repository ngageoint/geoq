# -*- coding: utf-8 -*-
# This technical data was produced for the U. S. Government under Contract No. W15P7T-13-C-F600, and
# is subject to the Rights in Technical Data-Noncommercial Items clause at DFARS 252.227-7013 (FEB 2012)

import requests

from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User, Group
from django.shortcuts import get_object_or_404, redirect, render
from django.http import Http404, HttpResponse, HttpResponseRedirect, HttpResponseForbidden
from django.template.response import TemplateResponse
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from datetime import datetime
from models import Training
from django.views.generic import ListView, View
import json
import random


class TrainingListView(ListView):
    model = Training

    def get_queryset(self):
        return Training.objects.filter(private=False)


class TrainingView(ListView):
    #TODO: Add Admin option to edit course
    model = Training

    def get_context_data(self, **kwargs):
        context = super(TrainingView, self).get_context_data(**kwargs)
        context['admin'] = self.request.user.has_perm('training.add_course') #TODO: Or admin or primary_contact
        return context


class TrainingQuizView(ListView):
    model = Training
    template_name = "training/quiz.html"
    http_method_names = ['post', 'get', ]

    def get_context_data(self, **kwargs):
        context = super(TrainingQuizView, self).get_context_data(**kwargs)
        context['admin'] = self.request.user.has_perm('training.edit_course') #TODO: Or admin or primary_contact
        course = Training.objects.get(pk=self.kwargs.get('pk'))
        context['object'] = course
        context['quiz_html'] = build_quiz(course.quiz_data)
        return context

    def post(self, request, *args, **kwargs):
        answers = request.POST.get('answers')
        result = {}

        course = None
        if not answers:
            result = {"result": "No answers passed in"}
        else:
            answers_data = []
            try:
                answers_data = json.loads(answers)
                course = Training.objects.get(pk=self.kwargs.get('pk'))
            except ValueError or TypeError:
                result = {"result": "Invalid Answers JSON"}
            except ObjectDoesNotExist:
                result = {"result": "Course doesn't seem to exist"}

            # Check answers versus course.info
            if course:
                try:
                    quiz_data = course.quiz_data

                    if not quiz_data:
                        result = {"result": "No quiz information, user passed"}
                        course.users_completed.add(request.user)
                        course.save()
                    else:
                        # If pass, render result
                        result = check_if_quiz_passed(quiz_data, answers_data)

                        if result['passed']:
                            # Update course, add user to users_completed
                            course.users_completed.add(request.user)
                            course.save()

                except ValueError or TypeError:
                    result = {"result": "Invalid Course Quiz JSON"}

        result['quiz_id'] = self.kwargs.get('pk')

        return TemplateResponse(request, "training/quiz_response.html", {
                "quiz_result": result,
                "object": course
        })

#        return HttpResponse(json.dumps(result), mimetype="application/json", status=200)


def check_if_quiz_passed(quiz_data, answers_data):
    # loop through all answers_data, check vs quiz_data
    passing_percentage = 0.9
    questions_to_show = 10
    result = {}

    if 'passing_percentage' in quiz_data:
        passing_percentage = quiz_data['passing_percentage']
    if 'questions_to_show' in quiz_data:
        questions_to_show = quiz_data['questions_to_show']

    questions = []
    if 'questions' in quiz_data:
        questions = quiz_data['questions']

    question_count = len(questions)
    if question_count < questions_to_show:
        questions_to_show = question_count

    questions_passed = []
    questions_failed = []
    for answer in answers_data:
        answer_question = answer['question']
        answer_answer = answer['answer']
        found = False

        for question in questions:
            question_question = question['question']
            question_answer = question['answer']
            if answer_question == question_question and answer_answer == question_answer:
                found = True
                break

        if found:
            questions_passed.append(answer_question)
        else:
            questions_failed.append(answer_question)

    questions_passed_percent = len(questions_passed) / float(questions_to_show)

    result['passed'] = questions_passed_percent > passing_percentage
    result['questions_passed_percent'] = questions_passed_percent
    result['questions_passed'] = questions_passed
    result['questions_passed_len'] = len(questions_passed)
    result['questions_to_show'] = questions_to_show
    result['questions_failed'] = questions_failed

    if result['passed']:
        result['text'] = "User passed quiz, achievements unlocked"
    else:
        result['text'] = "User did not pass quiz, not enough correct answers"

    return result


def build_quiz(quiz_data):
    text = "<b>No Quiz Data Found</b>"
    if quiz_data:
        passing_percentage = 0.9
        questions_to_show = 10

        if 'passing_percentage' in quiz_data:
            passing_percentage = quiz_data['passing_percentage']
        if 'questions_to_show' in quiz_data:
            questions_to_show = quiz_data['questions_to_show']

        questions = []
        if 'questions' in quiz_data:
            questions = quiz_data['questions']

        question_count = len(questions)
        if question_count < questions_to_show:
            questions_to_show = question_count

        text = "<b>Percentage required to pass: " + str(int(passing_percentage * 100)) + "%</b><br/><ul>"

        questions = random.sample(questions, questions_to_show)
        for question in questions:
            answer = ""
            question_text = ""
            alternates = []
            if 'answer' in question:
                answer = question['answer']
            if 'question' in question:
                question_text = question['question']
            if 'alternates' in question:
                alternates = question['alternates']

            alt_length = 3
            if len(alternates) < alt_length:
                alt_length = len(alternates)
            alternative_list = random.sample(alternates, alt_length)
            alternative_list.append(answer)
            alternative_list = random.sample(alternative_list, alt_length+1)
            if not alternative_list:
                alternative_list = ['True', 'False']

            text += "<li class='question'>"+str(question_text)+"<br/>"
            for alternative in alternative_list:
                text += "<div class='answer'><input type='radio' name='"+str(question_text)+"' value='"+str(alternative)+"'/> "+str(alternative)+"</div>"
            text += "</li>"
        text += "</ul>"

    return text