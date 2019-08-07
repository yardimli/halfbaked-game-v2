"use strict";

var myName = false;

var myPosX = 0;
var myPosY = 0;

var AllPlayers = [];

var multiplier = 2;

var userAnimation_width, userAnimation_height, userAnimation_offset_x, userAnimation_offset_y = 0;
var play_animation = false;
var anim_1;
var preview_current_frame = 0;
var preview_animation_length = 0;
var userAnimation_length = 0;
var current_row = 0;
var userAnimation_row_name = "";
var current_file = "firefox";

var animation_jsons = [];

var animation_images = [];

animation_jsons["firefox"] = {};
animation_jsons["boss"] = {};
animation_jsons["ogre"] = {};
animation_jsons["eye"] = {};
animation_jsons["deathknight"] = {};
animation_jsons["goldenarmor"] = {};
animation_jsons["skeleton2"] = {};
animation_jsons["spectre"] = {};
animation_jsons["redarmor"] = {};
animation_jsons["wizard"] = {};
animation_jsons["leatherarmor"] = {};
animation_jsons["goblin"] = {};
animation_jsons["clotharmor"] = {};

var current_map;

var get_animation_json = {
  init: function (json_file) {
    $.ajax({
      type: "GET",
      url: "sprites/" + json_file + ".json",
      headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
      dataType: 'json',
      success: function (response) {
        animation_jsons[json_file] = response;

        animation_images[json_file] = new Image();
        animation_images[json_file].src = "sprites_img/" + json_file + ".png";
        animation_images[json_file].onload = function () {
          console.log(json_file + " loaded!");
        };

      }
    });
  }
};


function getMousePos(canvas, evt) {
  var rect = canvas.getBoundingClientRect(), // abs. size of element
    scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
    scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y

  return {
    x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
    y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
  }
}


