/*
TODO:

- dropdown with all scene objects, auto select and focus on dropdown selected object ....ok
- make objects fixed (mouse move wont work) .............................................ok
- edit name of scene objects save it to the mesh ........................................ok

- save scene to php => json file ........................................................ok
- delete scene object ...................................................................ok
- delete all scene objects ..............................................................ok
- load scene from json file .............................................................ok
- add clone scene object function .......................................................ok
- add new object x,z on last mouse click position .......................................ok
- collision checkbox for items
- fix can move/fixed bug ................................................................ok
- clone besides existing object x,y,z ...................................................ok

- popup json editor for light sources
- popup json editor camera and camera controls.
- popup json editor background
- save/load light,camera,background with scene

- add 4 camera presets top, front, right orto and perspective

- add hierarchy for objects in scene with drag and drop


- load one player into editor scene to move around ......................................ok
- allow test player and enable/disable collision detection

- allow to select multiple objects and align, move, scale and rotate them

- add scripted position, size and scale animation for objects

- add visual object library

- merge the nodejs server (characters and chat) into test3.php






 */


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
var playerSpeed = 1;

// The movement destination indicator.
var indicatorTop;
var indicatorBottom;

var collisions = [];
var main_player = null;
var main_player_Texture = null;
var main_player_Anime = null;
var pickableObjects = [];

var other_players = [];

var IgnoreThisClick = false;

var AddNewObjectPoint = new THREE.Vector3();

AddNewObjectPoint.x = 0;
AddNewObjectPoint.y = 0;
AddNewObjectPoint.z = 0;

