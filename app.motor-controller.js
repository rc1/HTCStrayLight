// Motor Control
// =============
// Client application to control the motors

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var W = require( 'w-js' );
var JSONSocketConnection = require( 'w-js/node/json-socket-connection' );
var MotorInterface = require( './lib/motor-interface' );
var RestesqueUtil = require( './lib/restesque/example/restesque-util-node.js' );

// Make & Init
// ===========

var makeApp = function () {
    return {
        wsPort: W.isDefined( process.env.WS_PORT ) ? process.env.WS_PORT : 7080,
        isEnabled: true
    };
};

var initApp = W.composePromisers( makeMotorInterface,
                                  // doRunMotorInterfaceTestSequence,
                                  makeWebSocketClient,
                                  doStartPostingHeartBeats,
                                  doPostMotorDirectionToNone,
                                  subscribeToIsEnabled,
                                  subscribeRotationDirection,
                                  subscribeRotationSpeed );

initApp( makeApp() )
    .success( function ( app ) {
        report( 'OK', 'Application created' );
    });


// Promisers
// =========

function makeMotorInterface ( app ) {
    return W.promise( function ( resolve, reject ) {
        MotorInterface
            .init( MotorInterface.make() )
            .success( function ( motorInterface ) {
                app.motorInterface = motorInterface;
                resolve( app );      
            })
            .error( reject );
    });
}

function doRunMotorInterfaceTestSequence ( app ) {
    return W.promise( function ( resolve, reject ) {
        MotorInterface.doTestSequence( motorInterface );
        resolve( app );
    });
}

function makeWebSocketClient ( app ) {
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

        app.wsClient.on( 'open', resolveOnFirstConnect );
        app.wsClient.on( 'error', makeReporter( 'Web Socket Error' ) );
        app.wsClient.openSocketConnection();
    });
}

function doPostMotorDirectionToNone ( app ) {
    return W.promise( function ( resolve, reject ) {
        RestesqueUtil.post( app.wsClient, '/motor/rotation/direction/', 'none' ).success( W.partial( resolve, app ) );
    });
}

function subscribeToIsEnabled ( app ) {
    return W.promise( function ( resolve, reject ) {
        RestesqueUtil.subscribeWithInitialGet( app.wsClient, '/motor/controller/is-enabled/', function ( packet ) {
            MotorInterface.doSetEnabled( app.MotorInterface,  packet.getBody() === 'yes' ? true : false );
        }).success( W.partial( resolve, app ) );
    });
}


function doStartPostingHeartBeats ( app ) {
    return W.promise( function ( resolve, reject ) {
        var resolveOnce = once( W.partial( resolve, app ) );
        (function loop () {
            RestesqueUtil
                .now( app.wsClient, '/motor/controller/heartbeat/')
                .success( function () {
                    resolveOnce();
                    setTimeout( loop, 3000 );
                });
        }());
    });
}

function subscribeRotationDirection ( app ) {
    return W.promise( function ( resolve, reject ) {
        RestesqueUtil.subscribeWithInitialGet( app.wsClient, '/motor/rotation/direction/', function ( packet ) {
            if ( packet.getBody() === 'forward' ) {
                MotorInterface.doSetRotationForward( app.motorInterface );
            } else if ( packet.getBody() === 'backward' ) {
                MotorInterface.doSetRotationBackward( app.motorInterface );
            } else if ( packet.getBody() === 'none' ) {
                MotorInterface.doSetRotationNone( app.motorInterface );
            }
        }).success( W.partial( resolve, app ) );
    });
}

function subscribeRotationSpeed ( app ) {
    return W.promise( function ( resolve, reject ) {
        RestesqueUtil.subscribeWithInitialGet( app.wsClient, '/motor/rotation/speed/', function ( packet ) {
            if ( packet.getBody() === 'high' ) {
                MotorInterface.doSetSpeedHigh( app.motorInterface );
            } else if ( packet.getBody() === 'low' ) {
                MotorInterface.doSetSpeedLow( app.motorInterface );
            } else if ( packet.getBody() === 'medium' ) {
                MotorInterface.doSetSpeedMedium( app.motorInterface );
            }
        }).success( W.partial( resolve, app ) );
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

