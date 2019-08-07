var camera, // We need a camera.
  scene, // The camera has to see something.
  renderer, // Render our graphics.
  controls, // Our Orbit Controller for camera magic.
  transform_controls,
  container, // Our HTML container for the program.
  rotationPoint;  // The point in which our camera will rotate around.

var loader = new THREE.GLTFLoader();
var loaderTexture = new THREE.TextureLoader();

var characterSize = 30;
var outlineSize = characterSize * 0.05;

// Track all objects and collisions.
var objects = [];
var drag_objects = [];
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

var other_players = [];

$(document).ready(function () {
  init();
  animate();
});


//------------------------------------------------------------------------------------------------------------------------------------------------
var HemisphereLight1;
var DirectionalLight1;
var DirectionalLight1Helper;
var PointLight1;
var PointLight1Helper;
var composer, effectFXAA, outlinePass;

var Outline_mouse = new THREE.Vector2();
var Outline_selectedObjects = [];
var Outline_selectedObjects_temp;
var Outline_selectedObjects_temp2;

var Edit_SelectedObject = new THREE.Vector3();

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

  if (1 == 2) {
    //light controls
    const gui = new dat.GUI();
    var folder = gui.addFolder("Lights");

    var person = {name: 'Hemisphere Light'};
    folder.add(person, 'name');

    folder.add(HemisphereLight1, 'intensity', 0, 2, 0.01);

    folder.addColor(new ColorGUIHelper(HemisphereLight1, 'color'), 'value').name('skyColor');
    folder.addColor(new ColorGUIHelper(HemisphereLight1, 'groundColor'), 'value').name('groundColor');

    var person = {name: 'Directional Light'};
    folder.add(person, 'name');

    folder.addColor(new ColorGUIHelper(DirectionalLight1, 'color'), 'value').name('color');
    folder.add(DirectionalLight1, 'intensity', 0, 2, 0.01);

    var person = {name: 'Directional Light Position'};
    folder.add(person, 'name');

    makeXYZGUI(folder, DirectionalLight1.position, updateLight);

    var person = {name: 'Directional Light Target'};
    folder.add(person, 'name');

    makeXYZGUI(folder, DirectionalLight1.target.position, updateLight);

    var person = {name: 'Point Light'};
    folder.add(person, 'name');

    folder.addColor(new ColorGUIHelper(PointLight1, 'color'), 'value').name('color');
    folder.add(PointLight1, 'intensity', 0, 2, 0.01);
    makeXYZGUI(gui, PointLight1.position, updateLight);

    gui.close();
  }

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
          stopMovement();

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
function createOtherCharacter(name, model_file, width, height, position, rotate, collidable) {

  var geometry = new THREE.PlaneGeometry(width, height, 2);
  var texture = new THREE.TextureLoader().load(model_file);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  var material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide, map: texture});
  material.transparent = true;

  var new_player = new THREE.Mesh(geometry, material);

  new_player.rotation.set(THREE.Math.degToRad(rotate.x), THREE.Math.degToRad(rotate.y), THREE.Math.degToRad(rotate.z));

  new_player.position.x = position.x;				    //Position (x = right+ left-)
  new_player.position.y = position.y;				    //Position (y = up+, down-)
  new_player.position.z = position.z;				    //Position (z = front +, back-)

  if (collidable) {
    calculateCollisionPoints(new_player);
  }

//  other_players.push({xname:name, mesh:new_player});

  new_player.name = name;

  scene.add(new_player);
//    rotationPoint.add(main_player);

}


//------------------------------------------------------------------------------------------------------------------------------------------------
function createCharacter(model_file, width, height, position, rotate) {
  // var geometry = new THREE.BoxBufferGeometry(characterSize, characterSize, characterSize);

  var geometry = new THREE.PlaneGeometry(width, height, 2);
  var texture = new THREE.TextureLoader().load(model_file);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  var material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide, map: texture});
  material.transparent = true;


  main_player = new THREE.Mesh(geometry, material);

  main_player.rotation.set(THREE.Math.degToRad(rotate.x), THREE.Math.degToRad(rotate.y), THREE.Math.degToRad(rotate.z));

  main_player.position.x = position.x;				    //Position (x = right+ left-)
  main_player.position.y = position.y;				    //Position (y = up+, down-)
  main_player.position.z = position.z;				    //Position (z = front +, back-)

  main_player.name = "main_player";

