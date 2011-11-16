import datetime
import time
from math import ceil
from cdw.services import cdw, settings
from cdw import admin_required
from flask import Blueprint, render_template, request, session, redirect, flash
from cdw.forms import QuestionForm

blueprint = Blueprint('admin', __name__)

@blueprint.route("/")
@admin_required
def dashboard():
    return render_template('admin/dashboard.html')


def do_show_question(question):
    page = int(request.args.get('page', 1))
    amt = int(request.args.get('amt', 50))
    sort = request.args.get('sort', 'recent')
    
    sort_lookup = {
        'recent': '-created',
        'flags': '-flags',
    }
    
    order_rule = sort_lookup[sort]
    start = max(0, (page-1) * amt)
    end = start + amt
    
    total_pages = int(ceil(float(cdw.threads.with_fields(question=question).count()) / float(amt)))
    threads = cdw.threads.with_fields(question=question).order_by(order_rule)[start:end]
    
    return render_template('admin/debates/current.html',
                           question=question,
                           threads=threads,
                           current_page=page,
                           total_pages=total_pages,
                           section_selector='debates', 
                           page_selector='current')

@blueprint.route("/debates")
@blueprint.route("/debates/current")
@admin_required
def debates_current():
    return do_show_question(cdw.questions.with_active(True))

@blueprint.route("/debates/<question_id>", methods=['GET'])
@admin_required
def debates_show(question_id):
    return do_show_question(cdw.questions.with_id(question_id))
    
@blueprint.route("/debates/questions")
@admin_required    
def debates_upcoming():
    questions = cdw.questions.with_fields(archived__ne=True)
    form = QuestionForm(csrf_enabled=False)
    #form.category.choices = [(str(c.id), c.name) for c in cdw.categories.all()]
    return render_template('admin/debates/questions.html',
                           categories=cdw.categories.all(), 
                           questions=questions,
                           form=form,
                           section_selector='debates', 
                           page_selector='questions')
    


@blueprint.route("/debates/questions/<question_id>")
@admin_required
def show_question(question_id):
    question = cdw.questions.with_id(question_id)
    form = QuestionForm(csrf_enabled=False)
    form.author.data = str(question.author.id)
    form.category.data = str(question.category.id)
    form.text.data = question.text
    return render_template("/admin/debates/show_question.html", 
                           question=question,
                           form=form,
                           section_selector="debates",
                           page_selector="questions-show")

@blueprint.route("/debates/threads/<debate_id>", methods=['GET'])
@admin_required
def show_threads(debate_id):
    
    debate = cdw.threads.with_id(debate_id)
    replies = cdw.posts.with_fields(thread=debate)[1:]
    return render_template('admin/debates/show_thread.html',
                           debate=debate,
                           replies=replies,
                           section_selector='debates', 
                           page_selector='threads-show')
    
@blueprint.route("/debates/questions/<question_id>/activate", methods=['POST'])
@admin_required
def activate_debate(question_id):
    currently_active = cdw.questions.with_fields(active=True).first()
    currently_active.active = False
    currently_active.save()
    
    question = cdw.questions.with_id(question_id)
    question.active = True
    question.save()
    return redirect("/admin/debates/upcoming")

@blueprint.route("/debates/questions/<question_id>/archive", methods=['POST'])
@admin_required
def archive_debate(question_id):
    question = cdw.questions.with_id(question_id)
    question.archived = True
    question.archiveDate = datetime.datetime.utcnow()
    question.save()
    return redirect("/admin/debates/upcoming")
    
@blueprint.route("/debates/badwords", methods=['GET','POST'])
@admin_required    
def debates_badwords():
    if request.method == 'POST':
        new_words = request.form.get('badwords', settings.get_bad_words())
        settings.set_bad_words(new_words)
        
    return render_template('admin/debates/badwords.html',
                           badwords=settings.get_bad_words(), 
                           section_selector='debates', 
                           page_selector='badwords')
    
@blueprint.route("/users", methods=['GET','POST'])    
@admin_required
def users():
    email_phone = request.form.get('email', None)
    
    if email_phone:
        user = None
        try:
            user = cdw.users.with_email(email_phone)
            return redirect("/admin/users/%s" % str(user.id))
        except:
            pass
        
        try:
            user = cdw.users.with_phoneNumber(email_phone)
            return redirect("/admin/users/%s" % str(user.id))
        except:
            print 'nope!'
            flash("Could not find user with email or phone: %s" % email_phone, 'error')
            
    
    page = int(request.args.get('page', 1))
    amt = int(request.args.get('amt', 50))
    
    start = max(0, (page-1) * amt)
    end = start + amt
    
    total_pages = int(ceil(float(cdw.users.all().count()) / float(amt)))
    users = cdw.users.all()[start:end]
    
    return render_template('admin/users/list.html',
                           users=users,
                           current_page=page,
                           total_pages=total_pages, 
                           section_selector='users', 
                           page_selector='index')

@blueprint.route("/users/<user_id>")    
@admin_required
def users_show(user_id):
    user = cdw.users.with_id(user_id)
    flagCount = 0;
    
    for post in cdw.posts.with_fields(author=user):
        flagCount += post.flags
        
    return render_template('admin/users/show.html',
                           user=user,
                           flagCount=flagCount,
                           section_selector="users",
                           page_selector="show")
    
@blueprint.route("/users/<user_id>/toggleadmin", methods=["POST"])
@admin_required    
def users_toggleadmin(user_id):
    user = cdw.users.with_id(user_id)
    user.isAdmin = not user.isAdmin
    user.save()
    return redirect("/admin/users/%s" % str(user.id))

@blueprint.route("/users/<user_id>/toggleactive", methods=["POST"])
@admin_required    
def users_toggleactive(user_id):
    user = cdw.users.with_id(user_id)
    user.active = not user.active
    user.save()
    return redirect("/admin/users/%s" % str(user.id))

@blueprint.route("/archives")
@admin_required
def archives():
    archived_questions = cdw.questions.with_fields(archived=True)
    
    page = int(request.args.get('page', 1))
    amt = int(request.args.get('amt', 50))
    
    start = max(0, (page-1) * amt)
    end = start + amt
    
    total_pages = int(ceil(float(len(archived_questions)) / float(amt)))
    archived_questions = archived_questions[start:end]
    
    archive_data = []
    
    for question in archived_questions:
        yesCount = 0
        noCount = 0
        users = []
        
        threads = cdw.threads.with_fields(question=question)
        
        for thread in threads:
            posts = cdw.posts.with_fields(thread=thread)
            
            for post in posts:
                if post.yesNo == 0:
                    noCount += 1
                else:
                    yesCount += 1
                    
                if str(post.author.id) not in users:
                    users.append(str(post.author.id))
                    
        archive_data.append(dict(
            question=question,
            yesCount=yesCount,
            noCount=noCount,
            userCount=len(users),
            endDate=question.archiveDate 
        ))
        
    return render_template('admin/archives/index.html', 
                           archive_data=archive_data,
                           total_pages=total_pages,
                           current_page=page,
                           section_selector='archives', 
                           page_selector='index')
                    
                    
                

def init(app):
    app.register_blueprint(blueprint, url_prefix="/admin")
    