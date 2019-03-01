var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};//文件内容缓存
var chatServer = require('./lib/chat_server');//socket server

function send404 (response) {
  response.writeHead(404, {'Content-Type' : 'text/plain'});
  response.write('ERROR 404');
  response.end();
}

function sendFile (response, filePath, fileContents) {
  response.writeHead(
    200,
    {'Content-Type': mime.lookup(path.basename(filePath))}//mime:根据静态文件后缀得出文件mime类型
  );
  response.end(fileContents);
}

//向客户端发送静态文件
function serverStaticFile (response, cache, absPath) {
  if (cache[absPath]) {
    sendFile (response, absPath, cache[absPath]);
  } else {
    fs.exists (absPath, function (exists) {
        if (exists) {
          fs.readFile (absPath, function (err, data) {
            if (err) {
              send404(response);
            } else {
              //将文件内容加载到缓存中
              cache[absPath] = data;
              sendFile (response, absPath, data);
            }
          });
        } else {
          send404 (response);
        }
    });
  }
}

//定义http server
var server = http.createServer(function (request, response) {
  //循环向客户端加载需要的静态文件，需要的静态文件在index.html中指定
  //当浏览器第一次请求localhost:3000/时，server将index.html静态文件发送给客户端
  //因为index.html中指定了其他需要的静态文件，所以客户端会再次请求这次静态文件
  var filePath = false;
  if (request.url == '/') {
    filePath = 'public/index.html';
  } else {
    filePath = 'public' + request.url;
  }
  var absPath = './' + filePath;
  serverStaticFile (response, cache, absPath);
})

server.listen(3000, function () {
  //console.log("server listening");
});

//给socket server提供一个已经定义好的http server
//使socket和http能共享同一个tcp/ip端口
chatServer.listen(server);
