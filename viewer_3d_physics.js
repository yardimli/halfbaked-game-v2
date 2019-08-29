var camera, // We need a camera.
	scene, // The camera has to see something.
	renderer, // Render our graphics.
	controls, // Our Orbit Controller for camera magic.
	container;

var loader = new THREE.GLTFLoader();

var characterSize = 30;
var outlineSize = characterSize * 0.05;

// Track all objects and collisions.
var floor_objects = [];

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
var main_player_holdStuff = '';

var json_objects;

var IgnoreThisClick = false;

var AddNewObjectPoint = new THREE.Vector3();

AddNewObjectPoint.x = 0;
AddNewObjectPoint.y = 0;
AddNewObjectPoint.z = 0;

var connection = null;

var PlayerBody;


// - Global variables -
var DISABLE_DEACTIVATION = 4;
var TRANSFORM_AUX;
var ZERO_QUATERNION;
var materialDynamic, materialStatic, materialInteractive;

$(document).ready(function () {
	//Ammojs Initialization
	Ammo().then(function() {

		materialDynamic = new THREE.MeshPhongMaterial( { color:0x0ca400 } );
		materialStatic = new THREE.MeshPhongMaterial( { color:0x000999 } );
		materialInteractive=new THREE.MeshPhongMaterial( { color:0x990000 } );

		// - Global variables -
		TRANSFORM_AUX = new Ammo.btTransform();
		ZERO_QUATERNION = new THREE.Quaternion(0, 0, 0, 1);


		start();
	});


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
//variable declaration section
let physicsWorld, rigidBodies = []
let colGroupPlane = 1, colGroupRedBall = 2, colGroupGreenBall = 4


//------------------------------------------------------------------------------------------------------------------------------------------------
function start() {
	setupPhysicsWorld();
	init();
	renderFrame();
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function setupPhysicsWorld() {

	let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration(),
		dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration),
		overlappingPairCache = new Ammo.btDbvtBroadphase(),
		solver = new Ammo.btSequentialImpulseConstraintSolver();

	physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
	physicsWorld.setGravity(new Ammo.btVector3(0, -100, 0));
}


//------------------------------------------------------------------------------------------------------------------------------------------------
function updatePhysics(deltaTime) {

	var tmpTrans = new Ammo.btTransform();

	// Step world
	physicsWorld.stepSimulation(deltaTime, 10);

	// Update rigid bodies
	for (let i = 0; i < rigidBodies.length; i++) {
		let objThree = rigidBodies[i];
		let objAmmo = objThree.userData.physicsBody;
		let ms = objAmmo.getMotionState();
		if (ms) {

			ms.getWorldTransform(tmpTrans);
			let p = tmpTrans.getOrigin();
			let q = tmpTrans.getRotation();
			objThree.position.set(p.x(), p.y(), p.z());

			if (rigidBodies[i].name === "main_player") {
				// var tbv30 = new Ammo.btVector3();
				// tbv30.setValue(0,0,0);
				// ms.setRotation(tbv30);
				// objAmmo.setMotionState(ms);
				// objAmmo.setAngularVelocity(tbv30);
			}

			objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
		}
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
function createCharacter(width, height, position, rotate) {
	var CharacterCanvas = document.createElement('canvas');
	CharacterCanvas.width = width * 10;
	CharacterCanvas.height = height * 10;

	// Draw the character animation --------------------------
	var holdStuffs = ['', '_Watermelon', '_GreenApple', '_EmptyCup', '_FullCup', '_Orange', '_Pineapple'];
	main_player_holdStuff = holdStuffs[Math.floor(Math.random() * 4)];
	main_player_Anime = new CharacterAnime(CharacterCanvas, {
		characterId: Math.floor(Math.random() * 6) + 1,
		animation: 'frontStand' + main_player_holdStuff, // Optional, default is 'frontStand'
		speed: 200 // Optional, default is 200
	});


	main_player_Texture = new THREE.Texture(CharacterCanvas);
	main_player_Texture.wrapS = THREE.RepeatWrapping;
	main_player_Texture.wrapT = THREE.RepeatWrapping;

	var material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide, map: main_player_Texture});
	material.transparent = true;

	var materials = [ null, null, null, null, material, null];
	var faceMaterial = new THREE.MeshFaceMaterial(materials);

	var geometry = new THREE.BoxGeometry(20, 30, 1, 1, 1, 1);
	main_player = new THREE.Mesh(geometry, faceMaterial);

	var box = new THREE.Box3().setFromObject(main_player);
	var boxsize = new THREE.Vector3();
	box.getSize(boxsize);
	main_player.position.x = position.x;//  ((Math.round(boxsize.y * 10000) / 10000) / 2);				    //Position (y = up+, down-)

	main_player.position.y = position.y;//  ((Math.round(boxsize.y * 10000) / 10000) / 2);				    //Position (y = up+, down-)

	main_player.position.z = position.z;				    //Position (z = front +, back-)

	main_player.name = "main_player";

	scene.add(main_player);


	//Ammojs Section
	let mass = 1000;
	let transform = new Ammo.btTransform();
	let quat = {x: 0, y: 0, z: 0, w: 1};

	transform.setIdentity();
	transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));

	transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
	let motionState = new Ammo.btDefaultMotionState(transform);

	let colShape = new Ammo.btBoxShape(new Ammo.btVector3(20 * 0.5, 30 * 0.5, 1 * 0.5));
	//colShape.setMargin(0.05);

	let localInertia = new Ammo.btVector3(0, 0, 0);
	colShape.calculateLocalInertia(mass, localInertia);

	let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
	PlayerBody = new Ammo.btRigidBody(rbInfo);
	PlayerBody.setFriction(0.2);
	PlayerBody.setAngularFactor( 0, 1, 0 );
	physicsWorld.addRigidBody(PlayerBody, colGroupRedBall, colGroupPlane | colGroupGreenBall);

	//  PlayerBody.setCollisionFlags( 2 );
	PlayerBody.setActivationState(4);


	main_player.userData.physicsBody = PlayerBody;
	rigidBodies.push(main_player);
}


