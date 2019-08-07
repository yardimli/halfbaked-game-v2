

var camera, // We need a camera.
  scene, // The camera has to see something.
  renderer, // Render our graphics.
  controls, // Our Orbit Controller for camera magic.
  container; // Our HTML container for the program.

var loader = new THREE.GLTFLoader();

var characterSize = 30;
var outlineSize = characterSize * 0.05;

// Track all objects and collisions.
var objects = [];

var scene_objects = new THREE.Group();

// Track click intersects.
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

// Store movements.
var movements = [];
var playerSpeed = 3;

// Watch for double clicks.
var clickTimer = null;

// The movement destination indicator.
var indicatorTop;
var indicatorBottom;

var collisions = [];
var main_player = null;
var main_player_Texture = null;
var main_player_Anime = null;
var main_player_holdStuff = '';

var other_players = [];

var IgnoreThisClick = false;


var connection = null;

var Timers = [];

$(document).ready(function () {
  init();
  animate();

  $('#characterSelect').on('change', function(e){
    main_player_Anime.changeCharacter(parseInt($(this).val()));
    demoCharacterAnime.changeCharacter(parseInt($(this).val()));
  })

  //Demo Character Animation ------------------------------------------------
  var demoCharacterCanvas = document.getElementById( 'demoCharacterCanvas' );
  var demoCharacterAnime = new CharacterAnime(demoCharacterCanvas, {
    characterId: 1,
    animation: 'frontStand', // Optional, default is 'frontStand'
    speed: 200 // Optional, default is 200
  });
  var totalSupportAnime = demoCharacterAnime.supportAnime.length;
  var curtDemoAnimeKey = 0;
  $('#totalAnime').text(totalSupportAnime);
  $('#curtDemo').text(curtDemoAnimeKey+1);
  $('#preDemo').on('click', function () {
    if(curtDemoAnimeKey > 0){
      curtDemoAnimeKey -- ;
      $('#curtDemo').text(curtDemoAnimeKey+1);
      var animation = demoCharacterAnime.supportAnime[curtDemoAnimeKey].name;
      demoCharacterAnime.setAnimation(animation);
      $('#animeSelect').val(animation);

      main_player_holdStuff = (animation.indexOf('_') === -1) ? '' : animation.substring(animation.indexOf('_'));
      var mainAnime = (main_player_Anime.animation.indexOf('_') === -1) ? main_player_Anime.animation : main_player_Anime.animation.substring(0, main_player_Anime.animation.indexOf('_'))
      main_player_Anime.animation = mainAnime + main_player_holdStuff ;

    }
  })
  $('#nextDemo').on('click', function () {
    if(curtDemoAnimeKey < totalSupportAnime - 1){
      curtDemoAnimeKey ++ ;
      $('#curtDemo').text(curtDemoAnimeKey+1);
      var animation = demoCharacterAnime.supportAnime[curtDemoAnimeKey].name;
      demoCharacterAnime.setAnimation(animation);
      $('#animeSelect').val(animation);

      main_player_holdStuff = (animation.indexOf('_') === -1) ? '' : animation.substring(animation.indexOf('_'));
      var mainAnime = (main_player_Anime.animation.indexOf('_') === -1) ? main_player_Anime.animation : main_player_Anime.animation.substring(0, main_player_Anime.animation.indexOf('_'))
      main_player_Anime.animation = mainAnime + main_player_holdStuff ;

    }
  })

  //Demo Animation Drop Down Select ----------------------------------------
  demoCharacterAnime.supportAnime.forEach(function(anime, i){
    $('#animeSelect').append('<option value="' + anime.name + '" data-animekey="' + i + '">' + anime.name + '</option>')
  })

  $('#animeSelect').on('change', function(e){
    var selectAnime = $(this).val();
    demoCharacterAnime.setAnimation(selectAnime);
    curtDemoAnimeKey = parseInt($('#animeSelect option:selected').data('animekey'));
    $('#curtDemo').text(curtDemoAnimeKey+1);

    main_player_holdStuff = (selectAnime.indexOf('_') === -1) ? '' : selectAnime.substring(selectAnime.indexOf('_'));
    var mainAnime = (main_player_Anime.animation.indexOf('_') === -1) ? main_player_Anime.animation : main_player_Anime.animation.substring(0, main_player_Anime.animation.indexOf('_'))
    main_player_Anime.animation = mainAnime + main_player_holdStuff ;

  })

  //Add Timer Dialog Event--------------------------------------------------------
  $('#timerModal').on('hidden.bs.modal', function (e) {
    $('#addTimerError').html('');
  })

  $('#followPlayer').on('click', function(e){
    if($(this).prop('checked')){
      $('.posInput').prop('readOnly', true);
      $('.rotateInput').prop('readOnly', true);
    }else {
      $('.posInput').prop('readOnly', false);
      $('.rotateInput').prop('readOnly', false);
    }
  })

  $('#addTimerButton').on('click', function(e){

    var timerWidth = 25;
    var timerHeight = 25;
    var isFollowPlayer = $('#followPlayer').prop('checked');

    if(isFollowPlayer){
      for(var i=0; i<Timers.length; i++){
        if(Timers[i].clockTimer.isFollowPlayer){
          $('#addTimerError').html('There is a timer following the main player already.');
          return false;
        }
      }
    }

    if(isFollowPlayer){
      var timerPosition = new THREE.Vector3(main_player.position.x, main_player.position.y+main_player.geometry.parameters.height/2 + timerWidth/2, main_player.position.z)
      var timerRotation = main_player.rotation;
    }else {
      var timerPosition = new THREE.Vector3(parseInt($('#timerPosX').val()), parseInt($('#timerPosY').val()), parseInt($('#timerPosZ').val()));
      var timerRotation = new THREE.Vector3(parseInt($('#timerRotateX').val()), parseInt($('#timerRotateY').val()), parseInt($('#timerRotateZ').val()));
    }

    addTimer(timerWidth, timerHeight, timerPosition, timerRotation, isFollowPlayer);

    $('#timerModal').modal('hide');
  })

});

