from cdw.forms import QuestionForm, PostForm
from cdw.services import cdw
from cdwapi import (jsonify, not_found_on_error, auth_token_required, 
                    auth_token_or_logged_in_required)                          
from flask import request

def load_views(blueprint):
    
    @blueprint.route('/questions', methods=['GET'])
    def questions_index_get():
        return jsonify(cdw.questions.all())
    
    @blueprint.route('/questions', methods=['POST'])
    @auth_token_required
    def questions_index_post():
        form = QuestionForm(request.form, csrf_enabled=False)
        if form.validate():
            return jsonify(cdw.questions.save(form.to_question()))
        else:
            return jsonify({"errors":form.errors}, 400)
        
    @blueprint.route('/questions/<id>', methods=['GET'])
    @not_found_on_error
    def questions_show(id):
        return jsonify(cdw.questions.with_id(id))
    
    @blueprint.route('/questions/<id>/threads', methods=['GET'])
    @not_found_on_error
    def questions_threads_get(id):
        return jsonify(cdw.threads.with_fields(**{'question':cdw.questions.with_id(id)}))
    
    @blueprint.route('/questions/<id>/threads', methods=['POST'])
    @not_found_on_error
    @auth_token_or_logged_in_required
    def questions_threads_post(id):
        question = cdw.questions.with_id(id)
        form = PostForm(request.form, csrf_enabled=False)
        if form.validate():
            return jsonify(cdw.create_thread(question, form.to_post()))
        else:
            return jsonify({"error":form.errors}, 400)
    
    @blueprint.route('/questions/current', methods=['GET'])
    @not_found_on_error
    def questions_current():
        return jsonify(cdw.questions.with_active(True))
    
    @blueprint.route('/questions/categories', methods=['GET'])
    def questions_categories():
        return jsonify(cdw.categories.all())
    