function getQuatertionFromEuler(x, y, z) {
	var c1, s1, c2, s2, c3, s3, c1c2, s1s2;
	c1 = Math.cos(y);
	s1 = Math.sin(y);
	c2 = Math.cos(-z);
	s2 = Math.sin(-z);
	c3 = Math.cos(x);
	s3 = Math.sin(x);

	c1c2 = c1 * c2;
	s1s2 = s1 * s2;

	return {
		w: c1c2 * c3 - s1s2 * s3,
		x: c1c2 * s3 + s1s2 * c3,
		y: s1 * c2 * c3 + c1 * s2 * s3,
		z: c1 * s2 * c3 - s1 * c2 * s3
	};
};

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

				obj.userData.canMove = can_move;
				obj.userData.object_physics = object_physics;
				obj.userData.object_collectible = object_collectible;
				obj.userData.userName = name;
				obj.userData.filePath = model_file;

				logOnce = 1;
				scene_objects.add(obj);

				if (object_physics !== "pass_through") {
					console.log("add " + name + " to collidable array");
				}


				//Ammojs Section
				let mass = 0;
				if (!load_from_scene) {
					mass = 1;
				}
				let transform = new Ammo.btTransform();
				let quat = {x: 0, y: 0, z: 0, w: 1};
				transform.setIdentity();

				if (load_from_scene) {
					transform.setOrigin(new Ammo.btVector3(position.x, position.y + 1.5, position.z));
				}
				else {
					transform.setOrigin(new Ammo.btVector3(position.x, 100, position.z));
				}
				if (rotate !== null) {

					if (load_from_scene) {
						// var tt = getQuatertionFromEuler(rotate.y, rotate.z, rotate.x);
						// console.log(tt);
						transform.setRotation(new Ammo.btQuaternion(rotate.x, rotate.y, rotate.z, rotate.w));
					}
					else {
					}
				}
				let motionState = new Ammo.btDefaultMotionState(transform);

				let colShape = new Ammo.btBoxShape(new Ammo.btVector3(boxsize.x, boxsize.y, boxsize.z));
				colShape.setMargin(0.05);

				let localInertia = new Ammo.btVector3(0, 0, 0);
				colShape.calculateLocalInertia(mass, localInertia);

				let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
				let xObjectBody = new Ammo.btRigidBody(rbInfo);

