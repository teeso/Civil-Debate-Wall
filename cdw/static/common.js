
if(!window.tools){window.tools={};}
tools.notImplemented=function(){alert('Not yet implemented');}
tools.bodyClass=tools.bodyClasses=function(klasses,fn){if(klasses.indexOf(' ')>=0){klasses=klasses.split(/\s+/);}
$(function(){var $body=$('body');if(klasses.join){if($body.is('.'+klasses.join(',.'))){fn();}}else{if($body.hasClass(klasses)){fn();}}});};if(!window.resizeable){window.resizeable=[];}
tools.manualResize=function(){};tools.resizeElements=function(e){tools.manualResize();for(var i=0;i<window.resizeable.length;i++){try{window.resizeable[i].onResize();}catch(e){}}};$(window).resize(function(e){tools.resizeElements();});tools.resizeElements();userPhotoPostError=function(){};userPhotoPostComplete=function(){window.PopupHolder.closePopup();window.location.reload(true);};userPhotoNoWebCam=function(){window.PopupHolder.closePopup();alert("Sorry but it looks as if you don't have a webcam.");};window.PhotoBoothView=Backbone.View.extend({tagName:'div',className:'popup photo-booth',template:_.template($('#photo-booth-template').html()),render:function(){$(this.el).html(this.template());return this;}});window.VerifyPhoneView=Backbone.View.extend({el:$('div.verify-view'),events:{'submit form.phone':'onPhoneSubmit','submit form.code':'onCodeSubmit','click a.cancel-verify':'onCancelClick'},initialize:function(){this.$phoneView=this.$('div.verify-phone');this.$phoneForm=this.$('form.phone');this.$codeView=this.$('div.verify-code');this.$codeForm=this.$('form.code');this.phoneNumber=this.$('input[name=phonenumber]').val();this.setPhoneNumber(this.phoneNumber);$('.phone3, .phone4').bind('keyup keydown blur',function(e){$('form input[name=phonenumber]').val($('input[name=areacode]').val()+
$('input[name=firstthree]').val()+
$('input[name=lastfour]').val());});this.showPhoneView();this.$('.verify-msg').hide();},setPhoneNumber:function(phoneNumber){if(phoneNumber===undefined){return;}
$('input[name=areacode]').val(phoneNumber.substr(0,3));$('input[name=firstthree]').val(phoneNumber.substr(3,3));$('input[name=lastfour]').val(phoneNumber.substr(6,4));},onPhoneSubmit:function(e){e.preventDefault();$.ajax({url:this.$phoneForm.attr('action'),data:this.$phoneForm.serialize(),type:'POST',success:$.proxy(function(data){if(data.success){this.showVerifyView();}else{$('div.disable-ui').hide();this.showMessage(data.error);}},this)});},onCodeSubmit:function(e){e.preventDefault();$.ajax({url:this.$codeForm.attr('action'),data:this.$codeForm.serialize(),type:'POST',complete:$.proxy(function(data){$('input[name=code]').val('');},this),error:$.proxy(function(e,xhr){this.showMessage('No match. Try again.');},this),success:$.proxy(function(data){this.showMessage('Success!');this.showPhoneView();},this)})},onCancelClick:function(e){e.preventDefault();this.showPhoneView();this.setPhoneNumber(this.phoneNumber);},showPhoneView:function(){this.$phoneView.show();this.$codeView.hide();},showVerifyView:function(){this.$phoneView.hide();this.$codeView.show();},showMessage:function(msg){this.$('.verify-msg').stop(true,true).text(msg).show().delay(3000).fadeOut();}});window.RegisterView=Backbone.View.extend({el:$('div.register-view'),events:{'keyup input.username':'updateCharsLeft','keydown input.username':'updateCharsLeft','blur input.username':'updateCharsLeft','click button.finish-btn':'onFinishClick'},initialize:function(){this.$usernameInput=$('input.username');this.updateCharsLeft();},updateCharsLeft:function(e){if(this.$usernameInput.val().length>18){this.$usernameInput.val(this.$usernameInput.val().slice(0,18));}
this.$('span.chars-left').text(18-this.$usernameInput.val().length)},onFinishClick:function(e){this.$('form.register').submit();}});$(function(){$('a.photo-booth').click(function(e){e.preventDefault();window.PopupHolder.showPopup(new PhotoBoothView,550);var flashVars={postUrl:"/profile/photo",postField:"photo",captureWidth:867,captureHeight:650,previewWidth:530,previewHeight:398,outputWidth:867,outputHeight:650,fps:24,cropX:184,cropY:0,cropWidth:550,cropHeight:650,cropOverlayColor:'0x000000',cropOverlayAlpha:0.75,postPhotoErrorFunction:"userPhotoPostError",postPhotoCompleteFunction:"userPhotoPostComplete"}
swfobject.embedSWF("/static/swf/photo-booth.swf","photo-booth-flash","550","450","10",null,flashVars);});tools.bodyClass('register-email',function(){window.VerifyPhone=new VerifyPhoneView;window.Register=new RegisterView;});tools.bodyClass('register-facebook',function(){window.VerifyPhone=new VerifyPhoneView;window.Register=new RegisterView;});});window.WhatIsThisView=Backbone.View.extend({el:$('div.whatisthis'),events:{'click li a':'onNavClick','click a.enter-btn':'onEnterClick'},initialize:function(){this.render();},render:function(){this.$('div.contents div').hide();this.$('div.contents div.screen-1').show();this.currentScreen="screen-1";this.$('a.'+this.currentScreen).css('opacity',0.7);return this;},onEnterClick:function(e){e.preventDefault();window.opener.location="/";window.close();},onNavClick:function(e){e.preventDefault();this.showScreen($(e.currentTarget).attr('class'));},showScreen:function(selector){this.$('div.contents div.'+this.currentScreen).hide();this.$('a.'+this.currentScreen).css('opacity',1);this.currentScreen=selector;this.$('div.contents div.'+this.currentScreen).show();this.$('a.'+this.currentScreen).css('opacity',0.7);}});window.PopupHolderView=Backbone.View.extend({el:$('div.popup-outer'),initialize:function(){this.$inner=this.$('div.popup-inner');this.$mask=this.$('div.popup-mask');},showPopup:function(view,width,opacity){this.closePopup();this.currentPopup=view;this.$inner.html(view.render().el);this.$inner.css({width:width||500});this.$mask.css({opacity:(opacity==undefined)?0.85:opacity})
this.el.show();this.onResize();},closePopup:function(){try{this.currentPopup.remove();}catch(e){}
this.el.hide();},onResize:function(e){var centered=Math.max(0,$(window).height()/2-this.$inner.height()/2);this.$inner.css('top',Math.max(0,Math.round(centered-100)));}});window.LoginPopupView=Backbone.View.extend({tagName:'div',className:'popup login-popup',template:_.template($('#login-popup-template').html()),events:{'submit #login_or_signup_form':'onSubmit','submit form.forgot-form':'onForgotSubmit','click a.forgot':'onForgotClick','click a.back-to-login':'hideForgot'},initialize:function(){this.isSignin=true;},render:function(){$(this.el).html(this.template(this.model));this.$('input.defaulttext').blur();this.$('input.username').blur($.proxy(function(e){this.checkIfUserExists(e);},this));this.$('div.forgot-view').hide();return this;},toggle:function(){this.$('form').toggleClass('disabled');},setValues:function(signIn,label,action,addClass,removeClass,fieldName){this.isSignin=signIn;this.$('form').attr('action',action).addClass(addClass).removeClass(removeClass);this.$('p.username input').attr('name',fieldName);this.$('#login_or_signup_form button').text(label);},setRegister:function(label){this.setValues(false,label||'Register','/register/email','register-form','signin-form','email');},setSignin:function(label){this.setValues(true,label||'Register/Sign In','/auth','signin-form','register-form','username');},showError:function(error){var $div=this.$('div.error-msg');if(error){$div.text(error);$div.show()}else{$div.hide();}},checkIfUserExists:function(e){var val=this.$('p.username input').val();if(val==''||val=='Email Address'){return false;}
this.toggle();$.ajax({url:'/api/users/search',type:'POST',data:{'email':this.$('p.username input').val()},complete:$.proxy(function(){this.toggle();},this),error:$.proxy(function(){this.setSignin();},this),success:$.proxy(function(data){if(data.length==1){this.setSignin('Sign In');}else{this.setRegister('Register');}},this)});},onSubmit:function(e){this.showError(null);if(this.isSignin){e.preventDefault();var $form=this.$('form');$.ajax({url:$form.attr('action'),type:'POST',dataType:'json',data:$form.serialize(),error:$.proxy(function(data){this.showError('Please enter a valid email address');},this),success:$.proxy(function(data){if(data.success){window.location.reload(true);}else{this.showError(data.error);}},this)})}},onForgotClick:function(e){e.preventDefault();this.showForgot();},hideForgot:function(e){e.preventDefault();this.$('div.main-view').show();this.$('div.forgot-view').hide();},showForgot:function(){this.$('div.main-view').hide();this.$('span.forgot-error').text('');this.$('form.forgot-form input.email').val('');this.$('div.forgot-view .screen-1').show();this.$('div.forgot-view .screen-2').hide();this.$('div.forgot-view').show();this.$('div.forgot-view input').blur();},onForgotSubmit:function(e){e.preventDefault();var $form=this.$('form.forgot-form');var data=$form.serialize();$.ajax({url:$form.attr('action'),type:'POST',dataType:'json',data:data,success:$.proxy(function(data){if(data.success){var e=this.$('form.forgot-form input.email').val();this.$('span.sent-to').text(e);this.$('div.forgot-view .screen-1').hide();this.$('div.forgot-view .screen-2').show();}else{this.showError(data.error);this.$('form.forgot-form input.email').val('');this.$('span.forgot-error').text('Sorry, that email is not registered with us.');this.$('span.forgot-error').delay(3000).fadeOut();}},this)})}});window.PopupHolder=new PopupHolderView
window.resizeable.push(PopupHolder);tools.openLoginPopup=function(message){window.PopupHolder.showPopup(new LoginPopupView({model:{"message":message}}));};$(function(){$('a.what-is-this-btn').click(function(e){e.preventDefault();window.open('/whatisthis','whatisthis','width=550,height=647,menubar=no,location=no');});$('div.disable-ui').hide();$('body').ajaxStart(function(){$('div.disable-ui').show();}).ajaxStop(function(){$('div.disable-ui').hide();});$('a.create-account-btn, a.signin-btn').live('click',function(e){e.preventDefault();tools.openLoginPopup();});$('.close-popup-btn').live('click',function(e){e.preventDefault();window.PopupHolder.closePopup();});$('div.popup-mask').click(function(e){e.preventDefault();window.PopupHolder.closePopup();});$('div.flashes').slideDown().delay(6000).slideUp();$("input.defaulttext").live('focus',function(e){var input=$(this);if(input.val()==input[0].title){input.addClass("active");input.val("");}});$("input.defaulttext").live('blur',function(e){var input=$(this);if(input.val()==""){input.removeClass("active");input.val(input[0].title);}});$('input.defaulttext').blur();});tools.bodyClass('questions-archive',function(){$('.category-selector').bind('change',function(e){var url='/questions/archive';var val=$(this).attr('value');if(val.length>0){url+='/'+val;}
window.location=url;})});tools.bodyClass('home-index',function(){$('img.join-debate-img').live('mouseenter',function(){this.src=this.src.replace("_out","_over");}).live('mouseleave',function(){this.src=this.src.replace("_over","_out");});$('img.stats-button').live('mouseenter',function(){this.src=this.src.replace("_out","_over");}).live('mouseleave',function(){this.src=this.src.replace("_over","_out");});})
tools.bodyClass('suggest-index',function(){$('textarea').bind('focus',function(e){$(e.currentTarget).val('');});});tools.bodyClass('whatisthis',function(){window.WhatIsThis=new WhatIsThisView();});tools.bodyClass('contact',function(){$('select').dropkick();});tools.bodyClass('suggest',function(){$('select').dropkick();});tools.bodyClass('login',function(){tools.openLoginPopup();});