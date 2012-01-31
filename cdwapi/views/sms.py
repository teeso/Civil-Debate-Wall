"""
    :copyright: (c) 2011 Local Projects, all rights reserved
    :license: See LICENSE for more details.
"""
import datetime, urllib
from cdw.forms import normalize_phonenumber
from cdw.services import cdw, EntityNotFoundException
from cdwapi import cdwapi, jsonify
from flask import request, current_app, abort

def load_views(app):
    @app.route("/sms/kiosk/<id>", methods=['GET'])
    def kiosk_handler_get(id):
        kiosk_number = current_app.config['CDW']['kiosks']['kiosk_%s' % id]
        recentMessages = cdwapi.get_recent_sms_messages(kiosk_number)
        return jsonify({
            "serverTime": str(datetime.datetime.now()),
            "number": kiosk_number,
            "recentMessages": recentMessages,
        })
    
    @app.route("/sms/kiosk/<id>", methods=['POST'])
    def kiosk_handler_post(id):
        try:
            # TODO: Add Twilio Validator
            kiosk_number = current_app.config['CDW']['kiosks']['kiosk_%s' % id]
            data = request.form.to_dict()
            phone = normalize_phonenumber(urllib.unquote(data['From']))
            message = urllib.unquote_plus(data['Body']).strip()
            msg = cdwapi.save_incoming_sms(kiosk_number, phone, message)
            return jsonify(msg)
        except Exception, e:
            current_app.logger.error("Error receiving message from "
                                     "Twilio: %s" % e)
            raise e
        
    @app.route("/sms/switchboard", methods=['POST'])
    def switchboard():
        data = request.form.to_dict()
        current_app.logger.debug('Incoming message from Twilio: %s' % data)
        sender = normalize_phonenumber(urllib.unquote(data['From']))
        message = urllib.unquote_plus(data['Body']).strip().lower()
        
        try:
            user = cdw.users.with_phoneNumber(sender)
        except EntityNotFoundException:
            current_app.logger.error('SMS message from unregistered '
                                     'phone number: %s' % sender)
            abort(400)
        except Exception, e:
            current_app.logger.error('Unexpected SMS Switchboard POST: %s' % e)
            abort(400)
        
        if message in ['stop','unsubscribe']:
            current_app.logger.debug('Stopping SMS updates for User(%s)' % str(user.id))
            cdwapi.stop_sms_updates(user)
        elif message in ['start','resume', 'subscribe']:
            current_app.logger.debug('Starting SMS updates for User(%s)' % str(user.id))
            cdwapi.resume_sms_updates(user)
        elif message in ['undo','stay']:
            current_app.logger.debug('Revert SMS updates for User(%s)' % str(user.id))
            cdwapi.revert_sms_updates(user)
        else:
            current_app.logger.debug('Post via SMS')
            cdwapi.post_via_sms(user, message)
        
        return jsonify({ "success": True })