/* jshint esnext: true */

// Punter Viz
// ==========
// A three.js visulisation to be
// run on an HTC phone and carried by
// punters into the mirror box.

var PunterViz = (function () {

    // Init & make
    // ===========
    function makeViz () {
        return {
            containerEl: document.createElement( 'div' ),
            backroundColor: 0x616264,
            velocity: [ 0, 0, 0 ],
            deviceRotation: [ 0, 0, 0 ],
            preRenderFns: [],
            preCubeCamRenderFns: [],
            postCubeCamRenderFns: [],
            wsClient: undefined,
            height: 640,
            width: 360,
            swarmColor: new THREE.Color( 0xffffff ),
            backgroundColor: new THREE.Color( 0xA5CF4C )
        };
    }

    var initViz = W.composePromisers( subscribeToHostControlMode,
                                      makeCameraSceneRenderer,
                                      makeWebCamTexture,
                                      makeWebCamMaterial,
                                      makeCubeCam,
                                      // makeWebCamBoxMesh,
                                      makeWebCamHedronMesh,
                                      makeBillboardBackground,
                                      makeSwarm,
                                      makeLights,
                                      makeRenderLoop );

    // Promisers
    // =========

    // Restesque
    // ---------
    function subscribeToHostControlMode ( viz ) {
        return W.promise( function ( resolve, reject ) {
            viz.controlMode = '';

            subscribe();
            viz.wsClient.on( 'open', subscribe );

            function subscribe () {
                RestesqueUtil
                    .subscribeWithInitialGet( app.wsClient, '/host/control/mode/', function ( packet ) {
                        app.controlMode = packet.getBody();
                        console.log( 'Control Mode Change to:', app.controlMode );
                    });
            }

            resolve( viz );
        });
    }

    // Camera, Scene, Renderer
    // -----------------------
    function makeCameraSceneRenderer ( viz ) {
        return W.promise( function ( resolve, reject ) {
            
            // Camera
            // ------
            viz.camera = new THREE.PerspectiveCamera( 70, viz.width / viz.height, 1, 30000 );
            setCameraPosition( viz, 0, 0, 200 );

            // Scene
            // -----
            viz.scene = new THREE.Scene();

            // Renderer
            // --------
            viz.renderer = new THREE.WebGLRenderer( { antialias: false } );
            viz.renderer.setPixelRatio( window.devicePixelRatio );
            viz.renderer.setSize( viz.width, viz.height );
            viz.renderer.setClearColor( viz.backgroundColor );
            viz.renderer.sortObjects = false;

            viz.containerEl.appendChild( viz.renderer.domElement );
            
            resolve( viz );
        });
    }

    // Web Cam
    // -------
    // Make the web cam available as a texture
    function makeWebCamTexture ( viz ) {
        return W.promise( function ( resolve, reject ) {
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
            viz.webCamTexture = new THREE.Texture( webCamEl );
            viz.webCamTexture.minFilter = THREE.LinearFilter;
            
            // Render Updates
            // --------------
            addPreRenderFn( viz, function ( detlaMS, timestampMS ) {
                if( webCamEl.readyState === webCamEl.HAVE_ENOUGH_DATA ){
                    viz.webCamTexture.needsUpdate = true;
                }
            });
            
            resolve( viz );
        });
    }

    // Cube Camera
    // -----------
    // Create a cube cam for a dynamic envMap.
    // This also enables two hooks: `preCubeCamRenderActions` & `postCubeCamRenderActions`
    // in the viz for that object3D in the scene can be turned on and off during
    // the webcams render
    function makeCubeCam ( viz ) { 
        return W.promise( function ( resolve, reject ) {

            viz.cubeCamera = new THREE.CubeCamera( 1, 30000, 256 ); // near, far, resolution
            viz.cubeCamera.renderTarget.minFilter = THREE.LinearMipMapLinearFilter; // mipmap filter
            
            addPreRenderFn( viz, function ( deltaMS, timestampMS ) {    
                // Render the cube camera to cube map
                // ----------------------------------
                viz.preCubeCamRenderFns.forEach( fn => fn( deltaMS, timestampMS ) );
                viz.cubeCamera.updateCubeMap( viz.renderer, viz.scene );
                viz.postCubeCamRenderFns.forEach( fn => fn( deltaMS, timestampMS ) );
            });
            
            resolve( viz );
        });
    }

    // Web Cam Material
    // ----------------
    function makeWebCamMaterial ( viz ) {
        return W.promise( function ( resolve, reject ) {
            viz.webCamMaterial = new THREE.MeshBasicMaterial({
                map: viz.webCamTexture,
                color: 0xffffff,
                side: THREE.DoubleSide
            });
            resolve( viz );
        });

    }

    // Web Cam Box Mesh
    // ----------------
    // Creates a box with the web cam displayed
    // on the inside of each of it's 6 sides
    function makeWebCamBoxMesh ( viz ) {
        return W.promise( function ( resolve, reject ) {
            
            viz.webCamvBoxMesh = new THREE.Mesh( new THREE.BoxGeometry( 2000, 2000, 2000 ), viz.webCamMaterial );

            var rotationX = W.randomBetween( 0.0002, 0.00002 );
            var rotationY = W.randomBetween( 0.0002, 0.00002 );
            var rotationZ = W.randomBetween( 0.0002, 0.00002 );
            
            // If we want to rotate it
            addPreRenderFn( viz, function ( deltaMS, timestampMS ) {
                viz.webCamvBoxMesh.rotation.x += ( deltaMS * rotationX );
                viz.webCamvBoxMesh.rotation.y += ( deltaMS * rotationY );
                viz.webCamvBoxMesh.rotation.z += ( deltaMS * rotationZ );
            });
            
            viz.scene.add( viz.webCamvBoxMesh );

            // Show it only for the cube cam
            viz.preCubeCamRenderFns.push( function () {
                viz.webCamvBoxMesh.visible = true;
            });

            viz.postCubeCamRenderFns.push( function () {
                viz.webCamvBoxMesh.visible = true;
            });

            resolve( viz );
        });
    }

    function makeBillboardBackground ( viz ) {
        return W.promise( function ( resolve, reject ) {
            var texture =  THREE.ImageUtils.loadTexture( '/image/billboard-background.png' );
            texture.minFilter = THREE.NearestFilter;
            texture.magFiler = THREE.NearestFilter;
            
            var material = new THREE.MeshBasicMaterial({
                map: texture,
                color: 0xffffff,
                transparent: true
            });

            var geometry = new THREE.PlaneBufferGeometry( 360, 640 );

            var mesh = new THREE.Mesh( geometry, material );

            mesh.translateZ( -250 );

            viz.scene.add( mesh );

            viz.preCubeCamRenderFns.push( function () {
                mesh.visible = false;
            });

            viz.postCubeCamRenderFns.push( function () {
                mesh.visible = true;
            });
            
            resolve( viz );
        });
    }

    // Web Cam Hedron Mesh
    // -------------------
    function makeWebCamHedronMesh ( viz ) {
        return W.promise( function ( resolve, reject ) {

            // Loader
            // ------
            var loader = new THREE.OBJLoader();
            loader.load( '/obj/hedron.obj', onObjLoaded );

            // Swarm Creation
            // ----------------
            function onObjLoaded ( obj ) {
                console.log( obj.children[ 0 ] );
                viz.webCamHedronMesh = obj.children[ 0 ].clone(); //new THREE.Mesh( new THREE.BoxGeometry( 2000, 2000, 2000 ), material );
                viz.webCamHedronMesh.material = viz.webCamMaterial.clone();
                
                var scale = 6000;
                viz.webCamHedronMesh.scale.set( scale, scale, scale );

                var rotationX = W.randomBetween( 0.0002, 0.00002 );
                var rotationY = W.randomBetween( 0.0002, 0.00002 );
                var rotationZ = W.randomBetween( 0.0002, 0.00002 );
                
                // If we want to rotate it
                addPreRenderFn( viz, function ( deltaMS, timestampMS ) {
                    viz.webCamHedronMesh.rotation.x += viz.velocity[ 0 ] * 0.5;
                    viz.webCamHedronMesh.rotation.y += viz.velocity[ 1 ] * 0.5;
                    viz.webCamHedronMesh.rotation.z += viz.velocity[ 2 ] * 0.5;
                });
                
                viz.scene.add( viz.webCamHedronMesh );

                // Show it only for the cube cam
                viz.preCubeCamRenderFns.push( function () {
                    viz.webCamHedronMesh.visible = true;
                    viz.webCamHedronMesh.wireframe = false;
                    viz.webCamHedronMesh.material.color.set( 0xffffff );
                });

                viz.postCubeCamRenderFns.push( function () {
                    viz.webCamHedronMesh.visible = true;
                    viz.webCamHedronMesh.material.color.set( viz.backgroundColor );
                });

                resolve( viz );
            }
            
        });
    }

    // Lights
    // ------
    function makeLights ( viz ) {
        return W.promise( function ( resolve, reject ) {
            viz.scene.add( new THREE.AmbientLight( 0x222222 ) );

            var directionalLight = new THREE.DirectionalLight( 0xffffff, 2 );
            directionalLight.position.set( 2, 1.2, 10 ).normalize();
            viz.scene.add( directionalLight );

            directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
            directionalLight.position.set( -2, 1.2, -10 ).normalize();
            viz.scene.add( directionalLight );  
            resolve( viz );
        });
    }

    // Swarm
    // -----
    function makeSwarm ( viz ) {
        return W.promise( function ( resolve, reject ) {
            
            var particles = [];

            // Add to Scene
            // ------------
            viz.swarmObject3D = new THREE.Object3D();
            viz.scene.add( viz.swarmObject3D );
            viz.preCubeCamRenderFns.push( function () {
                viz.swarmObject3D.visible = false;
            });
            viz.postCubeCamRenderFns.push( function () {
                viz.swarmObject3D.visible = true;
            });

            // Updating
            addPreRenderFn( viz, function ( deltaMS, timestampMS ) {
                particles.forEach( particle => particle.update( deltaMS, timestampMS ) );
            });

            // Particle Class
            // --------------
            function Particle ( mesh ) {

                this.velocity = [ 0, 0, 0 ];

                // Mesh
                this.mesh = mesh.clone();
                this.anchor = new THREE.Object3D();
                this.anchor.add( this.mesh );
                this.mesh.material = Particle.material.clone();
                //this.mesh.material.color.offsetHSL( 0.15 - W.randomBetween( -0.1, 0.1 ), 0.3, -0.3 );
                //this.mesh.material.color.setStyle( 'rgb( 241, 86, 35)' );
                //this.mesh.material.color.offsetHSL( 0.219444444, 1, -0.5 );
                this.mesh.material.color = viz.swarmColor;

                var range = 70;
                this.mesh.translateX( W.randomBetween( -range, range ) );
                this.mesh.translateY( W.randomBetween( -range, range ) );
                this.mesh.translateZ( W.randomBetween( -range, range ) );

                this.distance = W.map( this.mesh.position.distanceTo( this.anchor.position ), 0, range, 1, 0.1, true );

                var scaleMutiplier = 250;
                var d = W.interpolations.quarticEaseOut( this.distance );
                this.mesh.scale.set( d * scaleMutiplier / 2, d * scaleMutiplier / 2, d * scaleMutiplier );

                var r = toRad( 180 );
                this.mesh.rotation.x = W.randomBetween( -r, r );
                this.mesh.rotation.y = W.randomBetween( -r, r );
                this.mesh.rotation.z = W.randomBetween( -r, r );

                var offest = 0.2;
                this.anchor.rotation.x +=  W.randomBetween( -toRad(20), toRad(20)  );

                this.rotationSpeed = [ Math.random(), Math.random(), Math.random() ].map( Math.abs );

                function toRad ( v ) { return v * 0.0174532925; } 
            }

            // ### Static
            Particle.material = new THREE.MeshPhongMaterial( {
                color: 0xffffff,
                shininess: 0.0,
                specular: 0xffffff,
                envMap: viz.cubeCamera.renderTarget,
                reflectivity: 1.0,
                side: THREE.DoubleSide
            });

            // ### Method
            Particle.prototype.update = function ( deltaMS, timestampMS ) {

                this.velocity[ 0 ] += ( viz.velocity[ 0 ] - this.velocity[ 0 ] ) * ( 1 - this.distance ) * 0.05;
                this.velocity[ 1 ] += ( viz.velocity[ 1 ] - this.velocity[ 1 ] ) * ( 1 - this.distance ) * 0.05;
                this.velocity[ 2 ] += ( viz.velocity[ 2 ] - this.velocity[ 2 ] ) * ( 1 - this.distance ) * 0.05;

                this.anchor.rotation.x += this.velocity[ 0 ] * 0.4;
                this.anchor.rotation.y += this.velocity[ 1 ] * 0.4;
                this.anchor.rotation.z += this.velocity[ 2 ] * 0.4;

                var r = Math.max( this.velocity[ 0 ], this.velocity[ 1 ], this.velocity[ 2 ] );

                this.mesh.rotation.x += 0.01 * this.rotationSpeed[ 0 ]; // r * this.rotationSpeed[ 0 ] * 10;
                this.mesh.rotation.y += 0.01 * this.rotationSpeed[ 1 ] ; //r * this.rotationSpeed[ 1 ] * 10;
                this.mesh.rotation.z += 0.01 * this.rotationSpeed[ 2 ]; //r * this.rotationSpeed[ 2 ] * 10
            };

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
                var maxParticles = 120;
                var minCreationTime = 5;
                var maxCreationTimeMS = 20;
                
                (function createMore () {
                    if ( particles.length < maxParticles ) {
                        var particle = new Particle( mesh );
                        viz.swarmObject3D.add( particle.anchor );
                        particles.push( particle );
                        setTimeout( createMore, W.map( particles.length / maxParticles, 0, 1, maxCreationTimeMS, minCreationTime, W.interpolations.easeIn ) );
                    }
                }());
            }
            
            resolve( viz );
        });
    }

    // Render Loop
    // -----------
    function makeRenderLoop ( viz ) {
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
                viz.preRenderFns.forEach( fn => fn( deltaMS, currentTimestampMS ) );
                
                // Render
                // ------
                viz.renderer.render( viz.scene, viz.camera );

            }( lastTimestampMS ));
            
            resolve( viz );
        });

    }

    // Utils
    // =====

    // Render Loop
    // -----------
    function addPreRenderFn ( viz, fn ) {
        viz.preRenderFns.push( fn );
        return viz;
    }

    // Camera
    // ------
    function setCameraPosition ( viz, x, y, z ) {
        viz.camera.position.x = x;
        viz.camera.position.y = y;
        viz.camera.position.z = z;
        return viz;
    }

    function setVelocity ( viz, x, y, z ) {
        if ( W.isDefined( x ) && x !== null ) { viz.velocity[ 0 ] = x; }
        if ( W.isDefined( y ) && y !== null ) { viz.velocity[ 1 ] = y; }
        if ( W.isDefined( z ) && z !== null ) { viz.velocity[ 2 ] = z; }
        return viz;
    }
    
    // Export
    // ======    
    return {
        makeViz: makeViz,
        initViz: initViz,
        setVelocity: setVelocity
    };
    
}());






