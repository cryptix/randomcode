$(document).ready(function() {

  function addTask() {
    var field = $("#taskDescr"),
    txt = field.val();

    // check field for not empty
    if (typeof txt === "string" && txt.length != 0) {
      // add task
      todos.add(txt)
    }

    // clear field
    field.val("");
    // reset route
    router.setRoute("");
  }

  // Init remoteStorage
  remoteStorage.displayWidget('remotestorage-connect');
  remoteStorage.loadModule('tasks', '0.1', 'rw');

  // get todo instance
  var todos = remoteStorage.tasks.getPrivateList('todos');

  // setup routs
  var routes = {
    '/add': addTask,
    '/delete/:id': todos.remove,
    '/toggle/:id': todos.markCompleted
  };

  var router = Router(routes);
  router.init();


  var ids; // populate on change
  function refreshData() {
    ids = todos.getIds();

    var html = $("#taskTemplate").html();
    var data = [];

    ids.forEach(function(i,e) {
      var todo = todos.get(i);
      if(typeof todo !== "undefined") { // rS bug #57. removed data should be in .getIds()
        // TODO: can this be circumvented somehow?
        // unsure if it would be cleaner to pass functions to map cases
        var pObj = {
          title: todo.title,
          completed: todo.completed ? "." : "!",
          delUrl: "#/delete/" + i,
          togUrl: "#/toggle/" + i
        };
        data.push(pObj);
      }
    });

    var map = Plates.Map();

    // Map data to template
    map.class('title').to('title');
    map.class('completed').to('completed');
    map.where('data-url').is('delete').use('delUrl').as('href');
    map.where('data-url').is('toggle').use('togUrl').as('href');

    // plate
    var output = Plates.bind(html, data, map);

    // put into dom
    $("#tasks").html(output);
  }



  todos.on('error', function(err) {
    //alert(err);
    console.warn(err);
  });

  todos.on('change', function(id, obj) {
    /*
    console.log('id changed: ' + id);
    console.dir(obj);
    */
    refreshData();
  });

  refreshData();
});
