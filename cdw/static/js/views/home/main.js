/*
 * As far as I can tell
 * _mainHomeTemplate
 * _listTemplate
 * _debateTemplate is used when loading more entries, both here and in comments...should be rewritten so all entries use the same
 */

define(['jquery', 'underscore', 'backbone', 'config', 'sdate', 'cdw', 
        'jquery_mobile','jquery_color', 'models/current', 'models/question', 'models/stats', 
        'models/debates', 'text!templates/home/main.html', 
        'text!templates/users/list.html', 'text!templates/debate/debate.html', 
        'text!templates/quickvote/quickvote.html'
], function($, _, Backbone, Config, Sdate, Utils, 
        Mobile, Colour,CurrentModel, QuestionModel, StatsModel, 
        DebatesModel, _mainHomeTemplate, 
        _listTemplate, _debateTemplate, _quickvoteTemplate) {

    var apiHost = Config.api_host;
    var repliesPerPage = Config.replies_per_page;
    var scrollDist = Config.scroll_reload_margin;

    var imgUrl = Config.img_url;

    var currThread;

    var wasLiked;
    //helps to stop like clicks bubble through to bg click
    var refresh;
    //listens to new comments but doesn't reload until page change
    var homeView;
	
	var quickvoteIsOpen;
	
    var MainHomeView = Backbone.View.extend({

        el : $("#feeds"),

        // The initialize function is always called when instantiating a Backbone View.
        // Consider it the constructor of the class.
        initialize : function() {

            //create a local reference to related data models
            this.models = {};
            //make initial calls by loading these models
            this.models.current = new CurrentModel();
            this.models.debates = new DebatesModel();
            this.models.stats = new StatsModel();
            this.currentQuestion = {};
            this.currentpage = 0;
            this.perPage = repliesPerPage;
            this.menuStatus = false;
            //open close side menu
            //
            this.wasLiked = false;
            this.refresh = true;

            this.imgUrl = imgUrl;
            this.quickvoteIsOpen = false;

            homeView = this;

            /*
             * This function is triggered post vote+opinion which is called in CDW global space
             * as it is called from comments view as well
             */

             $(window).bind("CDW.onUserdata", function(e, data) {
       			homeView.refresh = true;//refresh on next load
      		 });		

            $(window).bind("CDW.onPostNewOpinion", function(e, data) {

                _.templateSettings.variable = "entry";
                data.firstPost.imgUrl = homeView.imgUrl;
                $("#feeds .debates.bottom").prepend(_.template(_debateTemplate, data.firstPost));
                
               if(CDW.utils.quickvote.getVote(homeView.models.current.id)){
                	
                	$('#feeds .debates.bottom div').first().css('background-color', '#d9f5ff');
                }else{
                	$('#feeds .debates.bottom div').first().css('background-color', '#ffe5d8');
                }
				$('#feeds .debates.bottom div').first().animate({"background-color": 'transparent'}, 2000);
                homeView.hideInputs();

            });

            $(window).bind("CDW.loginStatus", function(e, data) {
                if (CDW.utils.auth.getLoginStatus()) {
                    var usr = CDW.utils.auth.getUserData();
                    CDW.utils.misc.setTitle("Hi " + usr.username);

                } else {
                    CDW.utils.misc.setTitle('');

                }
            });

            /*
             * Replies are posted from comment view...we are waiting to refresh un back
             */
            $(window).bind("CDW.onPostNewReply", function(e, data) {
                homeView.refresh = true;
            });
            $(window).bind('scrollstop', function() {
                //only run if active page
                if ($.mobile.activePage.attr('id') != 'home') {
                    return;
                }
                //alert($(document).height() + ", " + $(window).height() + ", " + $(document).scrollTop());
                var d = $(document).height() - $(window).height() - $(document).scrollTop();
                //alert("before call more: " + homeView.currentpage + ", " + d + ", " + scrollDist);
                if (d < scrollDist && $(document).scrollTop()) {
                    homeView.getMore();
                    //alert("after call more");
                }
            });

        },

        events : {
            "click .debates .debate .reply" : "goThread",
            "click .debate .replyItem" : "goThread",
            "click .debate .gotoThread" : "goThread",
            "click .debate .likes" : "like",
            "click .question .reply" : "showBtns",
            "click .question .text" : "showBtns",
            "click .discussion .btn-wrap .yes" : "voteYes",
            "click .discussion .btn-wrap .no" : "voteNo",
            "click .discussion .answer .reply" : "postOpinion"

        },
        render : function(qid, clear) {
            //home page default render function
           
            if(clear){
            	 this.hideInputs();
            	$("#feedsform input").attr("value", "");
            }
           
            this.refresh = false;
            this.currentpage = 0;
            window.scrollTo(0, 0);

            $("#feeds .content .debates").show();
            //while loading
            
            $('#feeds .content-wrapper').hide();
            
           

            /*
             * To use jquery.mobile default loaders need to include jquery_mobile in require define above (even if already loaded previously)
             */

            $.mobile.loading('show', {
                theme : "c",
                text : "Loading...",
                textonly : false
            });

            //$.mobile.loading('hide');
            homeViewData = {};

            if (qid) {
                $(".nav.question").show();
                homeView.models.current = new QuestionModel();
                homeView.models.current.url = apiHost + "api/questions/" + qid;
            } else {
                //$(".nav.main").show();
                homeView.models.current = new QuestionModel();
                homeView.models.current.url = apiHost + "api/questions/current";

            }
            // homeView.$el.find(".text").text("loaded question");
            $("#feeds .question .text").text("Loading question...");
            //$("#feeds .question .text").show();
            //bind events

            // homeView.$el.bind("resetReplyForm", homeView.hideResetReplyForm);

            /*
             * first get current question
             * then load stats, ie. who's most debated, faved etc
             * and finally load first set of responds
             */

            this.models.current.fetch({

                dataType : "jsonp",

                success : function(model, currentdata) {

                    $("#feeds .content .debates").show();

                    //the local models object was create above
                    homeView.models.current.data = currentdata;

                    //question doesn't have or need an underscore template because it doesn't contain an array of data
                    $("#feeds .question .text").text(homeView.models.current.data.text);

                    $.mobile.loading('show', {
                        theme : "c",
                        text : "Loading...",
                        textonly : false
                    });

                    //load top debated/top faved
                    homeView.models.stats.url = apiHost + "api/stats/questions/" + homeView.models.current.data.id;
                    homeView.models.stats.fetch({
                        dataType : "jsonp",
                        success : function(model, statsdata) {
                            homeView.models.stats.data = statsdata;

                            //populate the list template with top debated
                            /*
                             * By default, template places the values from your data in the local scope via the
                             * withstatement. However, you can specify a single variable name with the variable setting.
                             * This can significantly improve the speed at which a template is able to render.
                             * Within the list.html template this variable is referenced. Effectively it
                             * becomes an alias for your associative array.
                             */

                            _.templateSettings.variable = "main";

                            homeView.models.imgUrl = homeView.imgUrl;

                            //debates top are the two hottest at the top
                            homeView.$el.find(".debates.top").html(_.template(_listTemplate, homeView.models));

                            //discussions is the dropdown quick vote area
                            homeView.$el.find(".discussion").html(_.template(_quickvoteTemplate, homeView.models));

                            ////load response

                            //homeView.models.debates.url = apiHost + "api/questions/" + currentdata.id + "/posts?skip=" + (homeView.currentpage * homeView.perPage) + "&limit=" + homeView.perPage;
                            homeView.models.debates.url = apiHost + "api/questions/" + currentdata.id + "/posts?skip=0&limit=" + homeView.perPage;
                            homeView.models.debates.fetch({
                                dataType : "jsonp",
                                success : function(model, debatesdata) {
                                    homeView.models.debates.data = debatesdata;
                                    // homeView.models.stats.url =  apiHost+"api/stats/questions/" + currentdata.id;
                                    _.templateSettings.variable = "main";

                                    //pass Config.img_url to template
                                    homeView.models.imgUrl = homeView.imgUrl;

                                    homeView.$el.find(".tmpl").html(_.template(_mainHomeTemplate, homeView.models));
                                    // $("#feeds .question .text").text(homeView.models.current.data.text);
                                    //$("#feeds #footer-container").show();

                                    if (debatesdata.total > homeView.perPage) {
                                        $(".seemore .more").show();
                                    }

                                    $.mobile.loading('hide');

                                    $('#feeds .content-wrapper').fadeIn();
                                }
                            });

                            ////////////response load over

                        }
                    });

                    //sequenced loading over

                }
            });

        },
        goThread : function(e) {

            if (!this.wasLiked) {
                //alert("gothread "+$(e.currentTarget).attr("data-thread"));
                //$(e.currentTarget).effect("highlight", {color:"00b7ff"}, 1000);

                // $(e.currentTarget).animate({backgroundColor: "#ff0000" });

                this.currThread = $(e.currentTarget).attr("data-thread");
                $.mobile.changePage("#reply?thread=" + this.currThread + "&q=" + this.models.current.id, {
                    changeHash : true
                });

            }
            this.wasLiked = false;

        },
        hideInputs : function(e) {
            $("#feeds .discussion .selected,#feeds .discussion .btn-wrap,#feeds .discussion .answer").hide();
            //$("#feeds .question .reply a").css("background","url('images/penSide.png') no-repeat scroll 0 0 transparent;");
            $("#feeds .question .reply a").addClass("penside");
            $("#feeds .question .reply a").removeClass("penup");

            //$("#feedsform input").attr("value", "");
            
            homeView.quickvoteIsOpen = false;
            //empty field
        },
        showBtns : function(e) {
		
			if( homeView.quickvoteIsOpen){
				homeView.hideInputs();
				return;
			}

            // $(".discussion .selected").hide();
            $("#feeds .discussion .btn-wrap .no,#feeds .discussion .selected .no .one,#feeds .discussion .btn-wrap .yes,#feeds .discussion .selected .yes .one").removeClass("notselect");
            $("#feeds .discussion .btn-wrap").show();
            //$(".discussion .btn-wrap, .discussion .total").show();

            $("#feeds .question .reply a").removeClass("penside");
            $("#feeds .question .reply a").addClass("penup");
            // $("#feeds .question .reply a").css("background-image","url('images/penUp.png') no-repeat scroll 0 0 transparent;");
			 this.quickvoteIsOpen = true;
        },
        showQuickreply : function(e) {
            $("#feeds .discussion .selected").show();
            $("#feeds .discussion .btn-wrap").hide();
            //$(".discussion .btn-wrap, .discussion .total").show();
            $("#feeds .discussion .answer").show();
            $(this).attr("value", "Leave a comment...");
            $("#feedsform input").on("focus", function() {
                $(this).attr("value", "");
            });
            
           

        },
        voteYes : function(e) {
            //this.votedYes =1;
			CDW.utils.quickvote.setCurrentQuestion(this.models.current.id);
            CDW.utils.quickvote.setVote(this.models.current.id, 1);

            //change colour of buttons and counters
           /* $("#feeds .discussion .btn-wrap .yes,.discussion .selected .yes .one").removeClass("notselect");
            $("#feeds .discussion .btn-wrap .no,.discussion .selected .no .one").addClass("notselect");

            $("#feeds .discussion .selected .yes").addClass("yescolor");
            $("#feeds .discussion .selected .no").removeClass("nocolor");

            $("#feeds .discussion .selected .no.sel").addClass("notselbg");
            $("#feeds .discussion .selected .no.sel").removeClass("nobg");
            $("#feeds .discussion .selected .yes.sel").addClass("yesbg");
            $("#feeds .discussion .selected .yes.sel").removeClass("notselbg");*/

            $("#feeds .discussion .selected .yes .one").html("<span>" + (this.models.stats.data.debateTotals.yes + 1) + " Agree</span>");
            $("#feeds .discussion .selected .no .one").html("<span>" + (this.models.stats.data.debateTotals.no) + " Disagree</span>");

			var tot = (this.models.stats.data.debateTotals.yes)+(this.models.stats.data.debateTotals.no )+ 1;
			var yW = (this.models.stats.data.debateTotals.yes+ 1)/tot*100;
			var nW = 100-yW;
			$("#feeds .discussion .selected .yes.sel").css("width",yW+"%");
			$("#feeds .discussion .selected .no.sel").css("width",nW+"%");

            $("#feedsform .yourvote").text("YOU SAY YES!");
            $("#feedsform .yourvote").addClass("yescolor");
            this.showQuickreply();

        },
        voteNo : function(e) {
            //this.votedYes = 0;
            CDW.utils.quickvote.setCurrentQuestion(this.models.current.id);
            CDW.utils.quickvote.setVote(this.models.current.id, 0);
            //change colour of buttons and counters
           /* $("#feeds .discussion .btn-wrap .no,.discussion .selected .no .one").removeClass("notselect");
            $("#feeds .discussion .btn-wrap .yes,.discussion .selected .yes .one").addClass("notselect");

            $("#feeds .discussion .selected .no").addClass("nocolor");
            $("#feeds .discussion .selected .yes").removeClass("yescolor");

            $("#feeds .discussion .selected .no.sel").addClass("nobg");
            $("#feeds .discussion .selected .no.sel").removeClass("notselbg");
            $("#feeds .discussion .selected .yes.sel").addClass("notselbg");
            $("#feeds .discussion .selected .yes.sel").removeClass("yesbg");*/

            $("#feeds .discussion .selected .yes .one").html("<span>" + (this.models.stats.data.debateTotals.yes) + " Agree</span>");
            $("#feeds .discussion .selected .no .one").html("<span>" + (this.models.stats.data.debateTotals.no + 1) + " Disagree</span>");
			
			var tot = (this.models.stats.data.debateTotals.yes)+(this.models.stats.data.debateTotals.no)+ 1;
			var yW = (this.models.stats.data.debateTotals.yes)/tot*100;
			var nW = 100-yW;
			$("#feeds .discussion .selected .yes.sel").css("width",yW+"%");
			$("#feeds .discussion .selected .no.sel").css("width",nW+"%");

            $("#feedsform .yourvote").text("YOU SAY NO!");
            $("#feedsform .yourvote").addClass("nocolor");

            this.showQuickreply();
        },
        postOpinion : function(e) {

            if (!CDW.utils.auth.getLoginStatus()) {
                $.mobile.changePage("#login?postNewOpinion=true", {
                    changeHash : true,
                    role : "dialog",
                    transition : "pop"
                });
                return;
            }

            var txt = $("#feedsform input").attr("value");
            CDW.utils.quickvote.postNewOpinion(homeView.models.current.id, CDW.utils.quickvote.getVote(homeView.models.current.id), txt);
        },
        like : function(e) {
            //used to prevent background click to fire
            this.wasLiked = true;
            CDW.utils.likes($(e.currentTarget).attr("data-postid"), $(e.currentTarget));
        },
        getMore : function() {
            this.currentpage++;
            this.models.debates.url = apiHost + "api/questions/" + this.models.current.data.id + "/posts?skip=" + (homeView.currentpage * homeView.perPage) + "&limit=" + homeView.perPage;

            $("#feeds .seemore").find(".more").hide().end().find(".loader").show();

            this.models.debates.fetch({
                dataType : "jsonp",

                success : function(model, postsdata) {

                    var posts = (postsdata.data) ? postsdata.data : postsdata.posts, container = $("#feeds .seemore"), i, total = postsdata.postCount;

                    if (posts.length === 0) {
                        container.find(".loader, .more").hide();
                        return false;
                    }

                    for ( i = 0; i < posts.length; i++) {
                        _.templateSettings.variable = "entry";

                        posts[i].imgUrl = homeView.imgUrl;
                        $("#feeds .seemore").before(_.template(_debateTemplate, posts[i]));
                    }

                    //what on earth?!
                    if (homeView.currentpage < 3) {
                        if ($(".debates.bottom .debate").length >= total) {
                            container.find(".loader, .more").hide();
                        } else {
                            container.find(".loader").hide().end().find(".more").show();
                        }
                    } else {
                        container.find(".loader, .more").hide();
                    }

                    if (total <= ((homeView.currentpage + 1) * repliesPerPage)) {
                        $("#feeds .seemore .more").hide();
                    }

                    if (total <= repliesPerPage) {
                        container.find(".loader, .more").hide();
                    }

                }
            });

        }
    });
    return MainHomeView;
});