//------------------------------------------------------------------------------------------------------------------------------------------------
function addTimer(width, height, position, rotation, isFollowPlayer){

  var timerCanvas = document.createElement('canvas');
  timerCanvas.width = width*10; timerCanvas.height = height*10;

  var Timer = new ClockTimer(timerCanvas, {
    time: parseInt($('#timerTime').val()),  //seconds
    direction: parseInt($('input[name=timerMode]:checked').val()),
    speed: parseInt($('#timerSpeed').val()),  //milliseconds
    eraseTimerAtEnd: true,
    startColor: 'rgb(0, 255, 0)',
    middleColor: 'rgb(255, 255, 0)',
    endColor: 'rgb(255, 0, 0)',
    textStyle: '72px Arial',
    textColor: '#000'
  });
  Timer.isFollowPlayer = isFollowPlayer;
  Timer.startTimer();

  var timerTexture = new THREE.Texture(timerCanvas);
  timerTexture.wrapS = THREE.RepeatWrapping;
  timerTexture.wrapT = THREE.RepeatWrapping;

  var material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide, map: timerTexture});
  material.transparent = true;

  var geometry = new THREE.PlaneGeometry(width, height);

  var timerMesh = new THREE.Mesh( geometry, material );
  timerMesh.rotation.set(THREE.Math.degToRad(rotation.x), THREE.Math.degToRad(rotation.y), THREE.Math.degToRad(rotation.z));
  timerMesh.position.x = position.x;
  timerMesh.position.y = position.y;
  timerMesh.position.z = position.z;
  timerMesh.name = 'Timer_' + Timers.length;

  scene.add(timerMesh);

  Timers.push({
    clockTimer: Timer,
    texture: timerTexture,
    mesh: timerMesh
  })
}

//------------------------------------------------------------------------------------------------------------------------------------------------
var HemisphereLight1;
var DirectionalLight1;
var DirectionalLight1Helper;
var PointLight1;
var PointLight1Helper;
var composer, effectFXAA, outlinePassSelected;

var Outline_mouse = new THREE.Vector2();
var Outline_selectedObjects = [];
var Outline_selectedObject_temp;

//------------------------------------------------------------------------------------------------------------------------------------------------
function makeXYZGUI(folder, vector3, onChangeFn) {
  folder.add(vector3, 'x', -500, 500).onChange(onChangeFn);
  folder.add(vector3, 'y', 0, 500).onChange(onChangeFn);
  folder.add(vector3, 'z', -500, 500).onChange(onChangeFn);
  folder.open();
}


//------------------------------------------------------------------------------------------------------------------------------------------------
class ColorGUIHelper {
  constructor(object, prop) {
    this.object = object;
    this.prop = prop;
  }

  get value() {
    return `#${this.object[this.prop].getHexString()}`;
  }

  set value(hexString) {
    this.object[this.prop].set(hexString);
  }
}

//------------------------------------------------------------------------------------------------------------------------------------------------
function updateLight() {
  DirectionalLight1.target.updateMatrixWorld();
  DirectionalLight1Helper.update();
  PointLight1Helper.update();
}

