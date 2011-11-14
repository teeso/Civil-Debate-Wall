from flask import Flask
from flaskext.wtf import Form

app = Flask(__name__)
app.config.from_object('cdw.config')

try: app.config.from_object('instance.config')
except: pass

# Application specific stuff
from . import assets
assets.init(app)

from . import database
database.init(app)

from . import filestores
filestores.init(app)

from . import logging
logging.init(app)

from . import middleware
middleware.init(app)

from . import services
services.init(app)

from . import signals
signals.init(app)

from . import views
views.init(app)

from . import views_admin
views_admin.init(app)

from . import views_crud
views_crud.init(app)

# Other stuff
import auth
auth.Auth(app)

import social
social.Social(app)

import cdwapi
cdwapi.CDWApi(app)

app.logger.debug(app.url_map)

@app.context_processor
def inject_common_values():
    form = Form() 
    return {
        'facebook_app_id': app.config['SOCIAL_PROVIDERS']['facebook']['oauth']['consumer_key'],
        'media_root': app.config['MEDIA_ROOT'], 
        'csrf_token': form.csrf.data, 
    }