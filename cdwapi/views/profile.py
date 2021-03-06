"""
    :copyright: (c) 2011 Local Projects, all rights reserved
    :license: Affero GNU GPL v3, see LEGAL/LICENSE for more details.

Notes:
    * We use jsonify from flask in this specific class, otherwise cdw.jsonify

"""
from cdw import jsonp, login_cookie, make_login_cookie
from cdw.CONSTANTS import STATUS_OK, STATUS_FAIL
from cdw.forms import (UserRegistrationForm, EditProfileForm, VerifyPhoneForm, 
    OptionalVerifyPhoneForm)
from cdw.services import cdw, connection_service
from cdwapi import auth_token_or_logged_in_required
from cdwapi.helpers import paginate, as_multidict, get_facebook_profile
from flask import current_app, request, session, abort, jsonify
from flask.ext.login import current_user, login_user
from social import ConnectionNotFoundError


def load_views(blueprint):
    @blueprint.route("/profile", methods=['GET'])
    @auth_token_or_logged_in_required
    @jsonp
    @login_cookie
    def profile():
        # oddly needed for lookup
        user = cdw.users.with_id(current_user.get_id())
        
        # Pagination
        page, amt = paginate(0, 5, ['page', 'amt'])        
        skip, limit = paginate(fields=['skip','limit'])
        
        threads = cdw.get_threads_started_by_user(current_user)[int(page):int(amt)]
        all_posts = cdw.posts.with_fields(author=user).order_by('-created')[skip:limit]
        # Most Favorited/Liked
        # TBD
        mostLiked = cdw.posts.with_fields(author=user).order_by('-likes')
        if mostLiked.count():
            mostLiked = mostLiked[0].as_dict(full_path=True)
        else:
            mostLiked = None
        # Most Debated
        # TBD
        mostDebated = cdw.get_threads_started_by_user(current_user).order_by('-postCount')
        if mostDebated.count():
            mostDebated = mostDebated[0].as_dict(full_path=True)
        else:
            mostDebated = None
        debates = []
        
        for p in all_posts:
            try:
                debates.append(cdw.threads.with_firstPost(p))
            except:
                pass
        
        # Jsonify each of the QuerySets:
        threads = [x.as_dict(full_path=True) for x in threads]
        debates = [x.as_dict(full_path=True) for x in debates]
        all_posts = [x.as_dict(full_path=True) for x in all_posts]
        
        return jsonify(threads=threads, posts=all_posts, debates=debates, 
                       mostLiked=mostLiked, mostDebated=mostDebated)


    @blueprint.route("/profile/show", methods=['GET'])
    @auth_token_or_logged_in_required
    @jsonp
    @login_cookie
    def profile_show():
        user = current_user
        if request.method == 'GET':
            return jsonify({'status': STATUS_OK, 'result': user.profile_dict()})

    @blueprint.route("/profile/edit", methods=['POST'])
    @auth_token_or_logged_in_required
    @jsonp
    def profile_edit():
        user = current_user
        # This is an API call so no CSRF (since no form)
        userForm = EditProfileForm(as_multidict(request.json), csrf_enabled=False)
        if request.json:
            userForm.email.data = request.json.get('email') or user.email
            userForm.username.data = request.json.get('username') or user.username
        if not userForm.validate():
            return jsonify({'status': STATUS_FAIL, 'error': userForm.errors})
        
        phoneForm = OptionalVerifyPhoneForm(csrf_enabled=False)        
        phoneForm.phonenumber.data = request.json.get('phoneNumber')
        if not phoneForm.validate():
            return jsonify({'status': STATUS_FAIL, 'error': phoneForm.errors})

        user = cdw.update_user_profile(user.get_id(),
                                       userForm.username.data,
                                       userForm.email.data,
                                       userForm.password.data,
                                       phoneForm.phonenumber.data
                                       )
        
        return jsonify({'status': STATUS_OK, 'message': "Updated user profile"})

        
    @blueprint.route("/profile/photo", methods=['POST'])
    @auth_token_or_logged_in_required
    @jsonp
    @login_cookie
    def profile_photo():
        try:
            current_app.user_profile_image_store.saveProfileImage(
                current_user, request.files.get('photo'))
            
            return jsonify(current_user.as_dict(full_path=True))
        except Exception, e:
            current_app.logger.error("Error saving profile image: %s" % e)
            abort(400)

    #--------------------------------------------
    # Registration via API
    #--------------------------------------------
    
    @blueprint.route("/register", methods=['POST'])
    def register_user():
        if current_user.is_authenticated():
            return jsonify({'status': 201, "message": "Already authenticated" })

        user = None
        if session.get('facebookemail'):
            # Don't make the mistake of looking for a blank email address!
            user = cdw.users.with_fields(email=session.get('facebookemail')).first()            
            
        if user:
            # Check if there's already a SaasConnection record for this id
            try:
                fbuser = connection_service.get_connection_by_provider_user_id(
                                    provider_id='facebook',
                                    provider_user_id=session.get('facebookuserid'))
                    
            except ConnectionNotFoundError, e:
                # Connect the user to their social account
                _social_connect(user)

        else:
            if request.json:
                # No need to validate phone-number without incoming data!
                phoneForm = OptionalVerifyPhoneForm(csrf_enabled=False)
                phoneForm.phonenumber.data = request.json.get('phoneNumber')
                if not phoneForm.validate():
                    return jsonify({'status': STATUS_FAIL, 'error': phoneForm.errors})
    
            form = UserRegistrationForm(as_multidict(request.json), csrf_enabled=False)
            
            if form.validate():
                # Register the user
                try:
                    user = cdw.register_website_user(
                        form.username.data, 
                        form.email.data, 
                        form.password.data, 
                        phoneForm.phonenumber.data
                    )
                except Exception, e:
                    return jsonify({'status': STATUS_FAIL, 'errors': str(e)})
    
                _social_connect(user)
    
            else:
                return jsonify({'status': STATUS_FAIL, 'errors': form.errors})

        #--- User is successfully registered at this point ---
        login_user(user)

        cookie = make_login_cookie(user)
        response = jsonify(message="OK")
        response.set_cookie("login", ",".join(cookie) )

        return response

    @blueprint.route('/forgot', methods=['POST'])
    def forgot():
        email = None
        if request.json: email = request.json.get('username', request.json.get('email'))
        elif request.form: email = request.form.get('username', request.form.get('email'))
        
        if email:
            try:
                user = cdw.users.with_email(email)
            except Exception, e:
                return jsonify({"success": False})
            
            from cdw import emailers
            emailers.send_forgot_password(user.email, user.password)
            return jsonify({"success": True})

    #--------------------------------------------
    # Private Helpers
    #--------------------------------------------
    def _social_connect(user=None):
        if not session.get("facebooktoken"):
            return
        
        # Try connecting their facebook account if a token
        # is in the session
        try:
            handler = current_app.social.facebook.connect_handler
            
            conn = handler.get_connection_values({
                "access_token": session.get('facebooktoken')
            })
            
            conn['user_id'] = str(user.id)
            current_app.logger.debug('Saving connection: %s' % conn)
            connection_service.save_connection(**conn)
            
        except KeyError, e:
            current_app.logger.error(
                "Unable to create facebook connection for %s: %s", (user.id, e))
            
        except Exception, e:
            current_app.logger.error(
                "Unable to create facebook connection for %s: %s", (user.id, e))


