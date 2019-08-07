// http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
"use strict";

// Optional. You will see this name in eg. 'ps' or 'top' command
process.title = 'node-chat';

// Port where we'll run the websocket server
var webSocketsServerPort = 1337;

var webSocketServer = require('websocket').server;
var http = require('http');

// GLOBALS
var message_history = [];
var clients = [];
var userPositions = [];

function htmlEntities(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// * HTTP server
var server = http.createServer(function (request, response) {
  // Not important for us. We're writing WebSocket server, not HTTP server
});

server.listen(webSocketsServerPort, function () {
  console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});

// * WebSocket server
var wsServer = new webSocketServer({
  httpServer: server
});

// This callback function is called every time someone tries to connect to the WebSocket server
wsServer.on('request', function (request) {
  console.log((new Date()) + ' Connection from origin ' + request.origin + '.');

  // accept connection - you should check 'request.origin' to make sure that client is connecting from your website
  var connection = request.accept(null, request.origin);

  // we need to know client index to remove them on 'close' event
  var index = clients.push(connection) - 1;
  var userName = false;
  var userCharacter = "";


  console.log((new Date()) + ' Connection accepted.');

  if (message_history.length > 0) {
    connection.sendUTF(JSON.stringify({type: 'history', data: message_history}));
  }

  // user sent some message
  connection.on('message', function (message) {
    if (message.type === 'utf8') { // accept only text

      var NewMessage = JSON.parse(message.utf8Data);

      if (NewMessage.type === "join") {
        userName = htmlEntities(NewMessage.userName);
        userCharacter = htmlEntities(NewMessage.userCharacter);

        userPositions[index] = {
          userName: userName,
          userCharacter: userCharacter,
          ActivePlayer: true,
          posX: 500,
          posY: 16,
          posZ: 500,
        };

        connection.sendUTF(JSON.stringify({type: 'new_user', userPosition: userPositions[index]}));

        console.log((new Date()) + ' User is known as: ' + userName + ' with ' + userCharacter + '. At X' + userPositions[index].posX + ", Y: " + userPositions[index].posY + ", Z: " + userPositions[index].posZ);

        var obj = {
          time: (new Date()).getTime(),
          type: "serverMessage",
          message: htmlEntities("User " + userName + " joined conversation."),
        };

        message_history.push(obj);

        // broadcast message to all connected clients
        var json = JSON.stringify({type: 'message', data: obj});
        for (var i = 0; i < clients.length; i++) {
          clients[i].sendUTF(json);
        }

        var json = JSON.stringify({type: 'positions', data: userPositions});
        for (var i = 0; i < clients.length; i++) {
          clients[i].sendUTF(json);
        }
      }

      else if (NewMessage.type === "userPosition") {
        if (typeof userPositions[index] !== "undefined") {
          userPositions[index].posX = parseInt(NewMessage.posX);
          userPositions[index].posY = parseInt(NewMessage.posY);
          userPositions[index].posZ = parseInt(NewMessage.posZ);

          console.log((new Date()) + ' User known as: ' + userName + ' moved to X' + userPositions[index].posX + ", Y: " + userPositions[index].posY + ", Z: " + userPositions[index].posZ);

          for (var i = 0; i < userPositions.length; i++) {
            if (typeof userPositions[i] !== "undefined") {
              if (i === index) {
                userPositions[i].ActivePlayer = true;
              }
              else {
                userPositions[i].ActivePlayer = false;
              }
            }
          }

          var json = JSON.stringify({type: 'positions', data: userPositions});
          for (var i = 0; i < clients.length; i++) {
            clients[i].sendUTF(json);
          }
        }
      }

      else if (NewMessage.type === "textMessage") {
        console.log((new Date()) + ' Received Message from ' + userName + ': ' + NewMessage.message);

        var obj = {
          time: (new Date()).getTime(),
          type: "userMessage",
          message: htmlEntities(NewMessage.message),
          author: userName,
        };

        message_history.push(obj);
        message_history = message_history.slice(-100);

        // broadcast message to all connected clients
        var json = JSON.stringify({type: 'message', data: obj});
        for (var i = 0; i < clients.length; i++) {
          clients[i].sendUTF(json);
        }
      }
    }
  });

  // user disconnected
  connection.on('close', function (connection) {
    if (userName !== false) {
      console.log((new Date()) + " Peer from " + connection.remoteAddress + " with name " + userName + " disconnected.");

      var obj = {
        time: (new Date()).getTime(),
        type: "serverMessage",
        message: htmlEntities("User " + userName + " has left the conversation."),
      };

      message_history.push(obj);

      // broadcast message to all connected clients
      var json = JSON.stringify({type: 'message', data: obj});
      for (var i = 0; i < clients.length; i++) {
        clients[i].sendUTF(json);
      }


      // remove user from the list of connected clients
      // clients.splice(index, 1);
      // userPositions.splice(index, 1);
    }
  });

});