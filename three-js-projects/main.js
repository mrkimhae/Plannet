import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { GUI } from 'https://unpkg.com/three@0.126.1/examples/jsm/libs/dat.gui.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js';

let total_iteration = 100000;

class Object {
    constructor(position, geometry, color) {
        this.position = position;
        this.geometry = geometry;
        this.material = new THREE.MeshLambertMaterial({color: color});
        this.geometry.castShadow = true;
        this.geometry.receiveShadow = true;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
    }
}

class Planet extends Object {
    velocity = new THREE.Vector3(0, 0, 0);
    force = new THREE.Vector3(0, 0, 0);
    last_t = 0;
    count = 0;

    constructor(position, radius, mass, velocity = new THREE.Vector3(0,0,0)) {
        super(position, new THREE.SphereGeometry(radius, 32, 16), 0xff0000);
        this.mass = mass;
        this.velocity = velocity;
        this.setPosition(position);
    }

    setPosition(position){
        this.mesh.position.copy(position);
    }

    setForce(force){
        this.force.copy(force);
    }

    print_position() { console.log('position ',this.mesh.position); }

    update_force(other_planet) {
        if (this.count > total_iteration)
        {
            return;
        }
        const distance_vec = other_planet.mesh.position.clone().sub(this.mesh.position);
        if (distance_vec.lengthSq() == 0.0) { return;}
        const force_mag = (other_planet.mass * this.mass) / distance_vec.lengthSq();
        this.setForce(distance_vec.normalize().multiplyScalar(force_mag));
    }

    update_velocity(now) {
        const acc = this.force.clone().divideScalar(this.mass);
        const delta_t = (now - this.last_t) / 1000;
        this.velocity = this.velocity.clone().add(acc.clone().multiplyScalar(delta_t));
    }

    advance (now) {
        if (this.count > total_iteration){ return; }

        this.count = this.count + 1;

        if (isNaN(now)) { return }

        if (this.last_t == 0) {
            this.last_t = now;
            return;
        } else {
            this.update_velocity(now);
            const delta_t = (now - this.last_t) / 1000;
            var v = this.velocity.clone().multiplyScalar(delta_t);
            this.mesh.position.copy(v.clone().add(this.mesh.position));
            this.last_t = now;
        }
    }

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 10000 );
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
window.addEventListener( 'resize', onWindowResize );

camera.position.set( 0, 0, 200 );

const controls = new OrbitControls(camera, renderer.domElement);
controls.listenToKeyEvents( window );

controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;

controls.screenSpacePanning = false;

controls.minDistance = 10;
controls.maxDistance = 500;

controls.maxPolarAngle = Math.PI / 2;

controls.keys = {
	LEFT: 37, //left arrow
	UP: 38, // up arrow
	RIGHT: 39, // right arrow
	BOTTOM: 40 // down arrow
}

controls.update();

// lights

const dirLight1 = new THREE.DirectionalLight( 0xffffff );
dirLight1.position.set( 10, 10, 10 );
scene.add( dirLight1 );

const dirLight2 = new THREE.DirectionalLight( 0x002288 );
dirLight2.position.set( - 10, - 10, - 10 );
scene.add( dirLight2 );

const ambientLight = new THREE.AmbientLight( 0x222222 );
scene.add( ambientLight );
/*
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshPhongMaterial( {color: 0xffffff});
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

// sphere
const ballGeo = new THREE.SphereGeometry( 1, 32, 16 );
const ballMaterial = new THREE.MeshLambertMaterial();

let sphere
sphere = new THREE.Mesh( ballGeo, ballMaterial );
sphere.castShadow = true;
sphere.receiveShadow = true;
scene.add( sphere );
*/
const plane_geometry = new THREE.PlaneGeometry( 1000, 1000, 32, 32 );
const plane_material = new THREE.MeshBasicMaterial( {color: 0x111111, side: THREE.DoubleSide} );
const plane = new THREE.Mesh( plane_geometry, plane_material );
plane.position.copy(new THREE.Vector3(0, 0, -10));
scene.add( plane );

var earth = new Planet(new THREE.Vector3(-100, 0, 0), 2, 10, new THREE.Vector3(0, 2, 0));
var sun = new Planet(new THREE.Vector3(0, 0, 0), 10, 1000, new THREE.Vector3(0, 0, 0));
scene.add(earth.mesh);
scene.add(sun.mesh);

const earth_trajectory = [];

function update_trajectory(){
    scene.remove(scene.getObjectByName("earth_traj"));

    if (earth_trajectory.length > 1000){
        earth_trajectory.shift();
    }
    earth_trajectory.push( earth.mesh.position.clone() );
    const line_geometry = new THREE.BufferGeometry().setFromPoints( earth_trajectory);
    const trajectory_line = new THREE.Line( line_geometry, new THREE.LineBasicMaterial({ color: 0xaaaaaa}));

    trajectory_line.name = "earth_traj";
    scene.add( trajectory_line );
}

const simulate = function( now ) {
    // spherePosition.z = - Math.sin( now / 601 ) * 5; //+ 40;
	// spherePosition.x = Math.cos( now / 600 ) * 5;
    // planet.mesh.position.copy(spherePosition);
    
    earth.update_force(sun);
    earth.advance(now);
    sun.advance(now);
    // earth.print_position();
    // planet.setPosition(new THREE.Vector3(0, 0.0000001, 0));
    // planet.print_position();
    
    update_trajectory();
}

// Gui
const gui = new GUI({ width: 300 });
const earth_gui = gui.addFolder('earth');
var params = {
    'num': 0
};

earth_gui.add(params, 'num', 1, 20, 0.1);

const animate = function ( now ) {
    requestAnimationFrame( animate );

	controls.update();
    simulate( now );

	renderer.render( scene, camera );
};

animate();