//  xObjectBody.setCollisionFlags( 2 );
				xObjectBody.setActivationState(4);

				physicsWorld.addRigidBody(xObjectBody, colGroupGreenBall, colGroupPlane | colGroupRedBall | colGroupGreenBall);

				obj.userData.physicsBody = xObjectBody;
				rigidBodies.push(obj);

			}

		});
//    console.log(gltf.scene);

	});
}


function createBox(pos, quat, w, l, h, mass, friction) {
	var material = mass > 0 ? materialDynamic : materialStatic;
	var shape = new THREE.BoxGeometry(w, l, h, 1, 1, 1);
	var geometry = new Ammo.btBoxShape(new Ammo.btVector3(w * 0.5, l * 0.5, h * 0.5));

	if(!mass) mass = 0;
	if(!friction) friction = 1;

	var mesh = new THREE.Mesh(shape, material);
	mesh.position.copy(pos);
	mesh.quaternion.copy(quat);
	scene.add( mesh );

	var transform = new Ammo.btTransform();
	transform.setIdentity();
	transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
	transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
	var motionState = new Ammo.btDefaultMotionState(transform);

	var localInertia = new Ammo.btVector3(0, 0, 0);
	geometry.calculateLocalInertia(mass, localInertia);

	var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, geometry, localInertia);
	var body = new Ammo.btRigidBody(rbInfo);

	body.setFriction(friction);
	//body.setRestitution(.9);
	//body.setDamping(0.2, 0.2);

//	physicsWorld.addRigidBody( body );
//	physicsWorld.addRigidBody(body, colGroupPlane, colGroupRedBall | colGroupGreenBall);
	physicsWorld.addRigidBody(body, colGroupGreenBall, colGroupPlane | colGroupRedBall | colGroupGreenBall);

	if (mass > 0) {
		body.setActivationState(4);
		// Sync physics and graphics

		// function sync(dt) {
		// 	var ms = body.getMotionState();
		// 	if (ms) {
		// 		ms.getWorldTransform(TRANSFORM_AUX);
		// 		var p = TRANSFORM_AUX.getOrigin();
		// 		var q = TRANSFORM_AUX.getRotation();
		// 		mesh.position.set(p.x(), p.y(), p.z());
		// 		mesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
		// 	}
		// }

		mesh.userData.physicsBody = body;
		rigidBodies.push(mesh);
		//		syncList.push(sync);
	}
	floor_objects.push(mesh);

//	floor_objects.push(sync);

}