//------------------------------------------------------------------------------------------------------------------------------------------------
function AddLights() {

  const skyColor = 0xB1E1FF;  // light blue
  const groundColor = 0xB97A20;  // brownish orange
  const HemisphereLight_intensity = 1;

  HemisphereLight1 = new THREE.HemisphereLight(skyColor, groundColor, HemisphereLight_intensity);
  scene.add(HemisphereLight1);

  const color = 0xFFFFFF;
  const DirectionalLight_intensity = 1;
  DirectionalLight1 = new THREE.DirectionalLight(color, DirectionalLight_intensity);
  DirectionalLight1.position.set(0, 250, 0);
  DirectionalLight1.target.position.set(-5, 0, 0);
  scene.add(DirectionalLight1);
  scene.add(DirectionalLight1.target);

  DirectionalLight1Helper = new THREE.DirectionalLightHelper(DirectionalLight1);
  scene.add(DirectionalLight1Helper);


  const PointLight1_color = 0xFFFFFF;
  const PointLight1_intensity = 1;
  PointLight1 = new THREE.PointLight(PointLight1_color, PointLight1_intensity, 0, 2);
  PointLight1.position.set(0, 250, 0);
  PointLight1.castShadow = true;
  scene.add(PointLight1);

  PointLight1.shadow.mapSize.width = 512;  // default
  PointLight1.shadow.mapSize.height = 512; // default
  PointLight1.shadow.camera.near = 0.5;       // default
  PointLight1.shadow.camera.far = 1000;      // default

  PointLight1Helper = new THREE.PointLightHelper(PointLight1);
  scene.add(PointLight1Helper);

  updateLight();
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function calculateCollisionPoints(mesh, scale, type = 'collision') {
  // Compute the bounding box after scale, translation, etc.
  var bbox = new THREE.Box3().setFromObject(mesh);

  var bounds = {
    type: type,
    xMin: bbox.min.x,
    xMax: bbox.max.x,
    yMin: bbox.min.y,
    yMax: bbox.max.y,
    zMin: bbox.min.z,
    zMax: bbox.max.z,
  };

  collisions.push(bounds);
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function detectCollisions() {
  if (main_player !== null) {
    // Get the user's current collision area.
    var bounds = {
      xMin: main_player.position.x - main_player.geometry.parameters.width / 2,
      xMax: main_player.position.x + main_player.geometry.parameters.width / 2,
      yMin: main_player.position.y - main_player.geometry.parameters.height / 2,
      yMax: main_player.position.y + main_player.geometry.parameters.height / 2,
      zMin: main_player.position.z - main_player.geometry.parameters.width / 2,
      zMax: main_player.position.z + main_player.geometry.parameters.width / 2,
    };

    // Run through each object and detect if there is a collision.
    for (var index = 0; index < collisions.length; index++) {

      if (collisions[index].type == 'collision') {
        if ((bounds.xMin <= collisions[index].xMax && bounds.xMax >= collisions[index].xMin) &&
          (bounds.yMin <= collisions[index].yMax && bounds.yMax >= collisions[index].yMin) &&
          (bounds.zMin <= collisions[index].zMax && bounds.zMax >= collisions[index].zMin)) {
          // We hit a solid object! Stop all movements.
          // stopMovement();

          // Move the object in the clear. Detect the best direction to move.
          if (bounds.xMin <= collisions[index].xMax && bounds.xMax >= collisions[index].xMin) {
            // Determine center then push out accordingly.
            var objectCenterX = ((collisions[index].xMax - collisions[index].xMin) / 2) + collisions[index].xMin;
            var playerCenterX = ((bounds.xMax - bounds.xMin) / 2) + bounds.xMin;
            var objectCenterZ = ((collisions[index].zMax - collisions[index].zMin) / 2) + collisions[index].zMin;
            var playerCenterZ = ((bounds.zMax - bounds.zMin) / 2) + bounds.zMin;

            // Determine the X axis push.
            if (objectCenterX > playerCenterX) {
              main_player.position.x -= 1;
            }
            else {
              main_player.position.x += 1;
            }
          }
          if (bounds.zMin <= collisions[index].zMax && bounds.zMax >= collisions[index].zMin) {
            // Determine the Z axis push.
            if (objectCenterZ > playerCenterZ) {
              main_player.position.z -= 1;
            }
            else {
              main_player.position.z += 1;
            }
          }
        }
      }
    }
  }
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function createCharacter(width, height, position, rotate) {

  var CharacterCanvas = document.createElement( 'canvas' );
  CharacterCanvas.width = width*100; CharacterCanvas.height = height*100;

  // Draw the character animation --------------------------
  main_player_Anime = new CharacterAnime(CharacterCanvas, {
    characterId: 1,
    animation: 'frontStand', // Optional, default is 'frontStand'
    speed: 200 // Optional, default is 200
  });

  main_player_Texture = new THREE.Texture(CharacterCanvas);
  main_player_Texture.wrapS = THREE.RepeatWrapping;
  main_player_Texture.wrapT = THREE.RepeatWrapping;

  var material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide, map: main_player_Texture});
  material.transparent = true;

  var geometry = new THREE.PlaneGeometry(width, height);

  main_player = new THREE.Mesh( geometry, material );

  main_player.rotation.set(THREE.Math.degToRad(rotate.x), THREE.Math.degToRad(rotate.y), THREE.Math.degToRad(rotate.z));

  main_player.position.x = position.x;				    //Position (x = right+ left-)
  main_player.position.y = position.y;				    //Position (y = up+, down-)
  main_player.position.z = position.z;				    //Position (z = front +, back-)

  main_player.name = "main_player";

  scene.add(main_player);
}

//------------------------------------------------------------------------------------------------------------------------------------------------
function loadGLTF(name, model_file, position, scale, rotate, collidable, can_move, load_from_scene) {
  loader.load(model_file, function (gltf) {             // <<--------- Model Path
    var object = gltf.scene;

//    gltf.geometry.center();


    if (collidable) {
      calculateCollisionPoints(gltf.scene);
    }

    const root = gltf.scene;

    var mS = (new THREE.Matrix4()).identity();
    //set -1 to the corresponding axis
    mS.elements[0] = -1;
    //mS.elements[5] = -1;
    //mS.elements[10] = -1;

    // root.applyMatrix(mS);


    root.userData.canMove = can_move;
    root.userData.collision = true;
    root.userData.name = name;
    root.userData.filePath = model_file;

    Outline_selectedObject_temp = root;

    var AssignNameToFirst = true;
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.scale.set(scale.x, scale.y, scale.z);
        obj.geometry.center();

        var box = new THREE.Box3().setFromObject(obj);
        var boxsize = new THREE.Vector3();
        box.getSize(boxsize);

        obj.position.x = position.x;				    //Position (x = right+ left-)
        if (load_from_scene) {
          obj.position.y = position.y;
        }
        else {
          obj.position.y = position.y + ((Math.round(boxsize.y * 10000) / 10000) / 2);				    //Position (y = up+, down-)
        }
        obj.position.z = position.z;				    //Position (z = front +, back-)

        if (rotate !== null) {
          if (load_from_scene) {
            obj.rotation.x = rotate.x;
            obj.rotation.y = rotate.y;
            obj.rotation.z = rotate.z;
          }
          else {
            obj.rotation.x = THREE.Math.degToRad(rotate.x);
            obj.rotation.y = THREE.Math.degToRad(rotate.y);
            obj.rotation.z = THREE.Math.degToRad(rotate.z);
          }
        }

        Outline_addSelectedObject(obj, root);
        SelectObject();
      }

      if (obj.type === "Scene") {
        // if (obj.userData !== undefined) {
        //   if (AssignNameToFirst) {
        // console.log("!!!!!!!!!!!!!!");
        // console.log(name);
        // console.log(obj.uuid);
        AssignNameToFirst = false;
        // }
        // }
      }

      if (obj.castShadow !== undefined) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    logOnce = 1;
    scene_objects.add(gltf.scene);


    $("#all_objects").find('option').remove();
    for (var i = 0; i < scene_objects.children.length; i++) {
      $("#all_objects").append('<option value="' + scene_objects.children[i].id + '" data-userdata_name="' + scene_objects.children[i].userData.name + '" >' + scene_objects.children[i].userData.name + "(" + scene_objects.children[i].id + ")" + '</option>');
    }
    SelectObject();


//    console.log(gltf.scene);

  });
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function createFloor() {


  var geometry = new THREE.Geometry();
  geometry.vertices.push(new THREE.Vector3(-1500, 0, 0));
  geometry.vertices.push(new THREE.Vector3(1500, 0, 0));

  linesMaterial = new THREE.LineBasicMaterial({color: 0x787878, opacity: .2, linewidth: .1});

  for (var i = 0; i <= 60; i++) {

    var line = new THREE.Line(geometry, linesMaterial);
    line.position.z = (i * 50) - 1500;
    scene.add(line);

    var line = new THREE.Line(geometry, linesMaterial);
    line.position.x = (i * 50) - 1500;
    line.rotation.y = 90 * Math.PI / 180;
    scene.add(line);
  }

  var geo = new THREE.PlaneBufferGeometry(20000, 20000, 8, 8);
  var mat = new THREE.MeshBasicMaterial({color: 0xffffff, opacity: 0, wireframe: false});
  mat.transparent = true;
  var plane = new THREE.Mesh(geo, mat);
  plane.position.y = -1;
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  plane.name = "plane";

  scene.add(plane);
  objects.push(plane);
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function drawIndicator() {
  // Store variables.
  var topSize = 2;
  var bottomRadius = 3;

  // Create the top indicator.
  var geometry = new THREE.TetrahedronGeometry(topSize, 0);
  var material = new THREE.MeshToonMaterial({color: 0x00ccff, emissive: 0x00ccff});
  indicatorTop = new THREE.Mesh(geometry, material);
  indicatorTop.position.y = 50; // Flat surface so hardcode Y position for now.
  indicatorTop.position.x = movements[0].x; // Get the X destination.
  indicatorTop.position.z = movements[0].z; // Get the Z destination.
  indicatorTop.rotation.x = -0.97;
  indicatorTop.rotation.y = Math.PI / 4;
  indicatorTop.name = 'indicator_top';
  scene.add(indicatorTop);

  // Create the top indicator outline.
  var geometry = new THREE.TetrahedronGeometry(topSize + outlineSize, 0);
  var material = new THREE.MeshBasicMaterial({color: 0x0000000, side: THREE.BackSide});
  var outlineTop = new THREE.Mesh(geometry, material);
  indicatorTop.add(outlineTop);

  // Create the bottom indicator.
  var geometry = new THREE.TorusGeometry(bottomRadius, (bottomRadius * 0.25), 2, 12);
  geometry.dynamic = true;
  var material = new THREE.MeshToonMaterial({color: 0x00ccff, emissive: 0x00ccff});
  indicatorBottom = new THREE.Mesh(geometry, material);
  indicatorBottom.position.y = 3;
  indicatorBottom.position.x = movements[0].x;
  indicatorBottom.position.z = movements[0].z;
  indicatorBottom.rotation.x = -Math.PI / 2;
  indicatorBottom.name = 'indicator_bottom';
  scene.add(indicatorBottom);

  // Create the bottom outline.
  var geometry = new THREE.TorusGeometry(bottomRadius + outlineSize / 10, bottomRadius / 2.5, 2, 24);
  var material = new THREE.MeshBasicMaterial({color: 0x0000000, side: THREE.BackSide});
  var outlineBottom = new THREE.Mesh(geometry, material);
  outlineBottom.position.z = -2;
  outlineBottom.name = 'outlineBottom';
  indicatorBottom.add(outlineBottom);
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function onDocumentMouseDown(event, bypass = false) {
  event.preventDefault();
  stopMovement();
  // Grab the coordinates.
  mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

  // Use the raycaster to detect intersections.
  raycaster.setFromCamera(mouse, camera);

  // Grab all objects that can be intersected.
  var intersects = raycaster.intersectObjects(objects);
  if (intersects.length > 0) {

    if (connection !== null) {
      connection.send(JSON.stringify({
        type: "userPosition",
        posX: intersects[0].point.x,
        posY: intersects[0].point.y,
        posZ: intersects[0].point.z
      }));
    }

    movements.push(intersects[0].point);
  }
}

function changeMainCharacterAnime() {

  var direction = new THREE.Vector3(movements[0].x - main_player.position.x, 0, movements[0].z - main_player.position.z);
  var angle = direction.angleTo(new THREE.Vector3(1, 0, 0)) * (180/Math.PI) ;

  if(direction.z > 0){
    if(angle < 45){
      console.log('go right')
      main_player_Anime.setAnimation('rightWalk' + main_player_holdStuff);
    }else if(angle >= 45 && angle <= 135){
      console.log('go front')
      main_player_Anime.setAnimation('frontWalk' + main_player_holdStuff);
    }else {
      console.log('go left')
      main_player_Anime.setAnimation('leftWalk' + main_player_holdStuff);
    }
  }else {
    if(angle < 45){
      console.log('go right')
      main_player_Anime.setAnimation('rightWalk' + main_player_holdStuff);
    }else if(angle >= 45 && angle <= 135){
      console.log('go back')
      main_player_Anime.setAnimation('backWalk' + main_player_holdStuff);
    }else {
      console.log('go left')
      main_player_Anime.setAnimation('leftWalk' + main_player_holdStuff);
    }
  }

}


//------------------------------------------------------------------------------------------------------------------------------------------------
function stopMovement() {
  movements = [];

  scene.remove(indicatorTop);
  scene.remove(indicatorBottom);
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function move(location, destination, speed = playerSpeed) {
  var moveDistance = speed;

  // Translate over to the position.
  var posX = location.position.x;
  var posZ = location.position.z;
  var newPosX = destination.x;
  var newPosZ = destination.z;

  // Set a multiplier just in case we need negative values.
  var multiplierX = 1;
  var multiplierZ = 1;

  // Detect the distance between the current pos and target.
  var diffX = Math.abs(posX - newPosX);
  var diffZ = Math.abs(posZ - newPosZ);
  var distance = Math.sqrt(diffX * diffX + diffZ * diffZ);

  // Use negative multipliers if necessary.
  if (posX > newPosX) {
    multiplierX = -1;
  }

  if (posZ > newPosZ) {
    multiplierZ = -1;
  }

  // Update the main position.
  location.position.x = location.position.x + (moveDistance * (diffX / distance)) * multiplierX;
  location.position.z = location.position.z + (moveDistance * (diffZ / distance)) * multiplierZ;

  // If the position is close we can call the movement complete.
  if ((Math.floor(location.position.x) <= Math.floor(newPosX) + 2.5 &&
    Math.floor(location.position.x) >= Math.floor(newPosX) - 2.5) &&
    (Math.floor(location.position.z) <= Math.floor(newPosZ) + 2.5 &&
      Math.floor(location.position.z) >= Math.floor(newPosZ) - 2.5)) {
    location.position.x = Math.floor(location.position.x);
    location.position.z = Math.floor(location.position.z);

    // Reset any movements.
    console.log("stop move");
    if(main_player_Anime.animation === 'frontWalk' + main_player_holdStuff){
      main_player_Anime.setAnimation('frontStand' + main_player_holdStuff)
    }else if(main_player_Anime.animation === 'backWalk' + main_player_holdStuff){
      main_player_Anime.setAnimation('backStand' + main_player_holdStuff)
    }else if(main_player_Anime.animation === 'rightWalk' + main_player_holdStuff){
      main_player_Anime.setAnimation('rightStand' + main_player_holdStuff)
    }else if(main_player_Anime.animation === 'leftWalk' + main_player_holdStuff){
      main_player_Anime.setAnimation('leftStand' + main_player_holdStuff)
    }
    stopMovement();

    // Maybe move should return a boolean. True if completed, false if not.
  }
}

//------------------------------------------------------------------------------------------------------------------------------------------------
function Outline_addSelectedObject(object, parent) {
  Outline_selectedObjects = [];

  // console.log(parent);
  // console.log(parent.userData);

  if (parent.userData.canMove !== "fixed") {
    Outline_selectedObjects.push(object);
  }
}

//------------------------------------------------------------------------------------------------------------------------------------------------
function Outline_checkIntersection(event) {

  var x, y;
  if (event.changedTouches) {
    x = event.changedTouches[0].pageX;
    y = event.changedTouches[0].pageY;
  }
  else {
    x = event.clientX;
    y = event.clientY;
  }
  Outline_mouse.x = (x / (window.innerWidth - 250)) * 2 - 1;
  Outline_mouse.y = -(y / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(Outline_mouse, camera);
  var intersects = raycaster.intersectObjects(scene_objects.children, true);
  if (intersects.length > 0) {

    if (intersects[0].object.parent.isScene) {
      Outline_selectedObject_temp = intersects[0].object.parent;
    }
    else if (intersects[0].object.parent.parent.isScene) {
      Outline_selectedObject_temp = intersects[0].object.parent.parent;
    }
    else if (intersects[0].object.parent.parent.parent.isScene) {
      Outline_selectedObject_temp = intersects[0].object.parent.parent.parent;
    }
    else if (intersects[0].object.parent.parent.parent.parent.isScene) {
      Outline_selectedObject_temp = intersects[0].object.parent.parent.parent.parent;
    }
    else if (intersects[0].object.parent.parent.parent.parent.parent.isScene) {
      Outline_selectedObject_temp = intersects[0].object.parent.parent.parent.parent.parent;
    }


    // console.log("--------------");
    // console.log(intersects);
    // console.log(Outline_selectedObject_temp);
    Outline_addSelectedObject(intersects[0].object, Outline_selectedObject_temp);
  }
  else {
    // console.log("set selected object to null");
    Outline_selectedObject_temp = null;
    Outline_selectedObjects = [];
  }
}


function radians_to_degrees(radians) {
  var pi = Math.PI;
  return radians * (180 / pi);
}

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi / 180);
}

function fitCameraToSelection(camera, controls, selection, fitOffset = 1.2) {

  const box = new THREE.Box3();

  for (const object of selection) box.expandByObject(object);

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxSize = Math.max(size.x, size.y, size.z);
  const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * camera.fov / 360));
  const fitWidthDistance = fitHeightDistance / camera.aspect;
  const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);

  const direction = controls.target.clone()
    .sub(camera.position)
    .normalize()
    .multiplyScalar(distance);

//  controls.maxDistance = distance * 10;
  controls.target.copy(center);

  camera.near = distance / 100;
  camera.far = distance * 100;
  camera.updateProjectionMatrix();

  camera.position.copy(controls.target).sub(direction);

  controls.update();
}



