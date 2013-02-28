$(function() {
  var DNode = require('dnode');
  var middleware = require('backbone-dnode');

  if (typeof jQuery === 'undefined'
   || typeof Backbone === 'undefined'
   || typeof DNode === 'undefined')
  {
    alert('require error');
    return;
  }

  // basic shift model
  window.Shift = Backbone.Model.extend({
    url: 'shifts',
    type: 'shift',
    sync: _.sync,
  });

  // shift collection
  window.ShiftList = Backbone.Collection.extend({
    model: Shift,

    url: 'shifts',
    type: 'shift',
    sync: _.sync,
  });

  window.Shifts = new ShiftList;


  // shift view
  window.ShiftView = Backbone.View.extend({
    tagName: 'td',
    events: {
      'click ': 'showInfo'
    },

    initialize: function() {
      _.bindAll(this, 'render', 'close');

      this.model.bind('remove', this.remove);
      this.model.bind('change', this.render);
      this.model.views.append(this);
    },
    
    showInfo: function() {
      console.dir(this);
    }
  });

  // main view controller
  window.AppView = Backbone.View.extend({
    el: $("#container"),
    
    overviewTemplate: _.template($('#shiftOverview').html());
    
    initialize: function() {
      _.bindAll(this, 'addOne', 'addAll');

      Shifts.bind('add', this.addOne);
      Shifts.bind('reset', this.addAll);

      Shifts.fetch();
      Shifts.subscribe();

      this.el.html(this.overviewTemplate({}));
      // print empty timetable
      /*
      var timeZero = new Date(2011, 10, 31, 10);
      for (var i = 0; i < 44; i++) {
        var el = this.rowTemplate({
          hours: timeZero.getUTCHours(), 
          minutes: timeZero.getUTCMinutes(), 
          even: i%2 == 0 ? true : false
        });
        this.shiftsEl.append(el);
        timeZero = new Date(timeZero.valueOf() + 900000);
      }
      */
    },

    addOne: function(shift) {
      console.log('Add a shift!');
      console.dir(shift);
    },

    addAll: function() {
      console.log('Add ALL shifts!');
    }
  });
  
  window.AppRouter = Backbone.Router.extend({
    routes: {
     '': 'main',
     'shifts':  'shiftList',
     'shifts/add': 'shiftAdd'
    },
    
    main: function() {
      console.log('// spawn main view?');
      window.App = new AppView;
    },
    
    shiftList: function() {
      console.log("//open list/index view");
    },
    
    shiftAdd: function() {
      console.log("// open add view");
    }
  });

  // connect DNode and get the party started
  DNode()
    .use(middleware.crud)
    .use(middleware.pubsub)
    .connect(function() {
      new AppRouter;
      Backbone.history.start({pushState: true});
    });
});