var connection = null;

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
var composer, effectFXAA, outlinePass, outlinePassSelected;

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
function calculateCollisionPoints(mesh, scale, type = 'collidable') {
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

		var playerYPosition = -10;

		var setAccordingToFloorPositon = false;
		// Run through each object and detect if there is a collision.
		for (var index = 0; index < collisions.length; index++) {

			if (collisions[index].type == 'floor_material') {

				if ((bounds.xMin <= collisions[index].xMax && bounds.xMax >= collisions[index].xMin) &&
					(bounds.zMin <= collisions[index].zMax && bounds.zMax >= collisions[index].zMin)) {
					// We are on a floor object! elevate user.

					setAccordingToFloorPositon = true;
					var box = new THREE.Box3().setFromObject(main_player);
					var boxsize = new THREE.Vector3();
					box.getSize(boxsize);

					//prevent from a lower tile to pull user down. better to walk in air than being inside the floor.. :)
					if (collisions[index].yMax + ((Math.round(boxsize.y * 1000) / 1000) / 2) > playerYPosition) {
						main_player.position.y = collisions[index].yMax + ((Math.round(boxsize.y * 1000) / 1000) / 2);				    //Position (y = up+, down-)
						playerYPosition = main_player.position.y;
					}

				}
			}
			else if (collisions[index].type == 'collidable' || collisions[index].type == 'wall_material') {
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

		if (!setAccordingToFloorPositon) {
			var box = new THREE.Box3().setFromObject(main_player);
			var boxsize = new THREE.Vector3();
			box.getSize(boxsize);
			main_player.position.y = ((Math.round(boxsize.y * 1000) / 1000) / 2);				    //Position (y = up+, down-)
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
		calculateCollisionPoints(new_player, "1", "player");
	}

//  other_players.push({xname:name, mesh:new_player});

	new_player.name = name;

	scene.add(new_player);
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function createCharacter(width, height, position, rotate) {
	var CharacterCanvas = document.createElement('canvas');
	CharacterCanvas.width = width * 100;
	CharacterCanvas.height = height * 100;

	// Draw the character animation --------------------------
	main_player_Anime = new CharacterAnime(CharacterCanvas, {
		characterId: Math.floor(Math.random() * 6) + 1,
		animation: 'frontStand', // Optional, default is 'frontStand'
		speed: 200 // Optional, default is 200
	});

	main_player_Texture = new THREE.Texture(CharacterCanvas);
	main_player_Texture.wrapS = THREE.RepeatWrapping;
	main_player_Texture.wrapT = THREE.RepeatWrapping;

	var material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide, map: main_player_Texture});
	material.transparent = true;

	var geometry = new THREE.PlaneGeometry(width, height);

	main_player = new THREE.Mesh(geometry, material);

	main_player.rotation.set(THREE.Math.degToRad(rotate.x), THREE.Math.degToRad(rotate.y), THREE.Math.degToRad(rotate.z));

	main_player.position.x = position.x;				    //Position (x = right+ left-)

	var box = new THREE.Box3().setFromObject(main_player);
	var boxsize = new THREE.Vector3();
	box.getSize(boxsize);
	main_player.position.y = ((Math.round(boxsize.y * 10000) / 10000) / 2);				    //Position (y = up+, down-)

	main_player.position.z = position.z;				    //Position (z = front +, back-)

	main_player.name = "main_player";
	main_player.holdStuff = null;

	scene.add(main_player);
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function loadGLTF(name, model_file, position, scale, rotate, can_move, load_from_scene, object_physics, object_collectible) {
	loader.load(model_file, function (gltf) {             // <<--------- Model Path

		const root = gltf.scene;

		var AssignNameToFirst = true;
		root.traverse((obj) => {
			if (obj.isMesh) {

				obj.castShadow = true;
				obj.receiveShadow = true;

				obj.userData = {
					'canMove': can_move,
					'object_physics': object_physics,
					'object_collectible': object_collectible,
					'userName': name,
					'filePath': model_file
				}
				// obj.applyMatrix(mS);

//        drag_objects.push(obj);

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

				obj.userData.canMove = can_move;
				obj.userData.object_physics = object_physics;
				obj.userData.object_collectible = object_collectible;
				obj.userData.userName = name;
				obj.userData.filePath = model_file;

				Outline_selectedObject_temp = obj;


				logOnce = 1;
				scene_objects.add(obj);

				if (object_physics !== "pass_through_fixed" && object_physics !== "pass_through_falling") {
					console.log("add " + name + " to collidable array");
					calculateCollisionPoints(obj, 1, object_physics);
				}


				$("#all_objects").find('option').remove();
				for (var i = 0; i < scene_objects.children.length; i++) {
					$("#all_objects").append('<option value="' + scene_objects.children[i].id + '" data-userdata_name="' + scene_objects.children[i].userData.userName + '" >' + scene_objects.children[i].userData.userName + "(" + scene_objects.children[i].id + ")" + '</option>');
				}


				Outline_addSelectedObject(obj);
				// outlinePass.selectedObjects = Outline_selectedObjects;
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

		});
//    console.log(gltf.scene);

	});

	if (1 === 2) {

		var object = gltf.scene;

//    gltf.geometry.center();


		const root = gltf.scene;

		root.userData.canMove = can_move;
		root.userData.object_physics = object_physics;
		root.userData.object_collectible = object_collectible;
		root.userData.userName = name;
		root.userData.filePath = model_file;

		Outline_selectedObject_temp = root;

		root.scale.set(scale.x, scale.y, scale.z);
//    root.geometry.center();

		if (rotate !== null) {
			if (load_from_scene) {
				root.rotation.x = rotate.x;
				root.rotation.y = rotate.y;
				root.rotation.z = rotate.z;
			}
			else {
				root.rotation.x = THREE.Math.degToRad(rotate.x);
				root.rotation.y = THREE.Math.degToRad(rotate.y);
				root.rotation.z = THREE.Math.degToRad(rotate.z);
			}
		}

		var box = new THREE.Box3().setFromObject(root);
		var boxsize = new THREE.Vector3();
		box.getSize(boxsize);

		root.position.x = position.x;				    //Position (x = right+ left-)
		if (load_from_scene) {
			root.position.y = position.y;
		}
		else {
			root.position.y = position.y + ((Math.round(boxsize.y * 10000) / 10000) / 2);				    //Position (y = up+, down-)
		}
		root.position.z = position.z;				    //Position (z = front +, back-)

		root.castShadow = true;
		root.receiveShadow = true;

		logOnce = 1;

		Outline_addSelectedObject(root);
		// outlinePass.selectedObjects = Outline_selectedObjects;
		SelectObject();

		scene_objects.add(root);

		if (object_physics !== "pass_through_fixed" && object_physics !== "pass_through_falling" ) {
			console.log("add " + name + " to collidable array");
			calculateCollisionPoints(gltf.scene, 1, object_physics);
		}


		$("#all_objects").find('option').remove();
		for (var i = 0; i < scene_objects.children.length; i++) {
			$("#all_objects").append('<option value="' + scene_objects.children[i].id + '" data-userdata_name="' + scene_objects.children[i].userData.userName + '" >' + scene_objects.children[i].userData.userName + "(" + scene_objects.children[i].id + ")" + '</option>');
		}
		SelectObject();

//    console.log(gltf.scene);
//	});

	}
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
		AddNewObjectPoint = intersects[0].point;

		movements.push(intersects[0].point);
	}
}

function changeMainCharacterAnime() {

	var cameraLookAt = new THREE.Vector3(); // create once and reuse it!
	camera.getWorldDirection(cameraLookAt);

	var moveDirection = new THREE.Vector3(movements[0].x - main_player.position.x, 0, movements[0].z - main_player.position.z).normalize();
	var angle = cameraLookAt.angleTo(moveDirection);

	console.log('camera look at: ( ' + cameraLookAt.x + ', ' + cameraLookAt.y + ', ' + cameraLookAt.z + ' )');
	console.log('walk direction: ( ' + moveDirection.x + ', ' + moveDirection.y + ', ' + moveDirection.z + ' )');
	console.log('angle between: ' + angle);

	var frontOrBack = (cameraLookAt.dot(moveDirection) >= 0) ? -1 : 1;
	var rightOrLeft = (cameraLookAt.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2).dot(moveDirection) >= 0) ? 1 : -1;

	console.log('Go To: ' + ((frontOrBack === 1) ? 'front' : 'back') + ' and ' + ((rightOrLeft === 1) ? 'right' : 'left'));

	if (angle >= 0 && angle <= Math.PI * 0.25) {
		console.log('go back')
		main_player_Anime.setAnimation('backWalk' + main_player_Anime.holdStuff);
	}
	else if (angle > Math.PI * 0.25 && angle < Math.PI * 0.75) {
		if (rightOrLeft === 1) {
			console.log('go right');
			main_player_Anime.setAnimation('rightWalk' + main_player_Anime.holdStuff);
		}
		else if (rightOrLeft === -1) {
			console.log('go left');
			main_player_Anime.setAnimation('leftWalk' + main_player_Anime.holdStuff);
		}
	}
	else if (angle >= Math.PI * 0.75 && angle <= Math.PI) {
		console.log('go front')
		main_player_Anime.setAnimation('frontWalk' + main_player_Anime.holdStuff);
	}

}

//------------------------------------------------------------------------------------------------------------------------------------------------
function searchPickableObjs() {
	pickableObjects = [];
	var pickableArea = {
		x: [main_player.position.x - main_player.geometry.parameters.width / 2 - 15, main_player.position.x + main_player.geometry.parameters.width / 2 + 15],
		y: [main_player.position.y - main_player.geometry.parameters.height / 2 - 15, main_player.position.y + main_player.geometry.parameters.height / 2 + 15],
		z: [main_player.position.z - 15, main_player.position.z + 15]
	};

	scene_objects.traverse(function (groupObj) {
		if (groupObj instanceof THREE.Scene) {
			// Check Collectible
			var meshObj = groupObj.children[0];
			if (meshObj.userData.object_collectible === 'pickup' || meshObj.userData.object_collectible === 'clone') {
				// Check object is reachable by the player
				if (meshObj.position.x >= pickableArea.x[0] && meshObj.position.x <= pickableArea.x[1] && meshObj.position.y >= pickableArea.y[0] && meshObj.position.y <= pickableArea.y[1] && meshObj.position.z >= pickableArea.z[0] && meshObj.position.z <= pickableArea.z[1]) {
					meshObj.userData.groupID = groupObj.id;
					if (meshObj.userData.object_collectible === 'pickup') {
						pickableObjects.push(groupObj);
					}
					else if (meshObj.userData.object_collectible === 'clone') {
						var cloneScene = new THREE.Scene;
						var cloneMesh = meshObj.clone();

						cloneScene.children.push(cloneMesh);
						cloneScene.userData = groupObj.userData;

						pickableObjects.push(cloneScene);
					}
				}
			}
		}
	});

	//Sort pickable object by the distance to the player
	pickableObjects.sort(function (a, b) {
		return a.position.distanceTo(main_player.position) - b.position.distanceTo(main_player.position)
	})

}

function stopMovement() {
	console.log("stop move");

	movements = [];

	var mainAnime = main_player_Anime.parseAnimationName()[0];
	if (mainAnime === 'frontWalk') {
		main_player_Anime.setAnimation('frontStand' + main_player_Anime.holdStuff)
	}
	else if (mainAnime === 'backWalk') {
		main_player_Anime.setAnimation('backStand' + main_player_Anime.holdStuff)
	}
	else if (mainAnime === 'rightWalk') {
		main_player_Anime.setAnimation('rightStand' + main_player_Anime.holdStuff)
	}
	else if (mainAnime === 'leftWalk') {
		main_player_Anime.setAnimation('leftStand' + main_player_Anime.holdStuff)
	}

	searchPickableObjs();

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

	//When player is moving, there is nothing to pick up.
	pickableObjects = [];

	// If the position is close we can call the movement complete.
	if ((Math.floor(location.position.x) <= Math.floor(newPosX) + 2.5 &&
		Math.floor(location.position.x) >= Math.floor(newPosX) - 2.5) &&
		(Math.floor(location.position.z) <= Math.floor(newPosZ) + 2.5 &&
			Math.floor(location.position.z) >= Math.floor(newPosZ) - 2.5)) {
		location.position.x = Math.floor(location.position.x);
		location.position.z = Math.floor(location.position.z);

		// Reset any movements.
		stopMovement();

		// Maybe move should return a boolean. True if completed, false if not.
	}
}

//------------------------------------------------------------------------------------------------------------------------------------------------
function Outline_addSelectedObject(object) {
	Outline_selectedObjects = [];

	// console.log(parent);
	// console.log(parent.userData);

	if (object.userData.canMove !== "fixed") {
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
		console.log(intersects[0]);
		Outline_selectedObject_temp = intersects[0].object;
		console.log(Outline_selectedObject_temp);
		// console.log("--------------");
		// console.log(intersects);
		// console.log(Outline_selectedObject_temp);
		Outline_addSelectedObject(intersects[0].object);
		// outlinePass.selectedObjects = Outline_selectedObjects;
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


function updateSet(setName) {
	$("#object_file").find('option').remove();
	$("#object_group").find('option').remove();

	for (var key in sets) {
		if (sets[key].name === setName) {
			for (var key2 in sets[key].groups) {
				$("#object_group").append('<option value="' + sets[key].groups[key2].name + '">' + sets[key].groups[key2].name + '</option>');
//          console.log(sets[key].groups[key2].name);
			}
		}
	}
}

function updateSetGroup() {
	$("#object_file").find('option').remove();
	for (var key in sets) {
		if (sets[key].name === $("#object_set").val()) {

			for (var key2 in sets[key].groups) {
				if (sets[key].groups[key2].name === $("#object_group").val()) {
					// console.log(sets[key].groups[key2].name);
					// console.log(sets[key].groups[key2]);

					for (var key3 in sets[key].groups[key2].folders) {

						$("#object_file").append('<option value="' + sets[key].groups[key2].folders[key3] + '">' + sets[key].groups[key2].folders[key3] + '</option>');
						// console.log(sets[key].groups[key2].folders[key3]);
					}
				}
			}
		}
	}
}

function SelectObject() {
	if (Outline_selectedObject_temp !== null) {
		outlinePassSelected.selectedObjects = [];
		outlinePassSelected.selectedObjects = [Outline_selectedObject_temp];

		console.log("select object");

		$("#object_name").val(Outline_selectedObject_temp.userData.userName);
		console.log(Outline_selectedObject_temp);

		$('#all_objects option[value="' + Outline_selectedObject_temp.id + '"]').prop('selected', true);


		var position = new THREE.Vector3();
//    console.log(Outline_selectedObject_temp);

//    var MeshChild = Outline_selectedObject_temp;
		var MeshChild = outlinePassSelected.selectedObjects[0];

		if (outlinePassSelected.selectedObjects[0] !== null) {
			position.setFromMatrixPosition(MeshChild.matrixWorld);
			console.log(position);

			$("#position_x").val(Math.round(position.x * 10000) / 10000);
			$("#position_y").val(Math.round(position.y * 10000) / 10000);
			$("#position_z").val(Math.round(position.z * 10000) / 10000);


//      outlinePassSelected.selectedObjects[0].rotation.x = degrees_to_radians(parseFloat($(this).val()));


			var box = new THREE.Box3().setFromObject(MeshChild);
//      console.log( box.min, box.max, box.getSize() );
			var boxsize = new THREE.Vector3();
			box.getSize(boxsize);


			$("#size_x").val(Math.round(MeshChild.scale.x * 100) / 100);
			$("#size_y").val(Math.round(MeshChild.scale.y * 100) / 100);
			$("#size_z").val(Math.round(MeshChild.scale.z * 100) / 100);

			$("#size_x_hint").html(Math.round(boxsize.x * 10000) / 10000);
			$("#size_y_hint").html(Math.round(boxsize.y * 10000) / 10000);
			$("#size_z_hint").html(Math.round(boxsize.z * 10000) / 10000);


			$("#rotate_x").val(radians_to_degrees(MeshChild.rotation.x));
			$("#rotate_y").val(radians_to_degrees(MeshChild.rotation.y));
			$("#rotate_z").val(radians_to_degrees(MeshChild.rotation.z));

			console.log(" object collectible : " + Outline_selectedObject_temp.userData.object_collectible);
			$('#object_collectible option[value="' + Outline_selectedObject_temp.userData.object_collectible + '"]').prop('selected', true);

			console.log(" object physics : " + Outline_selectedObject_temp.userData.object_physics);
			$('#object_physics option[value="' + Outline_selectedObject_temp.userData.object_physics + '"]').prop('selected', true);

			console.log(" can move : " + Outline_selectedObject_temp.userData.canMove);
			$('#object_fixed option[value="' + Outline_selectedObject_temp.userData.canMove + '"]').prop('selected', true);
		}
	}
	else {
		outlinePassSelected.selectedObjects = [];
		outlinePass.selectedObjects = [];

		$("#object_name").val("");

		$("#position_x").val("");
		$("#position_y").val("");
		$("#position_z").val("");

		$("#size_x").val("");
		$("#size_y").val("");
		$("#size_z").val("");

		$("#size_x_hint").html("");
		$("#size_y_hint").html("");
		$("#size_z_hint").html("");

		$("#rotate_x").val("");
		$("#rotate_y").val("");
		$("#rotate_z").val("");

	}
}

//------------------------------------------------------------------------------------------------------------------------------------------------
function init() {
	// Build the container
	container = $("#GameContainer");
	// document.createElement('div');
	// document.body.appendChild(container);

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
	camera.position.set(0, 75, 600);
//  camera.lookAt(1500,200,500);
//    main_player.add(camera);

	controls = new THREE.OrbitControls(camera, renderer.domElement);
	// controls.maxDistance = 5000; // Set our max zoom out distance (mouse scroll)
	// controls.minDistance = 300; // Set our min zoom in distance (mouse scroll)

	controls.rotateSpeed = 0.05;

//  controls.maxPolarAngle = Math.PI * 0.5; //limit so cant go bellow surface
	controls.enablePan = true;
	controls.panSpeed = 0.3;
	controls.enableDamping = true;
	controls.dampingFactor = 0.25;
	controls.enableZoom = true;
	controls.zoomSpeed = 0.6;
	controls.enableKeys = false;

	controls.target = new THREE.Vector3(0, 2, 0);

	controls.update();

	AddLights();

	//skybox
	if (1 == 1) {
		var urls = ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'];
		var loaderCube = new THREE.CubeTextureLoader().setPath('./threejs/examples/textures/cube/skyboxsun25deg/');
		loaderCube.load(urls, function (texture) {
			scene.background = texture;
		});
	}


	createCharacter(10, 20, new THREE.Vector3(0, 10, 155), new THREE.Vector3(0, 0, 0));
	// createOtherCharacter("char2", "./character2.png", 35, 50, new THREE.Vector3(155, 20, 5), new THREE.Vector3(0, 0, 0), true);


	createFloor();

	scene.add(scene_objects);


	// postprocessing
	composer = new THREE.EffectComposer(renderer);

	var renderPass = new THREE.RenderPass(scene, camera);
	composer.addPass(renderPass);

	outlinePass = new THREE.OutlinePass(new THREE.Vector2((window.innerWidth - 250), window.innerHeight), scene, camera);
	composer.addPass(outlinePass);

	outlinePass.edgeStrength = 3;
	outlinePass.edgeGlow = 1.0;
	outlinePass.edgeThickness = 1.0;
	outlinePass.pulsePeriod = 0;
	outlinePass.usePatternTexture = true;
	outlinePass.visibleEdgeColor.set('#ffffff');
	outlinePass.hiddenEdgeColor.set('#190a05');


	outlinePassSelected = new THREE.OutlinePass(new THREE.Vector2((window.innerWidth - 250), window.innerHeight), scene, camera);
	composer.addPass(outlinePassSelected);

	outlinePassSelected.edgeStrength = 1;
	outlinePassSelected.edgeGlow = 0.5;
	outlinePassSelected.edgeThickness = 1.0;
	outlinePassSelected.pulsePeriod = 2;
	outlinePassSelected.usePatternTexture = false;
	outlinePassSelected.visibleEdgeColor.set('#00ffff');
	outlinePassSelected.hiddenEdgeColor.set('#190a05');


	var onLoad = function (texture) {
		outlinePass.patternTexture = texture;
		texture.wrapS = THREE.RepeatWrapping;
		texture.wrapT = THREE.RepeatWrapping;
	};

	var loader2 = new THREE.TextureLoader();
	loader2.load('./threejs/examples/textures/tri_pattern.jpg', onLoad);
	effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
	effectFXAA.uniforms['resolution'].value.set(1 / (window.innerWidth - 250), 1 / window.innerHeight);
	composer.addPass(effectFXAA);

	window.addEventListener('resize', onWindowResize, false);

	var dragControls = new THREE.DragControls(Outline_selectedObjects, camera, renderer.domElement);
	dragControls.addEventListener('dragstart', function () {
		if (Outline_selectedObject_temp !== null) {

			console.log(Outline_selectedObject_temp.userData.canMove);
			if (Outline_selectedObject_temp.userData.canMove === "fixed") {
				return false;
			}

		}
		else {
			return false;
		}
		IgnoreThisClick = true;
		controls.enabled = false;
	});

	dragControls.addEventListener('dragend', function (object) {
		console.log(object);
//    object.position.y=0;
		controls.enabled = true;
		SelectObject();

	});

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

	$("#rotate_camera").on('click', function () {
		if (controls.enableRotate) {
			$("#rotate_camera").html("Enable Rotate");
			controls.enableRotate = false;
		}
		else {
			$("#rotate_camera").html("Disable Rotate");
			controls.enableRotate = true;
		}
	});

	$("#object_set").on("change", function () {
		updateSet($(this).val());
		updateSetGroup();
	});

	$("#object_group").on("change", function () {
		updateSetGroup()
	});

	$("#all_objects").on("change", function () {
		console.log($(this).val());

		Outline_selectedObject_temp = scene.getObjectById(parseInt($(this).val(), 10), true);
		Outline_addSelectedObject(Outline_selectedObject_temp);
		// outlinePass.selectedObjects = Outline_selectedObjects;
		SelectObject();

	});

	updateSet("set1");
	updateSetGroup();

	$("#add_object").on("click", function () {
//    console.log("add new "+$("#object_file").val()+" "+$("#object_file option:selected").attr("id"));

		var scaleFactor = "";
		if ($("#object_set").val() === "set1") {
			scaleFactor = new THREE.Vector3(500, 500, 500);
		}

		if ($("#object_set").val() === "set2") {
			scaleFactor = new THREE.Vector3(25, 25, 25);
		}

		if ($("#object_set").val() === "set3") {
			scaleFactor = new THREE.Vector3(0.5, 0.5, 0.5);
		}

		if ($("#object_set").val() === "set4") {
			scaleFactor = new THREE.Vector3(10, 10, 1);
		}

		if ($("#object_set").val() === "set5") {
			scaleFactor = new THREE.Vector3(0.3, 0.3, 0.3);
		}

		console.log(AddNewObjectPoint);
		loadGLTF($("#object_file").val(), "./library/" + $("#object_set").val() + "/" + $("#object_group").val() + "/" + $("#object_file").val() + "/" + $("#object_file").val() + ".gltf", AddNewObjectPoint, scaleFactor, null, "can_move", false, "pass_through_fixed", "no_collecting");

	});

	$("#object_fixed").on("change", function () {
		if (Outline_selectedObject_temp !== null) {
			Outline_selectedObject_temp.userData.canMove = $(this).val();
			console.log($(this).val());

			Outline_selectedObjects = [];
			if (Outline_selectedObject_temp.userData.canMove !== "fixed") {
				Outline_selectedObjects.push(Outline_selectedObject_temp);
			}

		}
	});


	document.addEventListener('keypress', logKey);

	function logKey(e) {
		console.log(e.code);

		if (e.code === "Space") {

			if (main_player.holdStuff === null) {
				//Try to pick up something ----------------------------------

				console.log(pickableObjects);

				if (pickableObjects.length > 0) {

					console.log('has something to pick up');

					var closestObj = pickableObjects[0].children[0];

					if (closestObj.userData.object_collectible === 'pickup') {
						console.log('pick up ' + closestObj.userData.userName);
						//Remove object from the scene after pick up .........
						for (var i = scene_objects.children.length - 1; i >= 0; i--) {
							if (closestObj.userData.groupID === scene_objects.children[i].id) {
								scene_objects.remove(scene_objects.children[i]);
							}
						}
					}

					if (closestObj.userData.object_collectible === 'clone') {
						console.log('clone ' + closestObj.userData.userName);
					}

					//Change player animation.
					main_player_Anime.setAnimation(main_player_Anime.parseAnimationName()[0] + '_' + closestObj.userData.userName);

					//Player is holding this object.
					main_player.holdStuff = pickableObjects[0];

				}

			}
			else if (main_player.holdStuff !== null) {
				//Try to drop something -------------------------------------

				var mesh = main_player.holdStuff.children[0];

				//Calculate the position to drop.
				mesh.position.x = main_player.position.x + 10;
				// mesh.position.y = main_player.position.y;
				mesh.position.z = main_player.position.z;

				//The thing hold by the player and then drop, is always pickup.
				main_player.holdStuff.userData.object_collectible = 'pickup';
				mesh.userData.object_collectible = 'pickup';

				//Add object back to the scene.
				scene_objects.add(main_player.holdStuff);

				//If player is not moving, this will be the first stuff player pick up again.
				pickableObjects = [main_player.holdStuff];

				//Re-calculate Collision Points.
				calculateCollisionPoints(mesh, 1, mesh.userData.object_physics);

				//After dropping, play is holding nothing.
				main_player.holdStuff = null;

				//Change player animation.
				main_player_Anime.setAnimation(main_player_Anime.parseAnimationName()[0]);

				console.log(scene_objects);

			}

		}
	}

	$("#object_physics").on("change", function () {
		if (Outline_selectedObject_temp !== null) {
			Outline_selectedObject_temp.userData.object_physics = $(this).val();
			console.log($(this).val());
		}
	});

	$("#object_collectible").on("change", function () {
		if (Outline_selectedObject_temp !== null) {
			Outline_selectedObject_temp.userData.object_collectible = $(this).val();
			console.log($(this).val());
		}
	});

	$("#object_name").on('change', function () {
		if (Outline_selectedObject_temp !== null) {
			Outline_selectedObject_temp.userData.userName = $(this).val();
			$('#all_objects option[value="' + Outline_selectedObject_temp.id + '"]').html($(this).val() + "(" + Outline_selectedObject_temp.id + ")");
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
					$("#saveSceneName").val($(this).data("scene_name").substr(0, $(this).data("scene_name").lastIndexOf('.txt')));

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
								if (data[i].object_physics === null || typeof data[i].object_physics === "undefined") {
									data[i].object_physics = "pass_through_fixed";
								}

								if (data[i].object_collectible === null || typeof data[i].object_collectible === "undefined") {
									data[i].object_collectible = "no_collecting";
								}

								loadGLTF(data[i].userName, data[i].filePath, new THREE.Vector3(data[i].position.x, data[i].position.y, data[i].position.z), new THREE.Vector3(data[i].scale.x, data[i].scale.y, data[i].scale.z), new THREE.Vector3(data[i].rotation._x, data[i].rotation._y, data[i].rotation._z), data[i].canMove, true, data[i].object_physics, data[i].object_collectible);


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

	$("#saveSceneButton").on('click', function (e) {

		var saveObjects = [];

		for (var i = 0; i < scene_objects.children.length; i++) {
			console.log(scene_objects.children[i]);

			var position = new THREE.Vector3();
			position.setFromMatrixPosition(scene_objects.children[i].matrixWorld);
			// console.log(JSON.stringify(position));

			var box = new THREE.Box3().setFromObject(scene_objects.children[i]);
			var boxsize = new THREE.Vector3();
			box.getSize(boxsize);

			// $("#size_x_hint").html(Math.round(boxsize.x * 10000) / 10000);
			// $("#size_y_hint").html(Math.round(boxsize.y * 10000) / 10000);
			// $("#size_z_hint").html(Math.round(boxsize.z * 10000) / 10000);

			saveObjects.push({
				"id": scene_objects.children[i].id,
				"name": scene_objects.children[i].name,
				"canMove": scene_objects.children[i].userData.canMove,
				"object_physics": scene_objects.children[i].userData.object_physics,
				"object_collectible": scene_objects.children[i].userData.object_collectible,
				"userName": scene_objects.children[i].userData.userName,
				"filePath": scene_objects.children[i].userData.filePath,
				"position": position,
				"scale": scene_objects.children[i].scale,
				"rotation": scene_objects.children[i].rotation,
				"quaternion": scene_objects.children[i].quaternion
			});
		}
		console.log(saveObjects);
//    console.log(JSON.stringify(saveObjects));


		console.log("save scene press");
		if ($("#saveSceneName").val() !== "") {
			console.log("save scene");

			var UrlToGet = "save_scene.php";
			var data = {"scene_data": JSON.stringify(saveObjects), "scene_name": $("#saveSceneName").val()};

			$.ajax({
				type: "post",
				url: UrlToGet,
				data: data,
				dataType: "json",
				success: function (data, status) {
					console.log("Status: " + status);
				},
				error: function (data, status) {
					console.log("error Status: " + status);
				}
			});
			$("#saveSceneModal").modal('hide');
		}
		else {
			alert("scene name?");
		}
		e.preventDefault();
	});


	$(".edit_object_prop").TouchSpin({
		min: -1000000,
		max: 1000000,
		decimals: 4,
		step: 0.1,
		stepinterval: 50,
		maxboostedstep: 1000000,
		buttondown_class: "btn btn-outline-info",
		buttonup_class: "btn btn-outline-info"
	});

	$("#focus_object").on('click', function () {

		console.log(outlinePassSelected.selectedObjects.length);
		if (outlinePassSelected.selectedObjects.length > 0) {
			fitCameraToSelection(camera, controls, outlinePassSelected.selectedObjects, 1.2);
		}
		else {
			controls.reset();
		}

		// var bb = new THREE.Box3();
		// bb.setFromObject(outlinePassSelected.selectedObjects[0]);
		// bb.center(controls.target);
	});

	$("#delete_object").on('click', function (e) {
		$("#deleteObjectModal").modal('show');
		e.preventDefault();
	});

	$(".clone_object").on('click', function (e) {

		if (Outline_selectedObject_temp !== null) {
			console.log("trying to clone");


			for (var i = scene_objects.children.length - 1; i >= 0; i--) {
				console.log((Outline_selectedObject_temp.id === scene_objects.children[i].id));

				console.log((Outline_selectedObject_temp.id + "===" + scene_objects.children[i].id));
				if (Outline_selectedObject_temp.id === scene_objects.children[i].id) {
//          scene_objects.remove(scene_objects.children[i]);


					var MeshChild = scene_objects.children[i];

					if (MeshChild !== null) {

						var position = new THREE.Vector3();
						position.setFromMatrixPosition(MeshChild.matrixWorld);

						var box = new THREE.Box3().setFromObject(MeshChild);
						var boxsize = new THREE.Vector3();
						box.getSize(boxsize);

						if ($(this).hasClass("clone_x_minus")) {
							position.x = position.x - (Math.round(boxsize.x * 10000) / 10000);
						}
						if ($(this).hasClass("clone_x_plus")) {
							position.x = position.x + (Math.round(boxsize.x * 10000) / 10000);
						}

						if ($(this).hasClass("clone_y_minus")) {
							position.y = position.y - (Math.round(boxsize.y * 10000) / 10000);
						}
						if ($(this).hasClass("clone_y_plus")) {
							position.y = position.y + (Math.round(boxsize.y * 10000) / 10000);
						}


						if ($(this).hasClass("clone_z_minus")) {
							position.z = position.z - (Math.round(boxsize.z * 10000) / 10000);
						}
						if ($(this).hasClass("clone_z_plus")) {
							position.z = position.z + (Math.round(boxsize.z * 10000) / 10000);
						}

						// console.log(JSON.stringify(position));

						var box = new THREE.Box3().setFromObject(MeshChild);
						var boxsize = new THREE.Vector3();
						box.getSize(boxsize);
						loadGLTF(scene_objects.children[i].userData.userName, scene_objects.children[i].userData.filePath, position, MeshChild.scale, MeshChild.rotation, scene_objects.children[i].userData.canMove, true, scene_objects.children[i].userData.object_physics, scene_objects.children[i].userData.object_collectible);
					}
				}
			}
		}
		e.preventDefault();
	});


	$("#deleteObjectButton").on('click', function (e) {

		if (Outline_selectedObject_temp !== null) {
			console.log("trying to delete");

			for (var i = scene_objects.children.length - 1; i >= 0; i--) {
				console.log((Outline_selectedObject_temp.id === scene_objects.children[i].id));

				console.log((Outline_selectedObject_temp.id + "===" + scene_objects.children[i].id));
				if (Outline_selectedObject_temp.id === scene_objects.children[i].id) {
					scene_objects.remove(scene_objects.children[i]);
				}
			}

		}

		$("#all_objects").find('option').remove();
		for (var i = 0; i < scene_objects.children.length; i++) {
			$("#all_objects").append('<option value="' + scene_objects.children[i].id + '" data-userdata_name="' + scene_objects.children[i].userData.userName + '" >' + scene_objects.children[i].userData.userName + "(" + scene_objects.children[i].id + ")" + '</option>');
		}

		$("#deleteObjectModal").modal('hide');
		e.preventDefault();
	});


	//--------- update object position
	$(".edit_object_prop").on('change', function () {

		var edit_id = $(this).attr('id');
		console.log($(this).attr('id') + " " + $(this).val());

		if (outlinePassSelected.selectedObjects[0] !== null) {

			if (edit_id === "position_x") {
				outlinePassSelected.selectedObjects[0].position.x = parseFloat($(this).val());
			}
			if (edit_id === "position_y") {
				outlinePassSelected.selectedObjects[0].position.y = parseFloat($(this).val());
			}
			if (edit_id === "position_z") {
				outlinePassSelected.selectedObjects[0].position.z = parseFloat($(this).val());
			}

			if (edit_id === "size_x") {
				outlinePassSelected.selectedObjects[0].scale.x = parseFloat($(this).val());
			}
			if (edit_id === "size_y") {
				outlinePassSelected.selectedObjects[0].scale.y = parseFloat($(this).val());
			}
			if (edit_id === "size_z") {
				outlinePassSelected.selectedObjects[0].scale.z = parseFloat($(this).val());
			}

			console.log(outlinePassSelected.selectedObjects[0]);
			if (edit_id === "rotate_x") {
				outlinePassSelected.selectedObjects[0].rotation.x = degrees_to_radians(parseFloat($(this).val()));
			}
			if (edit_id === "rotate_y") {
				outlinePassSelected.selectedObjects[0].rotation.y = degrees_to_radians(parseFloat($(this).val()));
			}
			if (edit_id === "rotate_z") {
				outlinePassSelected.selectedObjects[0].rotation.z = degrees_to_radians(parseFloat($(this).val()));
			}
		}
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
	// renderer.render(scene, camera);
	composer.render();

	// Don't let the camera go too low.
	// if (camera.position.y < 10) {
	//   camera.position.y = 10;
	// }

	if (1 == 1) {
		logOnce--;
	}

	//If main player animation needs update, tell three.js updates the texture.
	if (main_player_Anime.needsUpdateFrame) {
		main_player_Texture.needsUpdate = true;
		main_player_Anime.needsUpdateFrame = false;
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

		//Move after character anime is changed and ready.
		if (main_player_Anime.isAnimeReady) {
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
