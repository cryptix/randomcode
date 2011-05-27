var AppChatController = {
  init: function(options) {
    this.socket = new io.Socket(null, {port: 8000});

    this.userName = options.userName;
    this.hashPass = options.hashPass;

    this.model = new models.AppChatModel({userName: this.userName, hashPass: this.hashPass});
    this.view = new AppChatView({model: this.model, socket: this.socket, el: $('#content')});
    
    var thatView = this.view;
    this.socket.on('message', function(msg) {
        thatView.msgReceived(msg);
    });
    this.socket.connect();


    this.view.render();

    return this;
  }
};