//------------------------------------------------------------------------------------------------------------------------------------------------
function createFloor() {

	createBox(new THREE.Vector3(0, -0.5, 0), ZERO_QUATERNION, 750, 1, 750, 0, 2);

	var quaternion = new THREE.Quaternion(0, 0, 0, 1);
	quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 8);
	createBox(new THREE.Vector3(0, -1.5, 90), quaternion, 40, 10, 30, 0);

	var size = 9;
	var nw = 8;
	var nh = 6;
	for (var j = 0; j < nw; j++)
		for (var i = 0; i < nh; i++)
			createBox(new THREE.Vector3(size * j - (size * (nw - 1)) / 2, size * i, 10), ZERO_QUATERNION, size-1, size-1, size-1, 1);



	if (1==2) {

		var geometry = new THREE.Geometry();
		geometry.vertices.push(new THREE.Vector3(-1500, 0, 0));
		geometry.vertices.push(new THREE.Vector3(1500, 0, 0));

		linesMaterial = new THREE.LineBasicMaterial({color: 0x787878, opacity: 0.2, linewidth: .1});

		for (var i = 0; i <= 60; i++) {

			var line = new THREE.Line(geometry, linesMaterial);
			line.position.z = (i * 50) - 1500;
			scene.add(line);

			var line = new THREE.Line(geometry, linesMaterial);
			line.position.x = (i * 50) - 1500;
			line.rotation.y = 90 * Math.PI / 180;
			scene.add(line);
		}

		var geo = new THREE.PlaneBufferGeometry(2000, 2000, 8, 8);
		var mat = new THREE.MeshBasicMaterial({color: 0x0000ff, opacity: 0, wireframe: false});
		mat.transparent = true;
		var plane = new THREE.Mesh(geo, mat);
		plane.position.y = -1;
		plane.rotation.x = -Math.PI / 2;
		plane.receiveShadow = false;
		plane.name = "plane";

		scene.add(plane);
		floor_objects.push(plane);


		let pos = {x: 0, y: 0, z: 0};
		let scale = {x: 600, y: 1, z: 600};

		//threeJS Section
		let blockPlane = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial({color: 0xa0afa4}));

		blockPlane.position.set(pos.x, pos.y, pos.z);
		blockPlane.scale.set(scale.x, scale.y, scale.z);

		blockPlane.castShadow = true;
		blockPlane.receiveShadow = true;
		blockPlane.name = "plane";
		scene.add(blockPlane);
		floor_objects.push(blockPlane);


		//Ammojs Section

		let quat = {x: 0, y: -5, z: 0, w: 1};
		let mass = 0;

		let transform = new Ammo.btTransform();
		transform.setIdentity();
		transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
		transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
		let motionState = new Ammo.btDefaultMotionState(transform);

		let colShape = new Ammo.btBoxShape(new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5));
		colShape.setMargin(0.05);

		let localInertia = new Ammo.btVector3(0, 0, 0);
		colShape.calculateLocalInertia(mass, localInertia);

		let rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, colShape, localInertia);
		let body = new Ammo.btRigidBody(rbInfo);

		physicsWorld.addRigidBody(body, colGroupPlane, colGroupRedBall | colGroupGreenBall);
	}
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
	var intersects = raycaster.intersectObjects(floor_objects);
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
		main_player_Anime.setAnimation('backWalk' + main_player_holdStuff);
	}
	else if (angle > Math.PI * 0.25 && angle < Math.PI * 0.75) {
		if (rightOrLeft === 1) {
			console.log('go right');
			main_player_Anime.setAnimation('rightWalk' + main_player_holdStuff);
		}
		else if (rightOrLeft === -1) {
			console.log('go left');
			main_player_Anime.setAnimation('leftWalk' + main_player_holdStuff);
		}
	}
	else if (angle >= Math.PI * 0.75 && angle <= Math.PI) {
		console.log('go front')
		main_player_Anime.setAnimation('frontWalk' + main_player_holdStuff);
	}

}

//------------------------------------------------------------------------------------------------------------------------------------------------
function stopMovement() {
	movements = [];

	scene.remove(indicatorTop);
	scene.remove(indicatorBottom);
}


