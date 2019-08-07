"use strict";

var myName = false;

var myPosX = 0;
var myPosY = 0;

var AllPlayers = [];

var multiplier = 2;

var x_width, x_height, x_offset_x, x_offset_y = 0;
var play_animation = false;
var anim_1;
var current_frame = 0;
var max_frame = 0;
var current_row = 0;
var current_animation_name = "";
var current_file = "firefox";

var animation_jsons = [];

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
      }
    });
  }
};

$(document).ready(function () {

  for (var animation in animation_jsons) {
//    console.log(animation);
    get_animation_json.init(animation);
  }

  var canvas = document.getElementById("game_canvas");
  var context = canvas.getContext('2d');
  var image = new Image();
  image.src = "free_tileset_version_10.png";

  setTimeout(function () {

    $.ajax({
      type: "GET",
      url: "smallkitchen.json",
      headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
      dataType: 'json',
      success: function (response) {
        current_map = response;
        console.log(current_map);

        for (var layer=0; layer<current_map.layers.length; layer++) {

          var tileX = -1;
          for (var y = 0; y < current_map.height; y++) {
            for (var x = 0; x < current_map.width; x++) {
              tileX++;
              var tilePlace = current_map.layers[layer].data[tileX] - 1;
              var tileRow = Math.floor(tilePlace / 15);
              var tileCol = tilePlace % 15;
              console.log(tileRow + " " + tileCol);

              context.drawImage(image, tileCol * 32, tileRow * 32, 32, 32, (x * 32), (y * 32), 32, 32);
            }
          }
        }
      }
    });
  }, 1000);


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
      DrawUsers(AllPlayers);
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
        userWidth: x_width,
        userHeight: x_height,

        animation_row: current_row,
        animation_max_frame: max_frame,
        userAnimation: current_animation_name,
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

  $(document).keydown(function (e) {
      if (e.keyCode === 37) { //left
        //
        myPosX -= 10;
        connection.send(JSON.stringify({
          type: "userPosition",
          posX: myPosX,
          posY: myPosY
        }));
      }
      else if (e.keyCode === 39) { //right
        //
        console.log("right");
        myPosX += 10;
        connection.send(JSON.stringify({
          type: "userPosition",
          posX: myPosX,
          posY: myPosY
        }));
      }
      else if (e.keyCode === 38) { //up
        //
        myPosY -= 10;
        connection.send(JSON.stringify({
          type: "userPosition",
          posX: myPosX,
          posY: myPosY
        }));
      }
      else if (e.keyCode === 40) { //down
        //
        myPosY += 10;
        connection.send(JSON.stringify({
          type: "userPosition",
          posX: myPosX,
          posY: myPosY
        }));
      }
    }
  );

  setInterval(function () {
    if (connection.readyState !== 1) {
      status.text('Error');
      input.attr('disabled', 'disabled').val('Unable to comminucate with the WebSocket server.');
    }
  }, 3000);


  function DrawUsers(AllPlayers) {

//    $("#GameBoard").html("");

    for (var i = 0; i < AllPlayers.length; i++) {
      if (AllPlayers[i] !== null) {
        var this_user = $("#user_" + AllPlayers[i].userName);

        if (this_user.length === 0) {

          $("#GameBoard").append("<div id='user_" + AllPlayers[i].userName + "' " +
            "style='position: absolute; top:" + AllPlayers[i].posY + "px; left:" + AllPlayers[i].posX + "px; " +
            "color:white; padding:3px; text-align: center'><div id='anim_user_" + AllPlayers[i].userName + "'  style='background-image: url(sprites_img/" + AllPlayers[i].userCharacter + ".png); width: " + AllPlayers[i].userWidth + "px;  height: " + AllPlayers[i].userHeight + "px; '></div>" +
            AllPlayers[i].userName + "</div>");

        }
        else {
          this_user.css("top", AllPlayers[i].posY + "px");
          this_user.css("left", AllPlayers[i].posX + "px");
        }
      }
    }
  }

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


  function setCharacter(CharacterName) {
    current_file = CharacterName;

    var response = animation_jsons[current_file];

    x_width = response.width * multiplier;
    x_height = response.height * multiplier;
    x_offset_x = response.offset_x * multiplier;
    x_offset_y = response.offset_y * multiplier;

    $("#character_1").css("background-image", "url('sprites_img/" + current_file + ".png')");
    $("#character_1").css("width", x_width);
    $("#character_1").css("height", x_height);

    $("#drop_down_animations").html("");
    for (var animation in response.animations) {
      console.log(response.animations[animation]);
      $("#drop_down_animations").append('<a class="dropdown-item x_animation" data-length="' + response.animations[animation].length + '"  data-row="' + response.animations[animation].row + '"  data-animation_name="' + animation + '" href="#">' + animation + '</a>');
    }

    var firstKey = Object.keys(response.animations)[0];
    current_animation_name = firstKey;
    current_frame = 0;
    max_frame = response.animations[firstKey].length;
    current_row = response.animations[firstKey].row;
    play_animation = true;

    $(".x_animation").off("click").on("click", function () {
      play_animation = true;
      current_frame = 0;
      current_animation_name = $(this).data("animation_name");
      max_frame = $(this).data("length");
      current_row = $(this).data("row");

      console.log(current_row);
      console.log(max_frame);

      $('#character_1').css('background-position-x', x_width * 0);
      $('#character_1').css('background-position-y', x_height * $(this).data("row"));

    });
  }

  setTimeout(function () {
    setCharacter("clotharmor");
  }, 1000);

  $(".x_file").on("click", function () {
    setCharacter($(this).data("name"));
  });

  anim_1 = setInterval(function () {

    for (var i = 0; i < AllPlayers.length; i++) {

      if (AllPlayers[i] !== null) {
        var this_user = $("#anim_user_" + AllPlayers[i].userName);

        if (this_user.length === 0) {
        }
        else {
          AllPlayers[i].animation_frame++;
          if (AllPlayers[i].animation_frame >= AllPlayers[i].animation_max_frame) {
            AllPlayers[i].animation_frame = 0;
          }
          console.log(AllPlayers[i].animation_frame);

          this_user.css('background-position-x', (AllPlayers[i].userWidth * AllPlayers[i].animation_frame) * (-1));
          this_user.css('background-position-y', (AllPlayers[i].userHeight * AllPlayers[i].animation_row) * (-1));
        }
      }


    }


    if (play_animation) {

      current_frame++;
      if (current_frame >= max_frame) {
        current_frame = 0;
      }
      //     console.log(x_width * current_frame);

      $('#character_1').css('background-position-x', (x_width * current_frame) * (-1));
      $('#character_1').css('background-position-y', (x_height * current_row) * (-1));

    }
  }, 200);

});
