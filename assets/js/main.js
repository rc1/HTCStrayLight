

$( function () {

    // Punters
    // =======
    $( "[data-punter]" )
        .toArray()
        .map( function ( container ) {

            var actions = [];

            var windowHalfX = window.innerWidth / 2;
	    var windowHalfY = window.innerHeight / 2;
            var height =  window.innerHeight;

            var camera = new THREE.PerspectiveCamera( 70, window.innerWidth / height, 1, 3000 );
            camera.position.y = 0;
	    camera.position.z = 200;

            var scene = new THREE.Scene();

            var renderer = new THREE.WebGLRenderer( { antialias: false } );
	    renderer.setPixelRatio( window.devicePixelRatio );
	    renderer.setSize( window.innerWidth, height );
            renderer.setClearColor( 0x616264 );
	    renderer.sortObjects = false;
            
	    container.appendChild( renderer.domElement );

            var object = new THREE.Object3D();
	    scene.add( object );

            var r = "/png/";
            
	    var urls = [ r + "px.jpg", r + "nx.jpg",
	        	 r + "py.jpg", r + "ny.jpg",
	        	 r + "pz.jpg", r + "nz.jpg" ];

	    var textureCube = THREE.ImageUtils.loadTextureCube( urls  );
	    textureCube.format = THREE.RGBFormat;

            var video      = document.createElement('video');
            video.width    = 200;
            video.height   = 200;
            video.autoplay = true;

            var cubeCamera = new THREE.CubeCamera(1, 3000, 256); // parameters: near, far, resolution
            cubeCamera.renderTarget.minFilter = THREE.LinearMipMapLinearFilter; // mipmap filter

            scene.add(cubeCamera);

            navigator.webkitGetUserMedia( { video:true }, function(stream){
                video.src    = URL.createObjectURL(stream);
            }, function(error){
                console.log("Failed to get a stream due to", error);
            });

            var videoTexture = new THREE.Texture( video );
            videoTexture.minFilter = THREE.LinearFilter;

            var videoBoxMaterial = new THREE.MeshBasicMaterial({
                map: videoTexture,
                color: 0xffffff,
	        side: THREE.BackSide
            });
            var videoBoxMesh = new THREE.Mesh( new THREE.BoxGeometry( 2000, 2000, 2000 ), videoBoxMaterial );
	    scene.add( videoBoxMesh );

	    // Skybox
	    var shader = THREE.ShaderLib[ "cube" ];
	    shader.uniforms[ "tCube" ].value = textureCube;

	    var material = new THREE.ShaderMaterial( {
	        fragmentShader: shader.fragmentShader,
	        vertexShader: shader.vertexShader,
	        uniforms: shader.uniforms,
	        depthWrite: false,
	        side: THREE.BackSide
	    } );

            var mesh = new THREE.Mesh( new THREE.BoxGeometry( 1000, 1000, 1000 ), material );
	    // scene.add( mesh );

            // instantiate a loader
            var loader = new THREE.OBJLoader();

            // load a resource
            loader.load(
                // resource URL
                '/pillow-box.obj',
                // Function when resource is loaded
                function ( object ) {
                    //object.scale.set( 600, 600, 600 );
                    createOrb( object.children[ 0 ] );
                }
            );

            // Add Balls
	    var geometry = new THREE.PlaneGeometry( 10, 10, 3 );

            function createOrb( mesh ) {

	        for ( var i = 0; i < 20; i ++ ) {
		    // MeshPhongMaterial
		    var ballmaterial = new THREE.MeshPhongMaterial( {
		        color: 0xe8e2c1,
		        shininess: 0.0,
		        specular: 0xffffff ,
		        envMap: cubeCamera.renderTarget,
                        reflectivity: 1.0,
                        side: THREE.DoubleSide
                        //map: videoTexture
                    });

		    //var mesh = new THREE.Mesh( geometry, ballmaterial );
                    mesh = mesh.clone();
                    mesh.material = ballmaterial;

                    mesh.scale.set( 10, 10, 10 );
                    var anchor = new THREE.Object3D();
                    anchor.add( mesh );

                    var positionScalar = 300;
                    var speed = W.randomBetween( 0.3, 1 );

                    var s = 1.2
                    mesh.scale.set( (1-speed)*s, (1-speed)*s, (1-speed)*s );
                    
		    mesh.position.set(
		        //( Math.random() - 0.5 ) * positionScalar,
                        // 0,
		        W.map( speed, 0.1, 1, positionScalar/2, positionScalar * 0.2 ),
                        0,
                        0
		        //( Math.random() - 0.5 ) * positionScalar
		    );

                    anchor.rotation.set( ( Math.random() - 0.5 ) * 1.2, ( Math.random() - 0.5 ) * 1.3, ( Math.random() - 0.5 ) * W.PI_2 );

		    mesh.scale.multiplyScalar( 500 );
		    object.add( anchor );

                    actions.push( ( function ( anchor, mesh, speed ) {
                        return function () {
                            anchor.rotation.y += W.map( speed, 1, 0, 0.09, 0.00001, W.interpolations.exponentialEaseOut  );
                            mesh.rotation.x += W.map( speed, 1, 0, 0.09, 0.00001 );
                            mesh.rotation.y += W.map( speed, 1, 0, 0.09, 0.00001 );
                            mesh.rotation.z += W.map( speed, 1, 0, 0.09, 0.00001 );
                        }; 
                    }( anchor, mesh, speed )));
	        }
            }

            scene.add( new THREE.AmbientLight( 0x222222 ) );

            var directionalLight = new THREE.DirectionalLight( 0xffffff, 2 );
	    directionalLight.position.set( 2, 1.2, 10 ).normalize();
	    scene.add( directionalLight );

	    directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
	    directionalLight.position.set( -2, 1.2, -10 ).normalize();
	    scene.add( directionalLight );  


            // Render
            var time = 0;
            (function loop ( delta ) {
                if( video.readyState === video.HAVE_ENOUGH_DATA ){
                    videoTexture.needsUpdate = true;
                }
                videoBoxMesh.visible = true;
                object.visible = false;
                cubeCamera.updateCubeMap(renderer, scene);
                object.visible = true;
                videoBoxMesh.visible = false;

                // videoBoxMesh.rotation.x += 0.1;
                // videoBoxMesh.rotation.y += 0.1;
                // videoBoxMesh.rotation.z += 0.1;
                
                window.requestAnimationFrame( loop );
                renderer.clear();
		renderer.render( scene, camera );
                time += delta;
                actions.forEach( function ( action ) { action( delta, time ); } );
            }( 0 ));  

            
        });

});

