/* jshint esnext: true */

// Main.js
// =======
// Entry point of the application.

// Make & Init
// ===========

var makeApp = function () {
    return {
        wsUrl: W.join( document.location.protocol === 'https:' ? 'wss://' : 'ws://',
                       document.location.host, //document.'///'//'wss://192.168.0.7:7080'
                       '/' )
    };
};

var initApp = W.composePromisers( makeWebSocketClient,
                                  subscribeToHostControlMode,
                                  addPunterCid,
                                  makePunterVizs,
                                  makeRestRadioButtons );

$( function () {
    initApp( makeApp() )
    .success( function ( app ) {
        report( 'OK', 'TheWorkers.net' );
        window.app = app;
    });
});

// Promisers
// =========

function makeWebSocketClient ( app ) {
    return W.promise( function ( resolve, reject ) {
        console.log( 'Connecting to websocket client:', app.wsUrl );
        
        app.wsClient = new W.JSONSocketConnection({
            socketUrl: app.wsUrl
        });
        
        var resolveOnFirstConnect = once( function () {
            $( '[data-disconnected-warning]' ).remove();
            report( 'CONNECTED', 'to:', app.wsUrl );
            resolve( app );
        });

        app.wsClient.on( 'open', resolveOnFirstConnect );
        app.wsClient.on( 'error', makeReporter( 'Web Socket Error' ) );
        app.wsClient.on( 'close', makeReporter( 'Web Socket Close' ) );
        app.wsClient.openSocketConnection();
    });
}

function subscribeToHostControlMode ( app ) {
    return W.promise( function ( resolve, reject ) {
        app.controlMode = '';
        RestesqueUtil
            .subscribeWithInitialGet( app.wsClient, '/host/control/mode/', function ( packet ) {
                app.controlMode = packet.getBody();
                console.log( 'Control Mode Change to:', app.controlMode );
            })
            .success( function () {
                resolve( app );
            });
    });
}

function addPunterCid ( app ) {
    return W.promise( function ( resolve, reject ) {
        app.punterCid = $( '[data-punter-cid]' ).data( 'punterCid' );
        resolve( app );
    });
}

// Punter Viz
// ----------

function makePunterVizs ( app ) {
    return W.promise( function ( resolve, reject ) {
        $( "[data-punter-viz]" )
            .toArray()
            .map( function ( el ) {
                // Make the punter application
                app.punterViz = PunterViz.makeViz();
                // Add out dom element
                app.punterViz.containerEl = el;

                // Initailise it

                var FORWARDS_HIGH = [ [ '/' ] ];
                
                PunterViz
                    .initViz( app.punterViz )
                    .error( function ( err ) {
                        console.error( 'Failed to create Punter app', err );
                    }) 
                    .success( function ( viz ) {

                        // Device Rotation
                        // ===============

                        // Non-Mobile / Debug
                        // ------------------
                        if ( window.location.search.indexOf( 'debug') > -1 ) {

                            // Make
                            var rangeEl = document.createElement( 'input' );
                            rangeEl.setAttribute( 'type', 'range' );
                            rangeEl.setAttribute( 'min', -1 );
                            rangeEl.setAttribute( 'max', 1 );
                            rangeEl.setAttribute( 'step', 0.01 );
                            rangeEl.setAttribute( 'value', 0.25 );
                            rangeEl.setAttribute( 'style', 'position: absolute' );

                            $( rangeEl )
                                .asEventStream( 'change' )
                                .map( event => event.currentTarget )
                                .map( el => $( el ).val() )
                                .onValue( v => PunterViz.setVelocity( viz, null, v, null ) );

                            $( '#punter' ).prepend( rangeEl );
                            
                        }
                        
                        // Mobile
                        // ------
                        var rotationStep = 25.714285714;

                        // Add the rotation controls
                        // gamma right 90, left -90
                        var orientationStream =  $( window )
                                .asEventStream( 'deviceorientation' )
                                .map( e => [ e.originalEvent.gamma, e.originalEvent.alpha, e.originalEvent.beta ] );

                        var gammaStream = orientationStream
                            .map( arr => arr[ 1 ] );

                        orientationStream
                            .throttle( 300 )
                            .onValue( arr => PunterViz.setVelocity( viz, null,  W.map( arr[0], -180, 180, -3, 3, true ), null ) );

                        // orientationStream
                        //     .onValue( arr => viz.camera.rotation.z = arr[ 1 ] );
                        

                        // [ bh, bm, bl, n, fl, fm, fh ]
                        
                        // Forwards & Backwards
                        gammaStream
                            .map( function ( g ) {
                                if ( g < -rotationStep ) { return 'backward'; }
                                else if ( g > rotationStep ) { return 'forward'; }
                                else { return 'none'; } 
                            })
                            .skipDuplicates()
                            .throttle( 100 )
                            .onValue( function ( direction ) {
                                if ( 'phone-' + app.punterCid === app.controlMode ) {
                                    RestesqueUtil.post( app.wsClient, '/motor/rotation/direction/', direction );
                                }
                            });

                        // Speed
                        gammaStream
                            .map( g => Math.abs( g ) )
                            .map( function ( g ) {
                                if ( g > 90 - rotationStep ) { return 'high'; }
                                else if ( g > 90 - ( rotationStep * 2 ) ) { return 'medium'; }
                                else { return 'low'; }
                            })
                            .throttle( 100 )
                            .onValue( function ( speed ) {
                                if ( 'phone-' + app.punterCid === app.controlMode ) {
                                    RestesqueUtil.post( app.wsClient, '/motor/rotation/speed/', speed );
                                }
                            });
                        
                        console.log( 'Punter application made' );
                        
                    });
            });
        resolve( app );
    });
}

