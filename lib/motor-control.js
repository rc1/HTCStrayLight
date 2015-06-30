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
// =============
var MotorInterface = (function () {

    function make () {
        return {
            relayConfig: {
                STF: 0, // Forward Rotation Start
                STR: 1, // Reverse Rotation Start
                RH: 2, // High
                RM: 3, // Medium
                RL: 4 // Low
            },
            verbose: true
        };
    }

    var init = W.composePromisers( turnOffAllRelays );

    // Promisers
    // =========

    function turnOffAllRelays ( app ) {
        return W.promise( function ( resolve, reject ) {
            if ( pfio ) {
                pfio.init();
                pfio.write_output( 0 );
                pfio.deinit();
            }
            resolve( app );
        });
    }

    // Utils
    // =====

    // Rotation
    // --------
    
    function doSetRotationForward ( motorInterface ) {
        doSetRelay( motorInterface.relayConfig.STR, false );
        doSetRelay( motorInterface.relayConfig.STF, true );
        if ( motorInterface.verbose ) { report( 'Motor Interface Rotation', 'Forward' ); }
        return motorInterface;
    }

    function doSetRotationBackward ( motorInterface ) {
        doSetRelay( motorInterface.relayConfig.STF, false );
        doSetRelay( motorInterface.relayConfig.STR, true );
        if ( motorInterface.verbose ) { report( 'Motor Interface Rotation', 'Backward' ); }
        return motorInterface;
    }

    function doSetRotationNone ( motorInterface ) {
        doSetRelay( motorInterface.relayConfig.STF, false );
        doSetRelay( motorInterface.relayConfig.STR, false );
        if ( motorInterface.verbose ) { report( 'Motor Interface Rotation', 'None' ); }
        return motorInterface;
    }

    // Speed
    // -----

    function doSetSpeedHigh ( motorInterface ) {
        doSetRelay( motorInterface.relayConfig.RL, false );
        doSetRelay( motorInterface.relayConfig.RM, false );
        doSetRelay( motorInterface.relayConfig.RH, true );
        if ( motorInterface.verbose ) { report( 'Motor Interface Speed', 'High' ); }
        return motorInterface;
    }

    function doSetSpeedMedium ( motorInterface ) {
        doSetRelay( motorInterface.relayConfig.RL, false );
        doSetRelay( motorInterface.relayConfig.RH, false );
        doSetRelay( motorInterface.relayConfig.RM, true );
        if ( motorInterface.verbose ) { report( 'Motor Interface Speed', 'Medium' ); }
        return motorInterface;
    }

    function doSetSpeedLow ( motorInterface ) {
        doSetRelay( motorInterface.relayConfig.RH, false );
        doSetRelay( motorInterface.relayConfig.RM, false );
        doSetRelay( motorInterface.relayConfig.RL, true );
        if ( motorInterface.verbose ) { report( 'Motor Interface Speed', 'Low' ); }
        return motorInterface;
    }

    // Testing
    function doTestSequence ( motorInterface ) {
        return W.promise( function ( resolve, reject ) {
            
            var stepTime = 5000;
            
            W.sequence()
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
        doTestSequence: doTestSequence
    };
    
}());
