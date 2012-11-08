//local
define(['underscore', 'text!templates/reg/login.html', 'text!templates/quickvote/quickreply.html', 'text!templates/comments/yesno.html', 'text!templates/debate/debate.html'], function (_, _regLoginTemplate, _quickreplyTemplate, _yesnoTemplate, _debateTemplate) {

    var isNewUser = true,
    
        loginStatus = false, 
        
        userdata,
    
    CDW = CDW || {};

    CDW.utils = CDW.utils || {};

    window.CDW = CDW;

    CDW.utils = (function (window, document, $, undefined) {

        var likes = function (postId,target) {
          
          var likecall = function(cfg) {
            
               $.ajax({
                    url: '/api/posts/' + cfg.postId + '/like',
                    type: 'POST',
                    dataType: 'json',
                    success: function (msg) {
                        cfg.target.find(".count").text(msg.likes);
                        cfg.target.unbind("click")
                    },
                    error: function (e) {
                       console.log(e);
                    }
                });
                
                
            };
            
          $(target).bind("click", function(e) {
            e.preventDefault();
            
            if (CDW.utils.auth.getLoginStatus()) {
               likecall({postId: postId, target:target}); 
            } else {
              
              CDW.utils.auth.init();
              
              var func = function () {                 
                 likecall({postId: postId, target:target}); 
                 $("#reg-overlay .close").trigger("click");
                 $(window).unbind("CDW.isLogin", func);
              };
              
              $(window).bind("CDW.isLogin", func);
              
            }
                        
          })

        },

       auth = {

            init: function (callback) {

                var isLogin = CDW.utils.auth.getLoginStatus(),
                    overlay = $("#reg-overlay");

                if (isLogin) {
                    $(window).trigger("CDW.isLogin");
                    return false;
                }

                if ($("#reg-overlay").length === 0) {
                    $("body").append(_.template(_regLoginTemplate));
                }

                overlay = $("#reg-overlay");
                overlay.find(".close").bind("click", function () {
                    overlay.hide().siblings().show();
                }).end().siblings().hide();

                $("#reg-overlay").show();

                // login process needs to be worked on
                CDW.utils.auth.login();
                


            },
 
 
            getLoginStatus : function() {
              return loginStatus;
            },
            
            setLoginStatus : function(status) {
              loginStatus = status;
            },
            
            getUserData : function() {
              return JSON.parse(sessionStorage.getItem('userData'));
            },
            
            setUserData : function(email) {
              
              $.ajax({
                 url: '/api/users/search',
                 type: 'POST',
                 data: {email : email},
                 dataType: 'json',
                 success: function(response) {                                        
                sessionStorage.setItem('userData', JSON.stringify(response[0]));
                                        
                 }
                 });
             

            },
            
            signIn : function(cfg) {
                
                $.ajax({
                           url: '/auth',
                           type: 'POST',
                           data: {
                             madal:true,
                             email : cfg.email,
                             password: cfg.pwd,
                             username: cfg.username
                           },
                           dataType: 'json',
                           success: function(response) {
                             
                             if (response.success) {
                                // this is a heck
                                
                                 $.ajax({
                                     url: '/api/users/search',
                                     type: 'POST',
                                     data: {email : cfg.email},
                                     dataType: 'json',
                                     success: function(response) {                                        
                                        CDW.utils.auth.setUserData(cfg.email); 
                                        CDW.utils.auth.setLoginStatus(true);
                                        $(window).trigger("CDW.isLogin");
                                     }
                                });
   
                             }
                             
                             if (response.error) {
                                CDW.utils.auth.setLoginStatus(false);
                                cfg.container.text(response.error);
                             }
                           }
                 });
            },
            
            login: function (callback) {

                
                
                
                var overlay = $("#reg-overlay"),
                    regFrom = $("#reg-overlay #login_or_signup_form"),
                    error = regFrom.find(".error-msg"),
                    submit = regFrom.find(".submit"),
                    email,
                    newuser = true,
                    re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                    username_lookup = function() {
                        
                        $.ajax({
                           url: '/api/users/search',
                           type: 'POST',
                           data: {email : regFrom.find('input[name="email"]').val()},
                           dataType: 'json',
                           success: function(response) {
                             if(response.length > 0) {
                               $(window).trigger("CDW.userExisted");
                             } else {
                               $(window).trigger("CDW.newUser");
                             }
                           }
                         });
                    },
                    throttled =  _.throttle(username_lookup, 250);
                    
                //load 3rd party sdks
                $.when(CDW.utils.cdwFB.loadSDK(), CDW.utils.cdwTW.loadSDK()).done(function () {
                
                   //bind FB btn
                   $("#reg-overlay .sbtn").first().bind("click", function () {
                       FB.login(function(res) {
                         console.log(res);
                         CDW.utils.auth.setLoginStatus(true);
                         $(window).trigger("CDW.isLogin");
                       });
                   });
                   
                   //bind tw Buttons
                   $("#reg-overlay .sbtn").last().bind("click", function () {
                       
                       twttr.anywhere.config({ callbackURL: "http://dev.civildebatewall.com/static/twitterauth.html"});
                       twttr.anywhere(function (T) {
                           
                           if (T.isConnected()) {
                              CDW.utils.auth.setLoginStatus(true);
                              $(window).trigger("CDW.isLogin");
                              return false;
                           }
                           
                           T.bind("authComplete", function (e, user) {                            
                            CDW.utils.auth.setLoginStatus(true);
                            $(window).trigger("CDW.isLogin");
                           });
                           
                           T.signIn(); 
                       });
                       
                       
                       
                   });
                   
                   /* EMAIL login */
                   
                   
                   $(window).bind("CDW.userExisted", function() {
                     regFrom.find(".btn").text("sign in").unbind().bind("click",function() {
                       
                         CDW.utils.auth.signIn({
                           email: regFrom.find('input[name="email"]').val(),
                           username: regFrom.find('input[name="email"]').val(),
                           pwd: regFrom.find('input[name="password"]').val(),
                           container: regFrom.find('.error-msg')
                         });
                                           
                     });
                   }).bind("CDW.newUser", function() {
                     regFrom.find(".btn").text("Register").unbind().bind("click",function() {
                        
                         console.log("talk to reg");      
                                           
                     });
                   });
                   
                   regFrom.find('input[name="password"]').bind("focus",function() {
                      username_lookup();
                   });
                   
                   //regFrom.find('input[name="email"]').unbind().bind("keyup keypress blur change", throttled);
                  
                   
                });




            }

        },
        
        cdwTW = {
        
            loadSDK: function (cfg) {
              var dfd = dfd = $.Deferred();
              
              $.getScript("http://platform.twitter.com/anywhere.js?id=90VpETwGUGB6Wjm3mMUTQ&v=1", function () {
                dfd.resolve();
              });
              
              return dfd.promise();
              
            }
        
        },
        
        cdwFB = {

            loadSDK: function (cfg) {
                var that = this,
                    dfd = $.Deferred(),
                    loadingFB = false,
                    fbscript = "//connect.facebook.net/en_US/all.js";


                if (!window.FB && !loadingFB) {

                    cfg = $.extend({
                        appId: "263562500362985",
                        status: true,
                        cookie: true,
                        logging: null,
                        oauth: true,
                        xfbml: true
                    }, cfg);


                    if ($("#fb-root").length === 0) {
                        $('body').prepend('<div id="fb-root"></div>');
                    }

                    $.getScript("http://" + fbscript, function () {
                        loadingFB = true;
                        FB.init(cfg);
                        dfd.resolve();

                    });


                } else {

                    dfd.resolve();

                }

                return dfd.promise();

            }

        },

        quickreply = {
            
            replyThread: function() {
              alert("post!!!");
              $("#yesno-overlay").remove();
              $("#reg-overlay").remove();              
              $("#wrapper").show();
            },
            
            sayIt: function (qid, container) {

                if ($("#commentsform input").attr("value") === '') {
                    return false;
                }

                if (!CDW.utils.auth.getLoginStatus()) {
                   
                   $(window).bind("CDW.isLogin", function () {
                     if (!sessionStorage["question_" + qid + "_vote"]) {
                      CDW.utils.quickreply.onYesNoView(qid, container);   
                     } else {
                      CDW.utils.quickreply.replyThread();
                      return false;
                     }
                
                   });
                   
                   CDW.utils.auth.init();
                    
                   return false;
                } else {
                
                   if (!sessionStorage["question_" + qid + "_vote"]) {
                      CDW.utils.quickreply.onYesNoView(qid, container);
                      return false;                
                    }
                }
                
                

                
                
                 CDW.utils.quickreply.replyThread();
                 return false;
                
                



            },

            onYesNoView: function (qid, container) {
                var key = "question_" + qid + "_vote",
                    container = $(container);
                    
                
                $("#wrapper").show().find("#reg-overlay").remove();

                if ($("#yesno-overlay").length === 0) {

                    $("#wrapper").prepend(_.template(_yesnoTemplate));

                    //bind events

                    $("#yesno-overlay .close,#yesno-overlay .cancel").unbind().bind("click", function () {
                        $("#yesno-overlay").hide();
                        container.show();
                    });

                    //bind yes no button
                    $("#yesno-overlay .btn-wrap .btn").unbind().bind("click", function () {
                        $(window).trigger("updateYourVote", [key, $(this).attr("data-vote")]);
                        $(this).siblings().removeClass("select").end().addClass("select");

                        
                        if (CDW.utils.auth.getLoginStatus()) {
                            $("#yesno-overlay").hide();
                            container.show(); 
                            return false;
                        }

                        CDW.utils.auth.init();


                    });

                } else {

                    $("#yesno-overlay").show();

                }
                container.hide();
            }

        },

        init = function () {

            $(window).bind("updateYourVote", function (e, key, yourvote) {
                CDW.utils.updateYourVote(key, yourvote)
            });

        },

        updateYourVote = function (key, yourvote) {
            sessionStorage.setItem(key, yourvote);
        },

        quickvote = {

            postNewOpinion: function(qid,vote,text) {
               //http://dev.civildebatewall.com/api/questions/4ed68023e56d7a09c8000003/threads
               $.ajax({
                    url: '/api/questions/'+qid+'/threads',
                    type: 'POST',
                    data: {
                      author:CDW.utils.auth.getUserData().id,
                      yesno:(vote === 'no') ? 0 : 1,
                      origin: "cell",
                      text: text
                    },
                    dataType: 'json',
                    success: function(res) {
                      console.log(res);
                      $(window).trigger("CDW.onPostNewOpinion", [res]);                
                    }
                });
            },
            
            showStats: function (e) {
                e.preventDefault();
                $(".discussion .btn-wrap, .discussion .selected,  .discussion .total").show();
                $(".discussion .answar").hide();
            },

            hideResetReplyForm: function (e) {
                e.preventDefault();
                $(".discussion .btn-wrap, .discussion .selected").hide();
                $(".discussion .answar").hide();
                $(".discussion .total").hide();
            },

            showReplyForm: function (e, slKey) {
                e.preventDefault();
                var yourvote = ($(e.currentTarget).hasClass("yes")) ? "yes" : "no",
                    key = slKey,
                    data = (sessionStorage.getItem(key)) ? sessionStorage.getItem(key) : "";

                $("#feedsform input").one("focus", function () {
                    $(this).attr("value", "");
                });


                $(e.currentTarget).removeClass("notselect").siblings().addClass("notselect");

                $(".discussion .btn-wrap, .discussion .selected").show();
                $(".discussion .answar").show();
                $(".discussion .total").hide();
                $("#feedsform .text").removeClass().addClass((yourvote === 'yes') ? "text textblue" : "text textorange");
                $(".answar .yourvote").text("You say " + yourvote + "!");
                $(window).trigger("updateYourVote", [key, yourvote]);


            },

            reply: function (e,qid,vote,text) {
                e.preventDefault();
                var that = this,
                    feedsDiv = $("#feeds"),
                    func = function () {
                      CDW.utils.quickvote.postNewOpinion(qid,vote,text);
                      $(window).unbind("CDW.isLogin", func);
                    };

                if (!CDW.utils.auth.getLoginStatus()) {                   
                   $(window).bind("CDW.isLogin", func);
                } else {
                    CDW.utils.quickvote.postNewOpinion(qid,vote,text);
                }

                CDW.utils.auth.init();
                $(".discussion").children().hide();

                $(".mask").css("top", "-100000px");

            }

        },

        misc = {

            normalizeData: function () {

            },

            yesNo: function (vote) {
                return (vote == 0) ? "no" : "yes";
            },

            daysDifference: function (date) {

                var test = date,
                    arr = date.split(".");

                date = new Date(arr[0].replace(" ", "T"));

                var seconds = Math.floor((new Date() - date) / 1000);

                var interval = Math.floor(seconds / 31536000);

                if (interval > 1) {
                    return interval + " years";
                }
                interval = Math.floor(seconds / 2592000);
                if (interval > 1) {
                    return interval + " months";
                }
                interval = Math.floor(seconds / 86400);
                if (interval > 1) {
                    return interval + " days";
                }
                interval = Math.floor(seconds / 3600);
                if (interval > 1) {
                    return interval + " hours";
                }
                interval = Math.floor(seconds / 60);
                if (interval > 1) {
                    return interval + " minutes";
                }
                return Math.floor(seconds) + " seconds";

            }
        };

        function Buttons(cfg) {

            this.cfg = $.extend({
                container: "",
                url: document.location.href,
                title: document.title
            }, cfg);

        };

        Buttons.prototype = {

            publish: function (selector, cfg) {

                cfg = $.extend({
                    url: document.location.href,
                    headline: document.title,
                    caption: undefined,
                    desc: $("meta[name='description']").attr("content") || "",
                    img: undefined,
                    usr_msg: undefined,
                    force_display: 'dialog',
                    track_pfx: (window.omPageName || "Facebook UI") + ": ",
                    success: undefined,
                    // callback function
                    error: undefined // callback function
                }, cfg);



                $(selector).unbind().bind("click", function () {
                    $("html, body").animate({
                        scrollTop: 0
                    }, "slow");
                    cfg.track_pfx && bam.tracking && bam.tracking.track && bam.tracking.track({
                        genericExternalLinkTracker: {
                            tracked: cfg.track_pfx + 'Initial Click'
                        }
                    });
                    window.FB.ui({
                        method: 'stream.publish',
                        display: cfg.force_display,
                        message: cfg.usr_msg,
                        attachment: {
                            name: cfg.headline,
                            caption: cfg.caption,
                            description: cfg.desc,
                            href: cfg.url,
                            media: cfg.img && [{
                                type: "image",
                                href: cfg.url,
                                src: cfg.img
                            }]
                        }
                    }, function (response) {
                        if (response && response.post_id) {
                            cfg.track_pfx && bam.tracking && bam.tracking.track && bam.tracking.track({
                                genericExternalLinkTracker: {
                                    tracked: cfg.track_pfx + 'Success Click'
                                }
                            });
                            (typeof cfg.success === "function") && cfg.success();
                        } else {
                            cfg.track_pfx && bam.tracking && bam.tracking.track && bam.tracking.track({
                                genericExternalLinkTracker: {
                                    tracked: cfg.track_pfx + 'Cancel Click'
                                }
                            });
                            (typeof cfg.error === "function") && cfg.error();
                        }
                    });
                    return false;
                });


                return this;
            },

            likes: function (postId) {

                $.ajax({
                    url: '/api/posts/' + postId + '/like',
                    type: 'POST',
                    dataType: 'json',
                    success: callback
                });
            }

        }


        return {

            social: Buttons,

            cdwFB: cdwFB,

            auth: auth,

            misc: misc,

            likes: likes,

            quickvote: quickvote,

            quickreply: quickreply,

            updateYourVote: updateYourVote,

            init: init,
            
            cdwTW: cdwTW
        }



    })(this, this.document, this.jQuery);

});


String.prototype.toTitleCase = function () {
    var A = this.split(' '),
        B = [];
    for (var i = 0; A[i] !== undefined; i++) {
        B[B.length] = A[i].substr(0, 1).toUpperCase() + A[i].substr(1);
    }
    return B.join(' ');
}