function SelectObject() {
  if (Outline_selectedObject_temp !== null) {
    outlinePassSelected.selectedObjects = [];
    outlinePassSelected.selectedObjects = [Outline_selectedObject_temp];

    console.log("select object");
  }
  else {
    outlinePassSelected.selectedObjects = [];
  }
}

//------------------------------------------------------------------------------------------------------------------------------------------------
function init() {
  // Build the container
  container = $("#GameContainer");

  var width = window.innerWidth - 250;
  var height = window.innerHeight;

  renderer = new THREE.WebGLRenderer(); //{antialias: true}
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.gammaInput = true;
  renderer.gammaOutput = true;
//  renderer.gammaFactor = 3.2;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);

  container.append(renderer.domElement);

  // Create the scene.
  scene = new THREE.Scene();

  scene.background = new THREE.Color(0xcccccc);
  scene.fog = new THREE.Fog(0xcccccc, 500, 10000);
  // scene.add(new THREE.AmbientLight(0x666666));


  const fov = 45;
  const aspect = (window.innerWidth - 250) / window.innerHeight; //2;  // the canvas default
  const near = 1; //1
  const far = 10000; //200000
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(300, 75, 600);
//  camera.lookAt(1500,200,500);
//    main_player.add(camera);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  controls.rotateSpeed = 0.05;

//  controls.maxPolarAngle = Math.PI * 0.5; //limit so cant go bellow surface
  controls.enablePan = true;
  controls.panSpeed = 0.3;
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = true;
  controls.zoomSpeed = 0.6;
  controls.enableKeys = false;

  controls.target = new THREE.Vector3(300, 2, 0);

  controls.update();

  AddLights();

  //skybox
  if (1 == 2) {
    var urls = ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'];
    var loaderCube = new THREE.CubeTextureLoader().setPath('./threejs/examples/textures/cube/skyboxsun25deg/');
    loaderCube.load(urls, function (texture) {
      scene.background = texture;
    });
  }


  createCharacter(27, 40, new THREE.Vector3(0, 27, 155), new THREE.Vector3(0, 0, 0));

  createFloor();

  scene.add(scene_objects);


  // postprocessing
  composer = new THREE.EffectComposer(renderer);

  var renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);

  outlinePassSelected = new THREE.OutlinePass(new THREE.Vector2((window.innerWidth - 250), window.innerHeight), scene, camera);
  composer.addPass(outlinePassSelected);

  outlinePassSelected.edgeStrength = 1;
  outlinePassSelected.edgeGlow = 0.5;
  outlinePassSelected.edgeThickness = 1.0;
  outlinePassSelected.pulsePeriod = 2;
  outlinePassSelected.usePatternTexture = false;
  outlinePassSelected.visibleEdgeColor.set('#00ffff');
  outlinePassSelected.hiddenEdgeColor.set('#190a05');


  window.addEventListener('resize', onWindowResize, false);

  $(document).dblclick(function (event) {
    if (event.target.nodeName === "CANVAS") {
      onDocumentMouseDown(event);
      changeMainCharacterAnime();
      if (outlinePassSelected.selectedObjects.length > 0) {

        if (Outline_selectedObject_temp !== null) {
          if (Outline_selectedObject_temp.userData.canMove !== "fixed") {

            fitCameraToSelection(camera, controls, outlinePassSelected.selectedObjects, 1.2);
          }
        }
      }
    }
  });

  $("#load_scene_dialog_button").on('click', function (e) {
    $("#loadSceneModal").modal("show");

    var UrlToGet = "load_scenes.php";
    var data = {};
    $("#scene_list").html("");

    $.ajax({
      url: UrlToGet,
      data: data,
      dataType: "json",
      success: function (data, status) {
        for (scene_file in data) {
          $("#scene_list").append('<li><a href="#" class="load_scene" data-scene_name="' + data[scene_file] + '">' + data[scene_file] + '</a></li>\n');
        }

        $(".load_scene").off('click').on('click', function () {

          var UrlToGet = "load_scene.php";
          var data = {"scene_name": $(this).data("scene_name")};

          $.ajax({
            url: UrlToGet,
            data: data,
            dataType: "json",
            success: function (data, status) {
              console.log(data);

              $("#loadSceneModal").modal("hide");

              for (var i = scene_objects.children.length - 1; i >= 0; i--) {
                scene_objects.remove(scene_objects.children[i]);
              }

              for (var i = 0; i < data.length; i++) {

                loadGLTF(data[i].userName, data[i].filePath, new THREE.Vector3(data[i].position.x, data[i].position.y, data[i].position.z), new THREE.Vector3(data[i].scale.x, data[i].scale.y, data[i].scale.z), new THREE.Vector3(data[i].rotation._x, data[i].rotation._y, data[i].rotation._z), data[i].collision, data[i].canMove, true);


              }

              console.log("Status: " + status);
            },
            error: function (data, status) {
              console.log("error Status: " + status);
              alert("error " + status);
            }

          });

        });

        $("#loadSceneModal").modal("show");
        console.log("Status: " + status);
      },
      error: function (data, status) {
        console.log("error Status: " + status);
        alert("error " + status);
      }
    });

    e.preventDefault();
  });




  $(document).click(function (event) {
    if (event.target.nodeName === "CANVAS") {
      if (!IgnoreThisClick) {
        Outline_checkIntersection(event);
        SelectObject();
      }
      IgnoreThisClick = false;
    }
  });


}