//------------------------------------------------------------------------------------------------------------------------------------------------
/*
function move(location, destination, speed = playerSpeed) {
	var moveDistance = speed;

	var transform = new Ammo.btTransform();
	transform = PlayerBody.getCenterOfMassTransform();
//	console.log(transform.getOrigin().x());

	// var tbv30 = new Ammo.btVector3();
	// tbv30 = PlayerBody.getWorldTransform().getOrigin();
	// console.log(tbv30.x());

	// Translate over to the position.
	var posX = transform.getOrigin().x();
	var posY = transform.getOrigin().y() + 1;
	var posZ = transform.getOrigin().z();
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
	var NewX = posX + (moveDistance * (diffX / distance)) * multiplierX;
	var NewZ = posZ + (moveDistance * (diffZ / distance)) * multiplierZ;
	var NewY = posY;


	// NewX = Math.floor(NewX);
	// NewZ = Math.floor(NewZ);

	var tbv31 = new Ammo.btVector3();
	tbv31.setValue(NewX, NewY, NewZ);

	var transform = new Ammo.btTransform();
	transform = PlayerBody.getCenterOfMassTransform();
	console.log(transform.getOrigin().x());
	transform.setOrigin(tbv31);
	PlayerBody.setCenterOfMassTransform(transform);

	console.log(NewX);
//  PlayerBody.setWorldTransform(tbv31);


	// If the position is close we can call the movement complete.
	if ((Math.floor(posX) <= Math.floor(newPosX) + 2.5 &&
		Math.floor(posX) >= Math.floor(newPosX) - 2.5) &&
		(Math.floor(posZ) <= Math.floor(newPosZ) + 2.5 &&
			Math.floor(posZ) >= Math.floor(newPosZ) - 2.5)) {

		// Reset any movements.
		console.log("stop move");
		if (main_player_Anime.animation === 'frontWalk' + main_player_holdStuff) {
			main_player_Anime.setAnimation('frontStand' + main_player_holdStuff)
		}
		else if (main_player_Anime.animation === 'backWalk' + main_player_holdStuff) {
			main_player_Anime.setAnimation('backStand' + main_player_holdStuff)
		}
		else if (main_player_Anime.animation === 'rightWalk' + main_player_holdStuff) {
			main_player_Anime.setAnimation('rightStand' + main_player_holdStuff)
		}
		else if (main_player_Anime.animation === 'leftWalk' + main_player_holdStuff) {
			main_player_Anime.setAnimation('leftStand' + main_player_holdStuff)
		}
		stopMovement();

		// let deltaTime = clock.getDelta();
		// updatePhysics(deltaTime);

		// Maybe move should return a boolean. True if completed, false if not.
	}
}
*/

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

	update();
//  controls.update();
}


function updateSet(setName) {
	$("#object_file").find('option').remove();
	$("#object_group").find('option').remove();

	for (var key in ObjectSets) {
		if (ObjectSets[key].name === setName) {
			for (var key2 in ObjectSets[key].groups) {
				$("#object_group").append('<option value="' + ObjectSets[key].groups[key2].name + '">' + ObjectSets[key].groups[key2].name + '</option>');
//          console.log(sets[key].groups[key2].name);
			}
		}
	}
}

