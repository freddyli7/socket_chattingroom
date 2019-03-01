//定义一个chat类，初始化使传入一个socket对象
var Chat = function (socket) {
  this.socket = socket;
};

//定义Chat对象的功能
Chat.prototype.sendMessage = function (room, text) {
  var message = {
    room : room,
    text : text
  };
  this.socket.emit('message', message);
};

Chat.prototype.changeRoom = function (room) {
  this.socket.emit('join', {
    newRoom:room
  });
};

Chat.prototype.processCommand = function (command) {
  var words = command.split(' ');
  var command = words[0].substring(1, words[0].length).toLowerCase();
  var message = false;

  switch(command){
    case 'join':
      words.shift();//remove first item of an array
      var room = words.join(' ');//Join the elements of an array into a string
      this.changeRoom(room);
      break;
    case 'nick':
      words.shift();//remove first item of an array
      var name = words.join(' ');//Join the elements of an array into a string
      this.socket.emit('nameAttempt', name);
      break;
    default:
      message = "unrecognized command";
      break;
  }
  return message;
}