// jQuery Mobile Ui Bindings
// -------------------------

function makeRestRadioButtons ( app ) {
    return W.promise( function ( resolve, reject ) {
        // Radio Buttons
        // =============
        $( '[data-rest-type="radio-post"]' )
            .toArray()
            .map( $ )
            .map( function ( $el ) {
                // Disable real events
                var $wrapperEl = $el.parent();
                $wrapperEl.on( 'click touchend', function ( e ) {
                    e.preventDefault();
                    console.log( 'sending',$el.val(), 'to', $el.data( 'restUri' )  );
                    RestesqueUtil.post( app.wsClient, $el.data( 'restUri' ), $el.val() );
                    return false;
                });
            });

        // Radio Field Sets
        // ================
        $( '[data-rest-type="feildset"]' )
            .toArray()
            .map( $ )
            .map( function ( $el ) {

                var radioEls = $el.find( 'input[type="radio"]' ).checkboxradio();
                
                console.log(  'got a field set', $el.data( 'restUri' ) );
                RestesqueUtil.subscribeWithInitialGet( app.wsClient, $el.data( 'restUri' ), function ( packet ) {
                    radioEls
                        .prop( 'checked', false )
                        .checkboxradio( 'refresh' )
                        .filter( 'input[value="'+ packet.getBody() +'"]' )
                        .attr( 'checked', 'checked' )
                        .checkboxradio( 'refresh' )
                        .parent()
                        .find( 'label' )
                        .removeClass( 'ui-radio-off' )
                        .addClass( 'ui-radio-on' );
                });
            });
        
        resolve( app );
    });
}

// Utils
// =====

// Function
// --------
    
function once ( fn ) {
    var hasTriggered = false;
    return function () {
        if ( ! hasTriggered ) {
            fn();
            hasTriggered = true;
        }
    };
}

// Reporting
// ---------

function report( status, str ) {
    console.log( '[', status, ']', W.rest( W.toArray( arguments ) ).join( ' ' ) );
}

function makeReporter( status, str ) {
    var reportArgs = arguments;
    return function () {
        report.apply( this, reportArgs );
        var calleeArgs = arguments;
        return W.promise( function ( resolve, reject ) {
            resolve.apply( this, calleeArgs );
        });
    };
}
