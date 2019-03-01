var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

//将listen方法暴露出去
exports.listen = function (server) {
  io = socketio.listen(server);//启动socket服务，允许它搭载在已有到http服务上
  io.set('log level', 1);

  //定义每个用户连接的处理逻辑
  io.sockets.on('connection', function (socket) {
    //给用户分配一个默认的用户名
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
    //加入房间, 首次链接都进入lobby聊天室
    joinRoom(socket, 'Lobby');
    //处理用户发送消息
    handleMessageBroadcasting(socket, nickNames);
    //处理用户改名
    handleNameChangeAttempts(socket, nickNames, namesUsed);
    //处理用户聊天室的创建和变更
    handleRoomJoining(socket);
    //向用户发送已存在的聊天室列表
    socket.on('rooms', function () {
      socket.emit('rooms', io.sockets.manager.rooms);
    });
    //用户断开链接的处理
    handleClientDisconnection(socket, nickNames, namesUsed);
  });
}

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
  var name = "Guest" + guestNumber;
  nickNames[socket.id] = name;//mapping: 一个socketID对应一个用户名
  socket.emit('nameResult', {//socket发送信息，让用户知道他们的用户名
    success: true,
    name : name
  });
  namesUsed.push(name);//用户名被保存到已经使用过的名字列表中
  return guestNumber + 1;
}

//用户进入房间
function joinRoom(socket, room) {
  socket.join(room);//用户进入聊天室
  currentRoom[socket.id] = room;//记录用户当前房间
  socket.emit('joinResult', {room: room});//发送信息告诉用户他当前加入了这个房间
  socket.broadcast.to(room).emit(//让该房间里的其他用户知道有新用户加入了
    'message',
    { text: nickNames[socket.id] + ' has joined ' + room }
  );
  var usersInRoom = io.sockets.clients(room);//获得当前有哪些用户在该房间里
  if(usersInRoom.length > 1) {
    var usersInRoomSummary = "Users currently in " + room + " : ";
    for (var index in usersInRoom) {
      var userSocketId = usersInRoom[index].id;
      if (userSocketId != socket.id) {//排除当前加入的这个用户自己（自己不需要告诉自己）
        if(index > 0) {//如果其他用户多于1个人，
          usersInRoomSummary += ', ';
        }
      usersInRoomSummary += nickNames[userSocketId];
      }
    }
    usersInRoomSummary += '.';
    socket.emit('message', {text : usersInRoomSummary});
  }
}

//用户更名
function handleNameChangeAttempts(socket, nickNames, namesUsed) {
  socket.on('nameAttempt', function (name) {
    if(name.indexOf('Guest') == 0) {//如果新那么以Guest开头，则报错
      socket.emit('nameResult',  {
        success:false,
        message:"name cannot begin with Guest"
      });
    } else {
      if(namesUsed.indexOf(name) == -1) {//新name不在用过的名字列表中
        var previousName = nickNames[socket.id];//先获得旧名字
        var previousNameIndex = namesUsed.indexOf(previousName);//将旧名字在用过的名字列表中的index得到
        namesUsed.push(name);//将新名字加入用过的名字列表中
        nickNames[socket.id] = name;//将新名字替换旧名字，保持socketID不变
        delete namesUsed[previousNameIndex];//在用过的名字列表中删除旧名字
        socket.emit('nameResult', {//给当前用户发送消息：更名成功
          success: true,
          name:name
        });
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {//向房间中所有用户发送更名消息
          text:previousName + ' is now known as ' + name
        });
      } else {//新名字不以Guest开头但是新name在用过的名字列表中
        socket.emit('nameResult', {//向用户发送消息报错
          success : false,
          message : 'that name is already in use'
        });
      }
    }
  });
}

//向该房间里的所有用户发送消息
function handleMessageBroadcasting(socket) {
  socket.on('message', function (message) {
    socket.broadcast.to(message.room).emit('message', {
      text: nickNames[socket.id] + " : " + message.text
    });
  });
}

//加入其他房间或创建新房间
function handleRoomJoining(socket) {
  socket.on('join', function (room) {
    socket.leave(currentRoom[socket.id]);//加入其他房间时离开之前的房间
    joinRoom(socket, room.newRoom);
  });
}

//用户断开
function handleClientDisconnection(socket) {
  socket.on('disconnet', function () {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);//获取用户名的index
    delete namesUsed[nameIndex];//删除用过的用户名
    delete nickNames[socket.id];//删除用户名
  });
}
