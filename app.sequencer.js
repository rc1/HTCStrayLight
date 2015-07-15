// Sequencer
// =========
// Moves the mirror tunnel randomly

// Modules
// =======
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var W = require( 'w-js' );
var JSONSocketConnection = require( 'w-js/node/json-socket-connection' );
var RestesqueUtil = require( './lib/restesque/example/restesque-util-node.js' );

// Make and Init
// =============

function makeSequencer () {
    return {
        wsPort: W.isDefined( process.env.WS_PORT ) ? process.env.WS_PORT : 7080,
        nextSpeedEventRandomRangeSecs: [ 10, 45 ],
        nextDirectionEventRangeSecs: [ 60, 120 ],
        stateSpeed: 'low',
        stateDirection: 'forward'
    };
}

var initSequencer = W.composePromisers( makeWebSocketClient( subscribeToControlMode ), doRandomSpeedStates, doRandomDirectionStates, doStartStatePoster );

initSequencer( makeSequencer() )
    .success( function ( sequencer ) {
        report( 'OK', 'Created sequencer' );
    });

// Promisers
// =========

// Takes a sequence of promiser to connect upon a successful reconnection.
// Even after a reconnect.
function makeWebSocketClient ( onConnectPromisers ) {
    onConnectPromisers = W.toArray( arguments );
    return function ( app ) {
        return W.promise( function ( resolve, reject ) {
            var socketUrl = 'wss://localhost:' + app.wsPort + '/';
            report( 'CONNECTING', 'attempting to connect to:', socketUrl );

            app.wsClient = new JSONSocketConnection( {
                socketUrl: socketUrl
            });

            var resolveOnFirstConnect = once( function () {
                report( 'CONNECTED', 'to:', socketUrl );
                resolve( app );
            });

            app.wsClient.on( 'open', function () {
                if ( W.isDefined( onConnectPromisers ) )
                    W.composePromisers.apply( this, onConnectPromisers )( app ); 
            });
            app.wsClient.on( 'open', resolveOnFirstConnect );
   
            app.wsClient.on( 'error', makeReporter( 'Web Socket Error' ) );
            app.wsClient.openSocketConnection();
        });
    };
}

// Control Mode
// ------------

function subscribeToControlMode ( sequencer ) {
    return W.promise( function ( resolve, reject ) {
        sequencer.controlMode = '';

        RestesqueUtil
            .subscribeWithInitialGet( sequencer.wsClient, '/host/control/mode/', function ( packet ) {
                sequencer.controlMode = packet.getBody();
            })
            .success( function () {
                resolve( sequencer );
            });
    });
}

// Randomisers
// -----------

function doRandomSpeedStates ( sequencer ) {
    return W.promise( function ( resolve, reject ) {

        var options = [ 'high', 'low', 'medium' ];

        (function loop () {
            setTimeout( loop, W.randomBetween( sequencer.nextSpeedEventRandomRangeSecs[ 0 ], sequencer.nextSpeedEventRandomRangeSecs[ 1 ] ) * 1000 );
            sequencer.stateSpeed = takeRandom( options );
        }());
        
        resolve( sequencer );
    });
}

function doRandomDirectionStates ( sequencer ) {
    return W.promise( function ( resolve, reject ) {

        var options = [ 'forward', 'backward' ];

        (function loop () {
            setTimeout( loop, W.randomBetween( sequencer.nextSpeedEventRandomRangeSecs[ 0 ], sequencer.nextSpeedEventRandomRangeSecs[ 1 ] ) * 1000 );
            sequencer.stateDirection = takeRandom( options );
        }());
        
        resolve( sequencer );
    });
}

// State Poster
// ------------
// Posts the state to restesque if active

function doStartStatePoster ( sequencer ) {
    return W.promise( function ( resolve, reject ) {
        var lastSpeedState = '';
        var lastDirectionState = '';
        
        (function loop () {
            setTimeout( loop, 500 );
            if ( sequencer.controlMode !== 'sequence' ) {
                return;
            }
            // Speed
            if ( lastSpeedState != sequencer.stateSpeed ) {
                report( 'Sequencer', 'Changed speed:', sequencer.stateSpeed  );
                RestesqueUtil.post( sequencer.wsClient, '/motor/rotation/speed/', sequencer.stateSpeed );
                lastSpeedState = sequencer.stateSpeed;
            }
            // Direction
            if ( lastDirectionState != sequencer.stateDirection ) {
                report( 'Sequencer', 'Changed direction:', sequencer.stateDirection );
                RestesqueUtil.post( sequencer.wsClient, '/motor/rotation/direction/', sequencer.stateDirection );
                lastDirectionState = sequencer.stateDirection;
            }
        }());
        resolve( sequencer );
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

// Array
// -----

function takeRandom ( arr ) {
    return arr[ Math.floor( Math.random() * arr.length ) ];
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

