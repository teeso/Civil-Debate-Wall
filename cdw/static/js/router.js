// Filename: router.js


/*
 * To get the backbone router and jquery mobile to work together is tricky
 * 
 * The app is a single page app so all pages are hastags within that one page.
 * Hitting a href will change the hash and fire the router.
 * To trigger login without changing hash tag so as to stay modal I use
 * <a onclick="CDW.utils.auth.showLogin();return false;" data-role="button" data-rel="dialog" data-transition="pop">
 * and not the default dialog close btn as it is wrapped in an href.
 * 
 *  
 * 
 * 
 */

// Filename: app.js
define([
  'jquery', 
   'config',
   'jquery_mobile'
], function($,Config,Mobile){
	
	var apiHost = Config.api_host;
	var repliesPerPage = Config.replies_per_page;
	
	var C={};
	
  	var initialize = function(){



var homeView, commentView, apiHost, repliesPerPage, activityView, statsView; 
var voteView, debatesView, archiveView, profileView, loginView;




C.home = function(type, match, ui, page){
	
	var params = C.router.getParams(match[1]);
	var qid;
	if(params){
		qid = params['q'];
	}
	//use for past debates
	
	require(['views/home/main'], function(HomeView) {
		
       		if(!homeView){
				homeView = new HomeView();
       		}
        	
        	if(homeView.refresh){
        		homeView.render(qid, true);
        	}else{
        		//prevent need for whole page reload on return from comments
        		homeView.hideInputs();
        	}
        	if(CDW.utils.auth.getLoginStatus()){
        		var usr = CDW.utils.auth.getUserData();
        	 	CDW.utils.misc.setTitle("Hi "+usr.username);
        	}else{
        		CDW.utils.misc.setTitle('');
        		
        	}
       })
};


C.gotoThread = function(type, match, ui, page){
	var params = C.router.getParams(match[1]);
	
	
	require(['views/comments/comments'], function(CommentsView) {
		

	    	var qData;
	    	if(homeView){
	    		qData = homeView.models.current;//no need to pass question id when question string is already known
	    	}
	    	
	    	var thread = params.thread;//debate id 
	    	var qid = params.q;//question id
	    	//var skip = homeView.currenPage;
	    	//var limit = repliesPerPage;
	    	
	    	if(!commentView){
	    		commentView = new CommentsView();
	    	}
	    	//thread,question,qData model,postId,page offset
	    	//not implemented scroll to specific post or page
	    	
	       	commentView.render(thread,qid,qData);
	    	
	    	
      })
};

/*
C.signup = function(){
	require(['views/users/signup'], function(SignupView) {       
        var signupView = new SignupView();
        signupView.render();
      }) 
	
}*/

C.myActivity = function(type, match, ui, page){
	
	require(['views/users/activity'], function(ActivityView) {    
		if(!activityView){   
        	activityView = new ActivityView();
       	}
       	if(activityView.refresh){
       		 activityView.render();
      	 }
      }) 
	
}



C.login = function(type, match, ui, page){
	var params = C.router.getParams(match[1]);
	var postFunc=false;
	
	if(params){
		if(params['postNewOpinion'] =="true"&& homeView){
			postFunc = homeView.postOpinion
		};
		
		if(params['postComment'] =="true"&& commentView){
			postFunc = commentView.postReply
		};
	}
	
	
	require(['views/users/login'], function(LoginView) {   
		
		if(!loginView){    
        	loginView = new LoginView();
       	}
       	
       	
        loginView.render(postFunc);
      }) 
	
}


C.profile = function(type, match, ui, page){
		var params = C.router.getParams(match[1]);
		var isNew = false;
		var postFunc=false;
		if(params){
			isNew = params['new'] =="true";
			
			//this is to carry input through the reg process...not currently implemented
			//as not clear when it should be triggered
			/*
			if(params['postNewOpinion'] =="true"&& homeView){
				postFunc = homeView.postOpinion
			};
			
			if(params['postComment'] =="true"&& commentView){
				postFunc = commentView.postReply
			};*/
		}
		
	require(['views/users/profile'], function(ProfileView) {       
        if(!profileView){
         	profileView = new ProfileView();
        }
        profileView.render(isNew);
      }) 
	
}
C.suggest = function(type, match, ui, page){
	require(['views/contact/suggest'], function(SuggestView) {       
        var suggestView = new SuggestView();
        suggestView.render();
      }) 
	
}

C.stats = function(type, match, ui, page){
	
	var params = C.router.getParams(match[1]);
	var qid;
	if(params){
		if(params['qid']){
			qid = params['qid'];
		}
	}
	require(['views/stats/stats'], function(StatsView) {   
		if(!statsView){    
        	 statsView = new StatsView();
        }
        statsView.render(qid);
      }) 

	
}
C.pageShow = function (type, match, ui, page) {
    console.log('This page '+$(page).jqmData("url")+" has been initialized");
	CDW.utils.auth.updateTopmenu();
};


C.vote = function(type,match,ui,page){
	
	var params = C.router.getParams(match[1]);
	var postFunc=false;
	var qData = false;
	var stats = false;
	if(params){
		if(params['postComment'] =="true"&& commentView){
		
			postFunc = commentView.postReply;
			//need to pass question and stats to vote popup
			qData = commentView.models.question;
			stats = commentView.models.stats;
			
		};
	}
	
	require(['views/vote/vote'], function(VoteView) {    
		if(!voteView){   
        	voteView = new VoteView();
       	}
        //pass a reference to the function that should post a comment past vote
        voteView.render(postFunc, qData, stats);
      }) 


}

C.debates = function(type,match,ui,page){
	
		require(['views/past/debates'], function(DebatesView) {       
         	if(!debatesView){
         		debatesView = new DebatesView();
         	}
        	debatesView.render();
      })	 


}




C.archive = function(type, match, ui, page){
	
	var params = C.router.getParams(match[1]);
	var qid,dStr;
	if(params){
		qid = params['q'];
		dStr = params['date'];
	}
	//use for past debates
	
	require(['views/past/pastdebate'], function(ArchiveView) {
		
       			if(!archiveView){
       				 archiveView = new ArchiveView();
       			 }
        		archiveView.render(qid,dStr);
        	
        		
        		
        
       })
};
/*
 * 
 * 
 * https://github.com/azicchetti/jquerymobile-router
 * 
 *    bc  => pagebeforecreate
        c   => pagecreate
        i   => pageinit
        bs  => pagebeforeshow
        s   => pageshow
        bh  => pagebeforehide
        h   => pagehide
        rm  => pageremove
        bC  => pagebeforechange
        bl  => pagebeforeload
        l   => pageload

 */



C.router=new $.mobile.Router({
	"#": function(){ 
		handler: C.home
	},
	"#home([?].*)?": {
		handler: C.home, 
		events: "bs"
	},
	"#profile([?].*)?" : {
		handler : C.profile, 
		events : "bs"
	},
	"#reply([?].*)?" : {
		handler : C.gotoThread, 
		events : "bs"
	},
	"#login([?].*)?" : {
		handler : C.login, 
		events : "bs"
	},
	"#stats([?].*)?" : {
		handler : C.stats, 
		events : "bs"
	},
	"#debates([?].*)?" : {
		handler : C.debates, 
		events : "bs"
	},
	"#activity([?].*)?" : {
		handler : C.myActivity, 
		events : "bs"
	},
	"#vote([?].*)?" : {
		handler : C.vote, 
		events : "bs"
	},
	"#archive([?].*)?" : {
		handler : C.archive, 
		events : "bs"
	},
	"#suggest([?].*)?" : {
		handler : C.suggest, 
		events : "bs"
	},
	".": {
		handler: C.pageShow, events: "bs"
	}});


C.init = function(){
	if(this.inited){
		return;
	}
	
	this.inited = true;
	
	
}



	 };

  return { 
    initialize: initialize,
    router:C
  };
});