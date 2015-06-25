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
            webCamEl.width = 200;
            webCamEl.height = 200;
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
        app.camera.x = x;
        app.camera.y = y;
        app.camera.z = y;
    }
 
    // Export
    // ======    
    return {
        makeApp: makeApp,
        initApp: initApp  
    };
    
}());