//  rotationPoint.position.set(position.x, position.y, position.z);

  scene.add(main_player);
  //rotationPoint.add(main_player);
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function loadGLTF(name, model_file, position, scale, rotate, collidable) {
  loader.load(model_file, function (gltf) {             // <<--------- Model Path
    var object = gltf.scene;
    gltf.scene.scale.set(scale.x, scale.y, scale.z);

    gltf.scene.rotation.set(THREE.Math.degToRad(rotate.x), THREE.Math.degToRad(rotate.y), THREE.Math.degToRad(rotate.z));

    gltf.scene.position.x = position.x;				    //Position (x = right+ left-)
    gltf.scene.position.y = position.y;				    //Position (y = up+, down-)
    gltf.scene.position.z = position.z;				    //Position (z = front +, back-)

    scene.add(gltf.scene);

    if (collidable) {
      calculateCollisionPoints(gltf.scene);
    }


    const root = gltf.scene;

//    console.log("scan :" + name);
    var AssignNameToFirst = true;
    root.traverse((obj) => {
      if (obj.isMesh && collidable) {
        drag_objects.push(obj);
      }

      if (obj.type === "Scene") {
        // if (obj.userData !== undefined) {
        //   if (AssignNameToFirst) {
        // console.log("!!!!!!!!!!!!!!");
        // console.log(name);
        // console.log(obj.uuid);
        obj.userData.object_name = name;
        AssignNameToFirst = false;
        // }
        // }
      }

      if (obj.castShadow !== undefined) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

//    console.log(gltf.scene);

  });
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function createFloor() {
  //ground
  // var groundTexture = loaderTexture.load('./threejs/examples/textures/terrain/backgrounddetailed6.jpg');
  // groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  // groundTexture.repeat.set(100, 100);
  // groundTexture.anisotropy = 16;
  // var groundMaterial = new THREE.MeshLambertMaterial({map: groundTexture});
  // var plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(20000, 20000), groundMaterial);
  // plane.position.y = -1;
  // plane.rotation.x = -Math.PI / 2;
  // plane.receiveShadow = true;
  // plane.name = "plane";
  //
  // scene.add(plane);
  // objects.push(plane);


  var geo = new THREE.PlaneBufferGeometry(20000, 20000, 8, 8);
  var mat = new THREE.MeshBasicMaterial({color: 0x5A6450});
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

    connection.send(JSON.stringify({
      type: "userPosition",
      posX: intersects[0].point.x,
      posY: intersects[0].point.y,
      posZ: intersects[0].point.z
    }));

    movements.push(intersects[0].point);
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
    stopMovement();

    // Maybe move should return a boolean. True if completed, false if not.
  }
}

//------------------------------------------------------------------------------------------------------------------------------------------------
function Outline_addSelectedObject(object) {
  Outline_selectedObjects = [];
  Outline_selectedObjects.push(object);
}

//------------------------------------------------------------------------------------------------------------------------------------------------
function Outline_checkIntersection() {
  raycaster.setFromCamera(Outline_mouse, camera);
  var intersects = raycaster.intersectObjects(drag_objects, true);
  if (intersects.length > 0) {

    Outline_selectedObjects_temp = intersects[0].object;
    Outline_addSelectedObject(Outline_selectedObjects_temp);
    outlinePass.selectedObjects = Outline_selectedObjects;

    Edit_SelectedObject = Outline_selectedObjects_temp.position;

  }
  else {
    Outline_selectedObjects_temp = null;
    // outlinePass.selectedObjects = [];
  }
//  console.log(Outline_selectedObjects);
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function Outline_onTouchMove(event) {

  var x, y;
  if (event.changedTouches) {
    x = event.changedTouches[0].pageX;
    y = event.changedTouches[0].pageY;
  }
  else {
    x = event.clientX;
    y = event.clientY;
  }
  Outline_mouse.x = (x / window.innerWidth) * 2 - 1;
  Outline_mouse.y = -(y / window.innerHeight) * 2 + 1;
  Outline_checkIntersection();
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function init() {
  // Build the container
  container = document.createElement('div');
  document.body.appendChild(container);

  var width = window.innerWidth;
  var height = window.innerHeight;

  renderer = new THREE.WebGLRenderer(); //{antialias: true}
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.gammaInput = true;
  renderer.gammaOutput = true;
//  renderer.gammaFactor = 3.2;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);

  container.appendChild(renderer.domElement);

  // Create the scene.
  scene = new THREE.Scene();

  scene.background = new THREE.Color(0xcce0ff);
  scene.fog = new THREE.Fog(0xcce0ff, 500, 10000);
  // scene.add(new THREE.AmbientLight(0x666666));


  const fov = 45;
  const aspect = window.innerWidth / window.innerHeight; //2;  // the canvas default
  const near = 1; //1
  const far = 10000; //200000
  camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(300, 75, 600);
//  camera.lookAt(1500,200,500);
//  camera.position.set(0, 100, 800);
  //    main_player.add(camera);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.maxDistance = 5000; // Set our max zoom out distance (mouse scroll)
  controls.minDistance = 300; // Set our min zoom in distance (mouse scroll)

  controls.maxPolarAngle = Math.PI * 0.5;
  controls.enablePan = true;
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = true;
  controls.target = new THREE.Vector3(300, 2, 0);

  controls.update();
//    controls.target.copy(new THREE.Vector3(0, 0, 0));
//    controls.target.copy(new THREE.Vector3(0, characterSize / 2, 0));


  AddLights();

  //skybox
  var urls = ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'];
  var loaderCube = new THREE.CubeTextureLoader().setPath('./threejs/examples/textures/cube/skyboxsun25deg/');
  loaderCube.load(urls, function (texture) {
    scene.background = texture;
  });


  // Create a rotation point.
  // rotationPoint = new THREE.Object3D();
  // rotationPoint.position.set(0, 0, 0);
  // scene.add(rotationPoint);

  // createCharacter('./character1.png', 35, 50, new THREE.Vector3(0, 20, 155), new THREE.Vector3(0, 0, 0));
  //
  // createOtherCharacter("char2", "./character2.png", 35, 50, new THREE.Vector3(155, 20, 5), new THREE.Vector3(0, 0, 0), true);
  // createOtherCharacter("char3", "./character3.png", 35, 50, new THREE.Vector3(-185, 20, 25), new THREE.Vector3(0, 0, 0), true);
  // createOtherCharacter("char4", "./character4.png", 35, 50, new THREE.Vector3(-255, 20, 115), new THREE.Vector3(0, 0, 0), true);
  // createOtherCharacter("char5", "./character5.png", 35, 50, new THREE.Vector3(255, 20, 55), new THREE.Vector3(0, 0, 0), true);
  // createOtherCharacter("char6", "./character6.png", 35, 50, new THREE.Vector3(305, 20, -25), new THREE.Vector3(0, 0, 0), true);


  createFloor();

  $.ajax({
    type: "GET",
    url: "game_map.json",
    headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
    dataType: 'json',
    success: function (response) {
      for (var i = 0; i < response.length; i++) {
//        console.log(response[i]);

        var RepeatX = 0;
        var RepeatY = 0;
        var RepeatZ = 0;

        for (var j = 0; j < response[i].Repeat; j++) {
          loadGLTF(response[i].Name, response[i].FileName, new THREE.Vector3(response[i].Position[0] + RepeatX, response[i].Position[1] + RepeatY, response[i].Position[2] + RepeatZ), new THREE.Vector3(response[i].Scale[0], response[i].Scale[1], response[i].Scale[2]), new THREE.Vector3(response[i].Rotate[0], response[i].Rotate[1], response[i].Rotate[2]), response[i].Collision);

          RepeatX += response[i].RepeatSpacing[0];
          RepeatY += response[i].RepeatSpacing[1];
          RepeatZ += response[i].RepeatSpacing[2];

        }
      }
    }
  });


  // loadGLTF('Stall', './gltf_lib2/Stall/Stall.gltf', new THREE.Vector3(450, 0, 5), new THREE.Vector3(1000, 1000, 1000), new THREE.Vector3(0, 0, 0), true);
  // loadGLTF('scene', './gltf_lib/scene/scene.gltf', new THREE.Vector3(0, 300, -1000), new THREE.Vector3(0.1, 0.1, 0.1), new THREE.Vector3(0, 0, 0), true);


  // postprocessing
  composer = new THREE.EffectComposer(renderer);

  var renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);

  outlinePass = new THREE.OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
  composer.addPass(outlinePass);

  outlinePass.edgeStrength = 3;
  outlinePass.edgeGlow = 1.0;
  outlinePass.edgeThickness = 1.0;
  outlinePass.pulsePeriod = 0;
  outlinePass.usePatternTexture = true;
  outlinePass.visibleEdgeColor.set('#ffffff');
  outlinePass.hiddenEdgeColor.set('#190a05');

  var onLoad = function (texture) {
    outlinePass.patternTexture = texture;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  };

  var loader2 = new THREE.TextureLoader();
  loader2.load('./threejs/examples/textures/tri_pattern.jpg', onLoad);
  effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
  effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
  composer.addPass(effectFXAA);

  window.addEventListener('resize', onWindowResize, false);

  window.addEventListener('mousemove', Outline_onTouchMove);
  window.addEventListener('touchmove', Outline_onTouchMove);

  if (1 == 2) {

    // <div id="info">
    //     <a href="javascript:control.setMode( 'translate' );">"W" translate</a> |
    //   <a href="javascript:control.setMode( 'rotate' );">"E" rotate</a> |
    //   <a href="javascript:control.setMode( 'scale' );">"R" scale</a> |
    //   <a href="javascript:control.setSize( control.size + 0.1 );">"+" increase size</a> |
    //   <a href="javascript:control.setSize( Math.max( control.size - 0.1, 0.1 ) );">"-" decrease size</a><br />
    //   <a href="javascript:control.setSpace( control.space === 'local' ? 'world' : 'local' );">"Q" toggle world/local space</a> | Hold "Ctrl" down to snap to grid<br />
    //   <a href="javascript:control.showX = !control.showX">"X" toggle X</a> |
    //   <a href="javascript:control.showY = !control.showY">"Y" toggle Y</a> |
    //   <a href="javascript:control.showZ = !control.showZ">"Z" toggle Z</a> |
    //   <a href="javascript:control.enabled = !control.enabled">"Spacebar" toggle enabled</a><br />
    //   </div>

    transform_controls = new THREE.TransformControls(camera, renderer.domElement);
    transform_controls.addEventListener('change', render);
    transform_controls.addEventListener('dragging-changed', function (event) {
      controls.enabled = !event.value;
    });

    window.addEventListener('keydown', function (event) {
      switch (event.keyCode) {
        case 81: // Q
          transform_controls.setSpace(transform_controls.space === "local" ? "world" : "local");
          break;
        case 17: // Ctrl
          transform_controls.setTranslationSnap(100);
          transform_controls.setRotationSnap(THREE.Math.degToRad(15));
          break;
        case 87: // W
          transform_controls.setMode("translate");
          break;
        case 69: // E
          transform_controls.setMode("rotate");
          break;
        case 82: // R
          transform_controls.setMode("scale");
          break;
        case 187:
        case 107: // +, =, num+
          transform_controls.setSize(transform_controls.size + 0.1);
          break;
        case 189:
        case 109: // -, _, num-
          transform_controls.setSize(Math.max(transform_controls.size - 0.1, 0.1));
          break;
        case 88: // X
          transform_controls.showX = !transform_controls.showX;
          break;
        case 89: // Y
          transform_controls.showY = !transform_controls.showY;
          break;
        case 90: // Z
          transform_controls.showZ = !transform_controls.showZ;
          break;
        case 32: // Spacebar
          transform_controls.enabled = !transform_controls.enabled;
          break;
      }
    });


  }

  if (1 == 1) {
    var dragControls = new THREE.DragControls(drag_objects, camera, renderer.domElement);
    dragControls.addEventListener('dragstart', function () {
      controls.enabled = false;
    });


    dragControls.addEventListener('dragend', function (object) {
      console.log(object);
//    object.position.y=0;
      controls.enabled = true;
    });
  }

  if (1 == 2) {
    $(document).click(function (event) {

      if (Outline_selectedObjects_temp === null) {
        transform_controls.detach(Outline_selectedObjects_temp2);
        scene.remove(transform_controls);
      }
      else {
        Outline_selectedObjects_temp2 = Outline_selectedObjects_temp;
        scene.add(transform_controls);
        transform_controls.attach(Outline_selectedObjects_temp2);
      }

    });
  }


  $(document).dblclick(function (event) {
    onDocumentMouseDown(event);
  });
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function onWindowResize() {

  var width = window.innerWidth;
  var height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);

//  effectFXAA.uniforms[ 'resolution' ].value.set( 1 / window.innerWidth, 1 / window.innerHeight );

}

//------------------------------------------------------------------------------------------------------------------------------------------------

var WindMillRotation = 0;
var logOnce = 0;


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

  // Don't let the camera go too low.
  // if (camera.position.y < 10) {
  //   camera.position.y = 10;
  // }

  if (1 == 2) {
    scene.traverse(function (node) {
      if (node instanceof THREE.Scene) {
        if (logOnce > 0) {
          console.log("---------------------");
          console.log(node);
          console.log(node.userData);
          logOnce--;
        }

        if (node.userData.object_name === "WindmillX") {
          WindMillRotation = WindMillRotation + 0.1;
          node.rotation.y = THREE.Math.degToRad(WindMillRotation);
        }
      }
    });
  }

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

    move(main_player, movements[0]);
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