function updateSetGroup() {
	$("#object_file").find('option').remove();
	for (var key in ObjectSets) {
		if (ObjectSets[key].name === $("#object_set").val()) {

			for (var key2 in ObjectSets[key].groups) {
				if (ObjectSets[key].groups[key2].name === $("#object_group").val()) {
					// console.log(ObjectSets[key].groups[key2].name);
					// console.log(ObjectSets[key].groups[key2]);

					for (var key3 in ObjectSets[key].groups[key2].folders) {

						$("#object_file").append('<option value="' + ObjectSets[key].groups[key2].folders[key3] + '">' + ObjectSets[key].groups[key2].folders[key3] + '</option>');
						// console.log(ObjectSets[key].groups[key2].folders[key3]);
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

//    $("#object_name").val(Outline_selectedObject_temp.userData.name);
		console.log(Outline_selectedObject_temp);

//    $('#all_objects option[value="' + Outline_selectedObject_temp.id + '"]').prop('selected', true);


		var position = new THREE.Vector3();
//    console.log(Outline_selectedObject_temp);

		var MeshChild = null;
		if (Outline_selectedObject_temp.isMesh) {
			MeshChild = Outline_selectedObject_temp;
		}
		else if (Outline_selectedObject_temp.children[0].isMesh) {
			MeshChild = Outline_selectedObject_temp.children[0];
		}
		else if (Outline_selectedObject_temp.children[0].children[0].isMesh) {
			MeshChild = Outline_selectedObject_temp.children[0].children[0];
		}
		else if (Outline_selectedObject_temp.children[0].children[0].children[0].isMesh) {
			MeshChild = Outline_selectedObject_temp.children[0].children[0].children[0];
		}
		else if (Outline_selectedObject_temp.children[0].children[0].children[0].children[0].isMesh) {
			MeshChild = Outline_selectedObject_temp.children[0].children[0].children[0].children[0];
		}
		else if (Outline_selectedObject_temp.children[0].children[0].children[0].children[0].children[0].isMesh) {
			MeshChild = Outline_selectedObject_temp.children[0].children[0].children[0].children[0].children[0];
		}


		if (MeshChild !== null) {
			position.setFromMatrixPosition(MeshChild.matrixWorld);
			console.log(position);

			$("#position_x").val(Math.round(position.x * 10000) / 10000);
			$("#position_y").val(Math.round(position.y * 10000) / 10000);
			$("#position_z").val(Math.round(position.z * 10000) / 10000);


			var box = new THREE.Box3().setFromObject(MeshChild);
//      console.log( box.min, box.max, box.getSize() );
			var boxsize = new THREE.Vector3();
			box.getSize(boxsize);
		}
	}
	else {
		outlinePassSelected.selectedObjects = [];
		outlinePass.selectedObjects = [];
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

	//create clock for timing
	clock = new THREE.Clock();

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

	update();
//  controls.update();

	AddLights();

	//skybox
	if (1 == 1) {
		var urls = ['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg'];
		var loaderCube = new THREE.CubeTextureLoader().setPath('./threejs/examples/textures/cube/skyboxsun25deg/');
		loaderCube.load(urls, function (texture) {
			scene.background = texture;
		});
	}


	createCharacter(10, 20, new THREE.Vector3(0, 50, 155), new THREE.Vector3(0, 0, 0));

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
		loadGLTF($("#object_file").val(), "./library/" + $("#object_set").val() + "/" + $("#object_group").val() + "/" + $("#object_file").val() + "/" + $("#object_file").val() + ".gltf", AddNewObjectPoint, scaleFactor, null, "can_move", false, "pass_through", "no_collecting");

	});

	document.addEventListener('keypress', logKey);


	function logKey(e) {
		console.log(e.code);

		if (1==2) {
			if (main_player_Anime.animation === 'frontWalk' + main_player_holdStuff) {
				main_player_Anime.setAnimation('frontStand' + main_player_holdStuff)
			}
			else if (main_player_Anime.animation === 'backWalk' + main_player_holdStuff) {
				main_player_Anime.setAnimation('backStand' + main_player_holdStuff)
			}
			else if (main_player_Anime.animation === 'rightWalk' + main_player_holdStuff) {
				main_player_Anime.setAnimation('rightStand' + main_player_holdStuff)
			}
			else if (main_player_Anime.animation === 'leftWalk' + main_player_holdStuff) {
				main_player_Anime.setAnimation('leftStand' + main_player_holdStuff)
			}

		}

		if (e.code==="KeyA") {
			console.log("A");

			var tbv30 = new Ammo.btVector3();
			tbv30 = PlayerBody.getLinearVelocity();
			var tbv31 = new Ammo.btVector3();
			tbv31.setValue(tbv30.x()-10,tbv30.y(),tbv30.z());
			PlayerBody.setLinearVelocity(tbv31);

			main_player_Anime.setAnimation('leftWalk' + main_player_holdStuff)
		}

		if (e.code==="KeyD") {
			console.log("A");
			var tbv30 = new Ammo.btVector3();
			tbv30 = PlayerBody.getLinearVelocity();
			var tbv31 = new Ammo.btVector3();
			tbv31.setValue(tbv30.x()+10,tbv30.y(),tbv30.z());
			PlayerBody.setLinearVelocity(tbv31);

			main_player_Anime.setAnimation('rightWalk' + main_player_holdStuff)
		}

		if (e.code==="KeyW") {
			console.log("A");

			var tbv30 = new Ammo.btVector3();
			tbv30 = PlayerBody.getLinearVelocity();
			var tbv31 = new Ammo.btVector3();
			tbv31.setValue(tbv30.x(),tbv30.y(),tbv30.z()-10);
			PlayerBody.setLinearVelocity(tbv31);

			main_player_Anime.setAnimation('backWalk' + main_player_holdStuff)
		}

		if (e.code==="KeyS") {
			console.log("A");

			var tbv30 = new Ammo.btVector3();
			tbv30 = PlayerBody.getLinearVelocity();
			var tbv31 = new Ammo.btVector3();
			tbv31.setValue(tbv30.x(),tbv30.y(),tbv30.z()+10);
			PlayerBody.setLinearVelocity(tbv31);

			main_player_Anime.setAnimation('frontWalk' + main_player_holdStuff)
		}


		if (e.code==="KeyQ") {
			console.log("A");
			var tbv30 = new Ammo.btVector3();
			tbv30 = PlayerBody.getLinearVelocity();
			var tbv31 = new Ammo.btVector3();
			tbv31.setValue(tbv30.x(),tbv30.y()+7,tbv30.z());
			PlayerBody.setLinearVelocity(tbv31);
		}

		if (e.code === "KeyC") {
			if (Outline_selectedObject_temp !== null) {
				console.log("pick up " + Outline_selectedObject_temp.userData.name);
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
									data[i].object_physics = "pass_through";
								}

								if (data[i].object_collectible === null || typeof data[i].object_collectible === "undefined") {
									data[i].object_collectible = "no_collecting";
								}

//								loadGLTF(data[i].userName, data[i].filePath, new THREE.Vector3(data[i].position.x, data[i].position.y, data[i].position.z), new THREE.Vector3(data[i].scale.x, data[i].scale.y, data[i].scale.z), new THREE.Vector3(data[i].rotation._x, data[i].rotation._y, data[i].rotation._z), data[i].canMove, true, data[i].object_physics, data[i].object_collectible);


								loadGLTF(data[i].userName, data[i].filePath, new THREE.Vector3(data[i].position.x, data[i].position.y, data[i].position.z), new THREE.Vector3(data[i].scale.x, data[i].scale.y, data[i].scale.z), new THREE.Quaternion(data[i].quaternion._x, data[i].quaternion._y, data[i].quaternion._z, data[i].quaternion._w), data[i].canMove, true, data[i].object_physics, data[i].object_collectible);


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

	$(document).click(function (event) {
		if (event.target.nodeName === "CANVAS") {
			if (!IgnoreThisClick) {
				Outline_checkIntersection(event);
				//SelectObject();
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

//------------------------------------------------------------------------------------------------------------------------------------------------
function update() {
//  camera.updateProjectionMatrix();
	controls.update();
	console.log("update");

	if (main_player !== null) {
//		main_player.lookAt(camera.position);
//  main_player.quaternion.copy(camera.quaternion);
	}
}

//------------------------------------------------------------------------------------------------------------------------------------------------
function renderFrame() {
	if (main_player !== null) {
		// PlayerBody.lookAt(camera.position);
		//main_player.lookAt(camera.position);
//  main_player.quaternion.copy(camera.quaternion);
	}

	let deltaTime = clock.getDelta();
	updatePhysics(deltaTime);

	composer.render();

	requestAnimationFrame(renderFrame);

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
//			move(PlayerBody, movements[0]); //main_player
		}
	}

}

