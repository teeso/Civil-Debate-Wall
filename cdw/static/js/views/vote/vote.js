define([
  'jquery',
  'underscore',
  'backbone',
  'config'
], function($, _, Backbone, Config){
	var apiHost = Config.api_host;
	var postFunc;
	var voteView;
	
  var VoteView = Backbone.View.extend({ 
    el: $("#voteform"),
    initialize: function(){
		voteView = this;
      },  
    events: {
            "click #agreeBtn":"voteYesAndPost",
            "click #disagreeBtn":"voteNoAndPost"
    },  
    voteYesAndPost:function(){
    	CDW.utils.quickvote.setVote(false,1);
    	if(voteView.postFunc){
    		voteView.postFunc(null);//post the reply after vote
    		voteView.postFunc = null;
    	}
    	$('#vote').dialog('close');
    },
    voteNoAndPost:function(){
    	CDW.utils.quickvote.setVote(false,0);
    	if(voteView.postFunc){
    		voteView.postFunc(null);//post the reply after vote
    		voteView.postFunc = null;
    	}
    	$('#vote').dialog('close');
    },
    render: function(postFunc,qData, stats){
      voteView.postFunc = postFunc;
      console.log("voteView render");


		if(qData){
			$("#voteform .question .text").text(qData.data.text);
		}
		
		if(stats){
			if(stats.data){
				$("#voteform .yesspan").text(stats.data.debateTotals.yes +" Agree");
				$("#voteform .nospan").text(stats.data.debateTotals.no +" Disagree");
			}
			
     	}
    }
  });
  return VoteView;
});
