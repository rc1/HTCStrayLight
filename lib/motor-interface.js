
// Modules
// =======
var pfio;
try {
    pfio = require( 'piface-node' );
} catch ( err ) {
    console.error( 'Failed to load piface-node' );
}

var W = require( 'w-js' );

// Motor Interface
// ===============

// ### Notes:
// Enabled needs to be set first

var MotorInterface = (function () {

    function make () {
        return {
            relayConfig: {
                STF: 0, // Forward Rotation Start
                STR: 1, // Reverse Rotation Start
                RL: 5, // Low
                RM: 6, // Medium
                RH: 7, // High,
                PC: 3 // Common Ground
            },
            verbose: true
        };
    }

    var init = W.composePromisers( turnOffAllRelays );

    // Promisers
    // =========

    function turnOffAllRelays ( motorInterface ) {
        return W.promise( function ( resolve, reject ) {
            if ( pfio ) {
                if ( motorInterface.verbose ) { report( 'MOTOR VERBOSE', 'Disabling all relays' ); }
                pfio.init();
                pfio.write_output( 0 );
                pfio.deinit();
            }
            resolve( motorInterface );
        });
    }

    // Utils
    // =====

    // Rotation
    // --------
    
    function doSetRotationForward ( motorInterface ) {
        doSetRelay( motorInterface.relayConfig.STR, false );
        doSetRelay( motorInterface.relayConfig.STF, true );
        if ( motorInterface.verbose ) { report( 'MOTOR VERBOSE', 'Set rotation Forward' ); }
        return motorInterface;
    }

    function doSetRotationBackward ( motorInterface ) {
        doSetRelay( motorInterface.relayConfig.STF, false );
        doSetRelay( motorInterface.relayConfig.STR, true );
        if ( motorInterface.verbose ) { report( 'MOTOR VERBOSE', 'Set rotation Backward' ); }
        return motorInterface;
    }

    function doSetRotationNone ( motorInterface ) {
        doSetRelay( motorInterface.relayConfig.STF, false );
        doSetRelay( motorInterface.relayConfig.STR, false );
        if ( motorInterface.verbose ) { report( 'MOTOR VERBOSE', 'Set rotation None' ); }
        return motorInterface;
    }

    // Speed
    // -----

    function doSetSpeedHigh ( motorInterface ) {
        doSetRelay( motorInterface.relayConfig.RL, false );
        doSetRelay( motorInterface.relayConfig.RM, false );
        doSetRelay( motorInterface.relayConfig.RH, true );
        if ( motorInterface.verbose ) { report( 'MOTOR VERBOSE', 'Set speed High' ); }
        return motorInterface;
    }

    function doSetSpeedMedium ( motorInterface ) {
        doSetRelay( motorInterface.relayConfig.RL, false );
        doSetRelay( motorInterface.relayConfig.RH, false );
        doSetRelay( motorInterface.relayConfig.RM, true );
        if ( motorInterface.verbose ) { report( 'MOTOR VERBOSE', 'Set speed Medium' ); }
        return motorInterface;
    }

    function doSetSpeedLow ( motorInterface ) {
        doSetRelay( motorInterface.relayConfig.RH, false );
        doSetRelay( motorInterface.relayConfig.RM, false );
        doSetRelay( motorInterface.relayConfig.RL, true );
        if ( motorInterface.verbose ) { report( 'MOTOR VERBOSE', 'Set speed Low' ); }
        return motorInterface;
    }

    // Enabling & Disabling
    // --------------------
    
    function doSetEnabled ( motorInterface, yN ) {
        doSetRelay( motorInterface.replayConfig.PC, yN );
        if ( motorInterface.verbose ) { report( 'MOTOR VERBOSE', 'Set PC/Enabled to', yN ? 'true' : 'false' ); }
        return motorInterface;
    } 

    // Testing
    function doTestSequence ( motorInterface ) {
        return W.promise( function ( resolve, reject ) {
            
            var stepTime = 5000;
            
            W.sequence()
                .then( function () {
                    report( 'STEP', '----' );
                    doSetEnabled( motorInterface, true );
                })
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedLow, doSetRotationForward )( motorInterface );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedMedium, doSetRotationForward )( motorInterface );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedHigh, doSetRotationForward )( motorInterface );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedMedium, doSetRotationForward )( motorInterface );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedLow, doSetRotationForward )( motorInterface );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedLow, doSetRotationNone )( motorInterface );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedLow, doSetRotationBackward )( motorInterface );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedMedium, doSetRotationBackward )( motorInterface );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedHigh, doSetRotationBackward )( motorInterface );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedMedium, doSetRotationBackward )( motorInterface );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedLow, doSetRotationBackward )( motorInterface );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedLow, doSetRotationNone )( motorInterface );
                })
                .then( function () {
                    doSetEnabled( motorInterface, false );
                })
                .then( function () {
                    resolve( motorInterface );
                })
                .start();
        });
    }

    // Report
    // ------
    function report( status, str ) {
        console.log( '[', status, ']', W.rest( W.toArray( arguments ) ).join( ' ' ) );
    }

    // Relays
    // ------

    function doSetRelay ( idx, value ) {
        if ( typeof value === 'boolean' ) {
            value = value ? 1 : 0;
        }
        if ( pfio ) {
            pfio.init();
            pfio.digital_write( idx, value );
            pfio.deinit();
        }
    }

    // Export
    module.exports = {
        make: make,
        init: init,
        doSetRotationForward: doSetRotationForward,
        doSetRotationBackward: doSetRotationBackward,
        doSetRotationNone: doSetRotationNone,
        doSetSpeedLow: doSetSpeedLow,
        doSetSpeedMedium: doSetSpeedMedium,
        doSetSpeedHigh: doSetSpeedHigh,
        doTestSequence: doTestSequence,
        doSetEnabled: doSetEnabled
    };
    
}());