$(document).ready(function () {

  for (var animation in animation_jsons) {
    get_animation_json.init(animation);
  }

  var walk_canvas = document.getElementById("walk_game_canvas");
  var walk_context = walk_canvas.getContext('2d');
  var walk_image = new Image();
  var walk_image_data;
  walk_image.src = "kitchen1_walk.png ";
  walk_image.onload = function () {
    walk_context.drawImage(walk_image, 0, 0, 2324, 1242, 0, 0, 2324 / 1242 * 660, 660);
    walk_image_data = walk_context.getImageData(0, 0, canvas.width, canvas.height);
  };

  var canvas = document.getElementById("game_canvas");
  var context = canvas.getContext('2d');
  var image = new Image();
  image.src = "kitchen1.png ";
  image.onload = function () {
    DrawGameBoard();
  };

  function DrawGameBoard() {
    context.drawImage(image, 0, 0, 2324, 1242, 0, 0, 2324 / 1242 * 660, 660);

    for (var i = 0; i < AllPlayers.length; i++) {

      if (AllPlayers[i] !== null) {

        context.drawImage(animation_images[AllPlayers[i].userCharacter],
          (AllPlayers[i].userWidth * AllPlayers[i].animation_frame),
          (AllPlayers[i].userHeight * AllPlayers[i].animation_row),
          AllPlayers[i].userWidth,
          AllPlayers[i].userHeight,

          AllPlayers[i].posX, AllPlayers[i].posY, AllPlayers[i].userWidth, AllPlayers[i].userHeight);

        AllPlayers[i].animation_frame++;
        if (AllPlayers[i].animation_frame >= AllPlayers[i].animation_length) {
          AllPlayers[i].animation_frame = 0;
        }
      }
    }

  }

  canvas.addEventListener('click', event => {
    let bound = canvas.getBoundingClientRect();

    let x = event.clientX - bound.left - canvas.clientLeft;
    let y = event.clientY - bound.top - canvas.clientTop;

    var p = walk_context.getImageData(x, y, 1, 1).data;
    console.log(p[0], p[1], p[2], p[3]);
//    context.fillRect(x, y, 16, 16);
  });

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
  var connection = new WebSocket('ws://local.elosoft.tw:1337');

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
      DrawGameBoard();
//      DrawUsers(AllPlayers);
    }


    if (json.type === 'message') { // it's a single message
      input.removeAttr('disabled'); // let the user write another message
      addMessage(json.data);
    }

  };


  $('#GameBoard').click(function (e) { //Default mouse Position
    var posX = $(this).position().left,
      posY = $(this).position().top;

    connection.send(JSON.stringify({
      type: "userPosition",
      posX: (e.pageX - posX),
      posY: (e.pageY - posY)
    }));

    console.log((e.pageX - posX) + ' , ' + (e.pageY - posY));
  });

  $("#joinBtn").on("click", function () {
    var msg = $("#input").val();
    if (msg === "") {
      msg = "guest_" + Math.ceil(Math.random() * 1000);
    }
    if (myName === false) {
      connection.send(JSON.stringify({
        type: "join",
        userName: msg,
        userCharacter: current_file,
        userWidth: userAnimation_width,
        userHeight: userAnimation_height,

        animation_row_name: userAnimation_row_name,
        animation_row: current_row,
        animation_length: userAnimation_length,
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

  function CheckWhitePixel(x, y) {
    var p1 = walk_context.getImageData(x, y, 1, 1).data;
    // var p2 = walk_context.getImageData(x + w, y, 1, 1).data;
    // var p3 = walk_context.getImageData(x + w, y + h, 1, 1).data;
    // var p4 = walk_context.getImageData(x, y + h, 1, 1).data;

//    context.fillRect(x, y, w, h);

    console.log(p1);

//    if (p1[0] === 255 && p2[1] === 255 && p3[2] === 255 && p4[0] === 255) {
    if (p1[0] === 255 && p1[1] === 255 && p1[2] === 255) {
      return true;
    }
    return false;
  }

  $(document).keydown(function (e) {
      if (e.keyCode === 37) { //left
        if (CheckWhitePixel(myPosX - 10, myPosY + (userAnimation_height / 2))) {
          myPosX -= 10;
          connection.send(JSON.stringify({
            type: "userPosition",
            animation_row_name: "walk_right",
            animation_length: GetAnimationLength(current_file, "walk_right"),
            animation_row: GetAnimationRow(current_file, "walk_right"),
            posX: myPosX,
            posY: myPosY
          }));
        }
      }
      else if (e.keyCode === 39) { //right
        if (CheckWhitePixel(myPosX + userAnimation_width + 10, myPosY + (userAnimation_height / 2))) {
          myPosX += 10;
          connection.send(JSON.stringify({
            type: "userPosition",
            animation_row_name: "walk_right",
            animation_length: GetAnimationLength(current_file, "walk_right"),
            animation_row: GetAnimationRow(current_file, "walk_right"),
            posX: myPosX,
            posY: myPosY
          }));
        }
      }
      else if (e.keyCode === 38) { //up
        if (CheckWhitePixel(myPosX + (userAnimation_width / 2), myPosY + userAnimation_height - 10)) {
          myPosY -= 10;
          connection.send(JSON.stringify({
            type: "userPosition",
            animation_row_name: "walk_up",
            animation_length: GetAnimationLength(current_file, "walk_up"),
            animation_row: GetAnimationRow(current_file, "walk_up"),
            posX: myPosX,
            posY: myPosY
          }));
        }
      }
      else if (e.keyCode === 40) { //down
        if (CheckWhitePixel(myPosX + (userAnimation_width / 2), myPosY + userAnimation_height + 10)) {
          myPosY += 10;
          connection.send(JSON.stringify({
            type: "userPosition",
            animation_row_name: "walk_down",
            animation_length: GetAnimationLength(current_file, "walk_down"),
            animation_row: GetAnimationRow(current_file, "walk_down"),
            posX: myPosX,
            posY: myPosY
          }));
        }
      }
    }
  );

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

  function GetAnimationLength(CharacterName, AnimationName) {

    var response = animation_jsons[current_file];

    for (var animation in response.animations) {
      if (AnimationName === animation) {
        return response.animations[animation].length;
        exit();
      }
    }
  }

  function GetAnimationRow(CharacterName, AnimationName) {

    var response = animation_jsons[current_file];
    var i
    -1;

    for (var animation in response.animations) {
      i++;
      if (AnimationName === animation) {
        return i;
        exit();
      }
    }
  }


  //-----------------------------------------------
  //-------------------- HTML PREVIEW FOR CHARACTER

  function setCharacter(CharacterName) {
    current_file = CharacterName;
    play_animation = true;

    var response = animation_jsons[current_file];

    userAnimation_width = response.width * multiplier;
    userAnimation_height = response.height * multiplier;
    userAnimation_offset_x = response.offset_x * multiplier;
    userAnimation_offset_y = response.offset_y * multiplier;

    $("#character_1").css("background-image", "url('sprites_img/" + current_file + ".png')");
    $("#character_1").css("width", userAnimation_width);
    $("#character_1").css("height", userAnimation_height);

    $("#drop_down_animations").html("");
    for (var animation in response.animations) {
      console.log(response.animations[animation]);
      $("#drop_down_animations").append('<a class="dropdown-item x_animation" data-length="' + response.animations[animation].length + '"  data-row="' + response.animations[animation].row + '"  data-animation_row_name="' + animation + '" href="#">' + animation + '</a>');
    }

    var firstKey = Object.keys(response.animations)[0];
    userAnimation_row_name = firstKey;
    preview_current_frame = 0;
    preview_animation_length = response.animations[firstKey].length;

    userAnimation_length = response.animations[firstKey].length;
    current_row = response.animations[firstKey].row;

    $(".x_animation").off("click").on("click", function () {
      preview_current_frame = 0;
      userAnimation_row_name = $(this).data("animation_row_name");
      userAnimation_length = $(this).data("length");
      preview_animation_length = response.animations[firstKey].length;
      current_row = $(this).data("row");

      console.log(current_row);
      console.log(userAnimation_length);

      $('#character_1').css('background-position-x', userAnimation_width * 0);
      $('#character_1').css('background-position-y', userAnimation_height * $(this).data("row"));

    });
  }

  setTimeout(function () {
    setCharacter("clotharmor");
  }, 1000);

  $(".x_file").on("click", function () {
    setCharacter($(this).data("name"));
  });

  anim_1 = setInterval(function () {
    if (play_animation) {

      preview_current_frame++;
      if (preview_current_frame >= userAnimation_length) {
        preview_current_frame = 0;
      }

      $('#character_1').css('background-position-x', (userAnimation_width * preview_current_frame) * (-1));
      $('#character_1').css('background-position-y', (userAnimation_height * current_row) * (-1));

    }

    DrawGameBoard();
  }, 200);

});
