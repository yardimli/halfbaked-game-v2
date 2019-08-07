"use strict";

var myName = false;

var myPosX = 0;
var myPosY = 0;
var myPosZ = 0;

var connection;

var AllPlayers = [];

var multiplier = 2;

var userAnimation_width, userAnimation_height, userAnimation_offset_x, userAnimation_offset_y = 0;
var play_animation = false;

var user_character = "character1";

$(document).ready(function () {

  var content = $('#content');
  var input = $('#input');
  var status = $('#status');

  window.WebSocket = window.WebSocket || window.MozWebSocket;

  // if browser doesn't support WebSocket, just show some notification and exit
  if (!window.WebSocket) {
    content.html($('<p>', {text: 'Sorry, but your browser doesn\'t ' + 'support WebSockets.'}));
    input.hide();
    $('span').hide();
    return;
  }

  // open connection
//  var connection = new WebSocket('ws://halfbakedgame.com:1337');
  connection = new WebSocket('ws://local.elosoft.tw:1337');

  connection.onopen = function () {
    // first we want users to enter their names
    input.removeAttr('disabled');
    status.text('Choose name:');
  };

  connection.onerror = function (error) {
    content.html($('<p>', {text: 'Sorry, but there\'s some problem with your ' + 'connection or the server is down.'}));
  };

  //incoming messages
  connection.onmessage = function (message) {
    try {
      var json = JSON.parse(message.data);
    } catch (e) {
      console.log('This doesn\'t look like a valid JSON: ', message.data);
      return;
    }

    console.log(json);

    if (json.type === 'new_user') {
      myPosX = json.userPosition.posX;
      myPosY = json.userPosition.posY;
      myPosZ = json.userPosition.posY;

      createCharacter('./'+json.userPosition.userCharacter+'.png', 25, 35, new THREE.Vector3(myPosX, myPosY, myPosZ), new THREE.Vector3(0, 0, 0));


      status.text(myName + ': ');
      input.removeAttr('disabled').focus();
    }

    if (json.type === 'history') {
      for (var i = 0; i < json.data.length; i++) {
        addMessage(json.data[i]);
      }
    }

    if (json.type === 'positions') {
      AllPlayers = json.data;
//      DrawUsers(AllPlayers);
    }


    if (json.type === 'message') { // it's a single message
      input.removeAttr('disabled'); // let the user write another message
      addMessage(json.data);
    }

  };


    // connection.send(JSON.stringify({
    //   type: "userPosition",
    //   posX: (e.pageX - posX),
    //   posY: (e.pageY - posY)
    // }));


  $("#joinBtn").on("click", function () {
    var msg = $("#input").val();
    if (msg === "") {
      msg = "guest_" + Math.ceil(Math.random() * 1000);
    }
    if (myName === false) {
      connection.send(JSON.stringify({
        type: "join",
        userName: msg,
        userCharacter: user_character,
      }));
      myName = msg;


    }
  });


  input.keydown(function (e) {
    if (e.keyCode === 13) {
      var msg = $(this).val();
      if (!msg) {
        return;
      }

      if (myName === false) {
      }
      else {
        connection.send(JSON.stringify({
          type: "textMessage",
          message: msg
        }));
      }

      $(this).val('');
      input.attr('disabled', 'disabled');

    }
  });

  setInterval(function () {
    if (connection.readyState !== 1) {
      status.text('Error');
      input.attr('disabled', 'disabled').val('Unable to comminucate with the WebSocket server.');
    }
  }, 3000);

  function addMessage(json) {
    var author = json.author;
    var message = json.message;
    var time = new Date(json.time);
    var timeStr = (time.getHours() < 10 ? '0' + time.getHours() : time.getHours()) + ':' + (time.getMinutes() < 10 ? '0' + time.getMinutes() : time.getMinutes());

    if (json.type === "serverMessage") {
      content.prepend('<p><span >' + timeStr + ': ' + message + '<span></p>');
    }

    if (json.type === "userMessage") {
      content.prepend('<p><span>' + timeStr + ": " + author + '</span>: ' + message + '</p>');
    }

  }

  //-----------------------------------------------
  //-------------------- HTML PREVIEW FOR CHARACTER

  $(".x_file").on("click", function () {
    user_character = $(this).data("name");
  });

});
