define(['jquery', 'underscore', 'backbone', 'models/suggest', 'text!templates/contact/contact.html'], function ($, _, Backbone, ContactModel, _contactTemplate) {

    var ContactView = Backbone.View.extend({

        el: $("#contactus"),

        events: {
            'click .fullsubmit': 'saveToModel'
        },

        initialize: function () {
            this.model = new ContactModel();
             CDW.utils.auth.regHeader();
        },
        
        successHandler: function(res) {
          $(".error, .success").text("");
          $(".success-message").hide();
          
          for (k in res) {
            if (res.hasOwnProperty(k)) {
              $(".success-"+k).text(res[k]);
              if (k === 'message') {
                $(".success-"+k).show();
              }
            }
          }
          //scroll to top
          $("html, body").animate({ scrollTop: 0 }, "slow");
        },

        saveToModel: function () {
        var that = this;
        
            $.ajax({
                    url: '/contact',
                    type: 'POST',
                    data: JSON.stringify({
                     'firstname': $('[name="firstname"]').val(),
                     'lastname': $('[name="lastname"]').val(),
                     'email': $('[name="email"]').val(),
                     'comment': $("textarea").val(),
                     'feedback' : $(".styled-select option:selected").val()
                    }),
                    dataType: 'json',
                    contentType: "application/json; charset=utf-8",
                    success: function(res) {
                      that.successHandler(res);
                    },
                    error: function(eeee) {
                      
                    }
                });
         
        },

        render: function () {
            this.$el.find(".tmpl").html(_.template(_contactTemplate));
        }

    });
    return ContactView;
});