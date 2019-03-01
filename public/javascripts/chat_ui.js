function divEscapedContentElement(message) {
  return $('<div></div>').text(message);//防止跨域脚本攻击，对所有用户输入转译为纯text形式
}

function divSystemContentElement(message) {
  return $('<div></div>').html('<i>' + message + '</i>');//系统输出视为安全，所以使用html()转译为html形式
}

function processUserInput(chatApp, socket) {
  var message = $('#send-message').val();//val()获得输入框的信息
  var systemMessage;

  //用户命令处理
  if(message.charAt(0) == '/') {
    systemMessage = chatApp.processCommand(message);
    if(systemMessage) {
      $('#message').append(divSystemContentElement(systemMessage));
    }
  } else {
    chatApp.sendMessage($('#room').text(), message);
    $('#messages').append(divEscapedContentElement(message));
    $('#messages').scrollTop($('#messages').prop('scrollHright'));
  }
  $('#send-message').val('');
}

var socket = io.connect();

$(document).ready(function () {
  var chatApp = new Chat(socket);

  socket.on('nameResult', function (result) {//nameResult 在chat_server.js中定义
    var message;
    if(result.success){
      message = "you are now known as  " + result.name;
    } else {
      message = result.message;
    }
    $('#messages').append(divSystemContentElement(message));
  });

  socket.on('joinResult', function (result) {
    $('#room').text(result.room);
    $('#messages').append(divSystemContentElement('room changed'));
  });

  socket.on('message', function (message) {
    var newElement = $('<div></div>').text(message.text);
    $('#messages').append(newElement);
  });

  socket.on('rooms', function (rooms) {
    $('#room-list').empty();
    for(var room in rooms) {
      room = room.substring(1, room.length);
      if(room != '') {
        $('#room-list').append(divEscapedContentElement(room));
      }
    }
    $('#room-list div').click(function () {
      chatApp.processCommand('/join ' + $(this).text());
      $('#send-message').focus();
    });
  });

  // setInterval();//????
  setInterval(function(){
    socket.emit('rooms');
  }, 1000);

  $('#send-message').focus();

  $('#send-form').submit(function () {
    processUserInput(chatApp, socket);
    return false;
  });
});
