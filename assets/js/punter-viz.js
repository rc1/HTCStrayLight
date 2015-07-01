/* jshint esnext: true */

// Punter Viz
// ==========
// A three.js visulisation to be
// run on an HTC phone and carried by
// punters into the mirror box.

var PunterViz = (function () {

    // Init & make
    // ===========
    function makeApp () {
        return {
            containerEl: document.createElement( 'div' ),
            backroundColor: 0x616264,
            preRenderFns: [],
            preCubeCamRenderFns: [],
            postCubeCamRenderFns: []
        };
    }

    var initApp = W.composePromisers( makeCameraSceneRenderer,
                                      makeWebCamTexture,
                                      makeCubeCam,
                                      makeWebCamBoxMesh,
                                      makeSwarm,
                                      makeLights,
                                      makeRenderLoop );

    // Promisers
    // =========

    // Camera, Scene, Renderer
    // -----------------------
    function makeCameraSceneRenderer ( app ) {
        return W.promise( function ( resolve, reject ) {
            
            // Camera
            // ------
            app.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 3000 );
            setCameraPosition( app, 0, 0, 200 );

            // Scene
            // -----
            app.scene = new THREE.Scene();

            // Renderer
            // --------
            app.renderer = new THREE.WebGLRenderer( { antialias: false } );
	    app.renderer.setPixelRatio( window.devicePixelRatio );
	    app.renderer.setSize( window.innerWidth, window.innerHeight );
            app.renderer.setClearColor( app.backgroundColor );
	    app.renderer.sortObjects = false;

            app.containerEl.appendChild( app.renderer.domElement );
            
            resolve( app );
        });
    }

    // Web Cam
    // -------
    // Make the web cam available as a texture
    function makeWebCamTexture ( app ) {
        return W.promise( function ( resolve, reject ) {

            // Web Cam DOM Element
            // -------------------
            var webCamEl = document.createElement('video');
            webCamEl.autoplay = true;

            // Web Cam Stream
            // --------------
            navigator.webkitGetUserMedia( { video:true }, function( stream ){
                webCamEl.src = URL.createObjectURL( stream );
            }, function( err ){
                console.log("Failed to get a stream due to", err);
            });

            // Web Cam Texture
            // ---------------
            app.webCamTexture = new THREE.Texture( webCamEl );
            app.webCamTexture.minFilter = THREE.LinearFilter;
            
            // Render Updates
            // --------------
            addPreRenderFn( app, function ( detlaMS, timestampMS ) {
                if( webCamEl.readyState === webCamEl.HAVE_ENOUGH_DATA ){
                    app.webCamTexture.needsUpdate = true;
                }
            });
            
            resolve( app );
        });
    }

    // Cube Camera
    // -----------
    // Create a cube cam for a dynamic envMap.
    // This also enables two hooks: `preCubeCamRenderActions` & `postCubeCamRenderActions`
    // in the app for that object3D in the scene can be turned on and off during
    // the webcams render
    function makeCubeCam ( app ) { 
        return W.promise( function ( resolve, reject ) {

            app.cubeCamera = new THREE.CubeCamera(1, 3000, 256); // near, far, resolution
            app.cubeCamera.renderTarget.minFilter = THREE.LinearMipMapLinearFilter; // mipmap filter
            
            addPreRenderFn( app, function ( deltaMS, timestampMS ) {    
                // Render the cube camera to cube map
                // ----------------------------------
                app.preCubeCamRenderFns.forEach( fn => fn( deltaMS, timestampMS ) );
                app.cubeCamera.updateCubeMap( app.renderer, app.scene );
                app.postCubeCamRenderFns.forEach( fn => fn( deltaMS, timestampMS ) );
            });
            
            resolve( app );
        });
    }

    // Web Cam Box Mesh
    // ----------------
    // Creates a box with the web cam displayed
    // on the inside of each of it's 6 sides
    function makeWebCamBoxMesh ( app ) {
        return W.promise( function ( resolve, reject ) {
            
            var webCamBoxMaterial = new THREE.MeshBasicMaterial({
                map: app.webCamTexture,
                color: 0xffffff,
	        side: THREE.BackSide
            });
            
            app.webCamvBoxMesh = new THREE.Mesh( new THREE.BoxGeometry( 2000, 2000, 2000 ), webCamBoxMaterial );

            var rotationX = W.randomBetween( 0.0002, 0.00002 );
            var rotationY = W.randomBetween( 0.0002, 0.00002 );
            var rotationZ = W.randomBetween( 0.0002, 0.00002 );
            
            // If we want to rotate it
            addPreRenderFn( app, function ( deltaMS, timestampMS ) {
                app.webCamvBoxMesh.rotation.x += ( deltaMS * rotationX );
                app.webCamvBoxMesh.rotation.y += ( deltaMS * rotationY );
                app.webCamvBoxMesh.rotation.z += ( deltaMS * rotationZ );
            });
            
	    app.scene.add( app.webCamvBoxMesh );

            // Show it only for the cube cam
            app.preCubeCamRenderFns.push( function () {
                app.webCamvBoxMesh.visible = true;
            });

            app.postCubeCamRenderFns.push( function () {
                app.webCamvBoxMesh.visible = true;
            });

            

            resolve( app );
        });
    }

    // Lights
    // ------
    function makeLights ( app ) {
        return W.promise( function ( resolve, reject ) {
            app.scene.add( new THREE.AmbientLight( 0x222222 ) );

            var directionalLight = new THREE.DirectionalLight( 0xffffff, 2 );
	    directionalLight.position.set( 2, 1.2, 10 ).normalize();
	    app.scene.add( directionalLight );

	    directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
	    directionalLight.position.set( -2, 1.2, -10 ).normalize();
	    app.scene.add( directionalLight );  
            resolve( app );
        });
    }

    // Swarm
    // -----
    function makeSwarm ( app ) {
        return W.promise( function ( resolve, reject ) {
            
            var particles = [];

            // Add to Scene
            // ------------
            app.swarmObject3D = new THREE.Object3D();
            app.scene.add( app.swarmObject3D );
            app.preCubeCamRenderFns.push( function () {
                app.swarmObject3D.visible = false;
            });
            app.postCubeCamRenderFns.push( function () {
                app.swarmObject3D.visible = true;
            });

            // Loader
            // ------
            var loader = new THREE.OBJLoader();
            loader.load( '/obj/pillow-box.obj', onObjLoaded );

            // Swarm Creation
            // ----------------
            function onObjLoaded ( obj ) {

                var mesh = obj.children[ 0 ];

                // Particle Creation
                // -----------------
                // Ease in the creation of the particles
                var maxParticles = 100;
                var minCreationTime = 5;
                var maxCreationTimeMS = 100;

                var material = 
                (function createMore () {
                    if ( particles.length < maxParticles ) {
                        var particle = new Particle( mesh );
                        app.swarmObject3D.add( particle.anchor );
                        particles.push( particle );
                        setTimeout( createMore, W.map( particles.length / maxParticles, 0, 1, maxCreationTimeMS, minCreationTime, W.interpolations.easeIn ) );
                    }
                }());
            }

            // Updating
            addPreRenderFn( app, function ( deltaMS, timestampMS ) {
                particles.forEach( particle => particle.update( deltaMS, timestampMS ) );
            });

            // Particle Class
            // --------------
            function Particle ( mesh ) {

                this.velocity = W.randomBetween( 0.2, 1 );

                // Mesh
                this.mesh = mesh.clone();
                this.mesh.material = Particle.material.clone();
                this.mesh.scale.x = Particle.initialScale;
                this.mesh.scale.y = Particle.initialScale;
                this.mesh.scale.z = Particle.initialScale;

                // Position
                var range = 100;
                this.mesh.position.set( ( Math.random() - 0.5 ) * range, ( Math.random() - 0.5 ) * range, ( Math.random() - 0.5 ) * range );
                                
                this.anchor = new THREE.Object3D();
                this.anchor.add( this.mesh );
            }

            // ### Static
            Particle.material = new THREE.MeshPhongMaterial( {
		color: 0xffffff,
		shininess: 0.0,
		specular: 0xffffff,
		envMap: app.cubeCamera.renderTarget,
                reflectivity: 1.0,
                side: THREE.DoubleSide
            });

            Particle.initialScale = 200;

            // ### Method
            Particle.prototype.update = function ( deltaMS, timestampMS ) {
                this.anchor.rotation.x += 0.002;
                this.anchor.rotation.y += this.velocity / 10;
                this.anchor.rotation.z += 0.001;
            };
            
            resolve( app );
        });
    }

    // Render Loop
    // -----------
    function makeRenderLoop ( app ) {
        return W.promise( function ( resolve, reject ) {

            var lastTimestampMS = 0;
            var deltaMS = 0;

            (function  loop ( currentTimestampMS ) {
                
                // Recur
                // -----
                window.requestAnimationFrame( loop );

                // Update timestamps
                // ------------------
                deltaMS = currentTimestampMS - lastTimestampMS;
                lastTimestampMS = currentTimestampMS;
                
                // Actionables
                // -----------
                app.preRenderFns.forEach( fn => fn( deltaMS, currentTimestampMS ) );
                
                // Render
                // ------
                app.renderer.clear();
		app.renderer.render( app.scene, app.camera );

            }( lastTimestampMS ));
            
            resolve( app );
        });

    }

    // Utils
    // =====

    // Render Loop
    // -----------
    function addPreRenderFn ( app, fn ) {
        app.preRenderFns.push( fn );
    }

    // Camera
    // ------
    function setCameraPosition ( app, x, y, z ) {
        app.camera.position.x = x;
        app.camera.position.y = y;
        app.camera.position.z = z;
    }
 
    // Export
    // ======    
    return {
        makeApp: makeApp,
        initApp: initApp  
    };
    
}());