//------------------------------------------------------------------------------------------------------------------------------------------------
function onWindowResize() {

  var width = window.innerWidth - 250;
  var height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);

//  effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );

}

//------------------------------------------------------------------------------------------------------------------------------------------------

var WindMillRotation = 0;
var logOnce = 1;


//------------------------------------------------------------------------------------------------------------------------------------------------
function update() {
//  camera.updateProjectionMatrix();
  controls.update();

  if (main_player !== null) {
    main_player.lookAt(camera.position);
//  main_player.quaternion.copy(camera.quaternion);
  }
}

//------------------------------------------------------------------------------------------------------------------------------------------------
function render() {
//  renderer.render(scene, camera);
  composer.render();

  if (1 == 1) {
    scene.traverse(function (node) {
      if (node instanceof THREE.Mesh) {
        if (logOnce > 0) {
          console.log("---------------------");
          console.log(node);
          console.log(node.userData);
        }

        if (node.userData.name === "SF_Bld_House_Windmill_01") {
          WindMillRotation = WindMillRotation + 1;
          node.rotation.y = THREE.Math.degToRad(WindMillRotation);
        }
      }
    });

    logOnce--;

  }

  //If main player animation needs update, tell three.js updates the texture.
  if(main_player_Anime.needsUpdateFrame){
    main_player_Texture.needsUpdate = true;
    main_player_Anime.needsUpdateFrame = false;
  }

  //Update Clock Timer Object Frame, Position or Remove it after time's up
  Timers.forEach(function(timer ,i){
    var clockTimer = timer.clockTimer;
    var clockTexture = timer.texture;
    var clockMesh = timer.mesh;
    if(clockTimer.needsUpdateFrame){
      clockTexture.needsUpdate = true;
      clockTimer.needsUpdateFrame = false;
    }
    if(clockTimer.isFollowPlayer){
      clockMesh.position.x = main_player.position.x;
      clockMesh.position.y = main_player.position.y+main_player.geometry.parameters.height/2 + clockMesh.geometry.parameters.height/2;
      clockMesh.position.z = main_player.position.z;
    }
    if(clockTimer.status === 'stop'){
      scene.remove(scene.getObjectByName(clockMesh.name));
      Timers.splice(i, 1);
    }
  })


  // If any movement was added, run it!
  if (movements.length > 0) {
    // Set an indicator point to destination.
    if (scene.getObjectByName('indicator_top') === undefined) {
      drawIndicator();
    }
    else {
      if (indicatorTop.position.y > 2) {
        indicatorTop.position.y -= 2;
      }
      else {
        indicatorTop.position.y = 50;
      }
    }

    //Move after character anime is changed and ready.
    if(main_player_Anime.isAnimeReady){
      move(main_player, movements[0]);
    }
  }

  // Detect collisions.
  if (collisions.length > 0) {
    detectCollisions();
  }

}

//------------------------------------------------------------------------------------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  update();
  render();
}
