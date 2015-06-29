// Modules
// =======
var pfio = require( 'piface-node' );
var W = require( 'w-js' );

// Motor Control
// =============
var MotorControl = (function () {

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
            pfio.init();
            pfio.write_output( 0 );
            pfio.deinit();
            resolve( app );
        });
    }

    // Utils
    // =====

    // Rotation
    // --------
    
    function doSetRotationForward ( motorControl ) {
        doSetRelay( motorControl.relayConfig.STR, false );
        doSetRelay( motorControl.relayConfig.STF, true );
        if ( motorControl.verbose ) { report( 'Motor Control Rotation', 'Forward' ); }
        return motorControl;
    }

    function doSetRotationBackward ( motorControl ) {
        doSetRelay( motorControl.relayConfig.STF, false );
        doSetRelay( motorControl.relayConfig.STR, true );
        if ( motorControl.verbose ) { report( 'Motor Control Rotation', 'Backward' ); }
        return motorControl;
    }

    function doSetRotationNone ( motorControl ) {
        doSetRelay( motorControl.relayConfig.STF, false );
        doSetRelay( motorControl.relayConfig.STR, false );
        if ( motorControl.verbose ) { report( 'Motor Control Rotation', 'None' ); }
        return motorControl;
    }

    // Speed
    // -----

    function doSetSpeedHigh ( motorControl ) {
        doSetRelay( motorControl.relayConfig.RL, false );
        doSetRelay( motorControl.relayConfig.RM, false );
        doSetRelay( motorControl.relayConfig.RH, true );
        if ( motorControl.verbose ) { report( 'Motor Control Speed', 'High' ); }
        return motorControl;
    }

    function doSetSpeedMedium ( motorControl ) {
        doSetRelay( motorControl.relayConfig.RL, false );
        doSetRelay( motorControl.relayConfig.RH, false );
        doSetRelay( motorControl.relayConfig.RM, true );
        if ( motorControl.verbose ) { report( 'Motor Control Speed', 'Medium' ); }
        return motorControl;
    }

    function doSetSpeedLow ( motorControl ) {
        doSetRelay( motorControl.relayConfig.RH, false );
        doSetRelay( motorControl.relayConfig.RM, false );
        doSetRelay( motorControl.relayConfig.RL, true );
        if ( motorControl.verbose ) { report( 'Motor Control Speed', 'Low' ); }
        return motorControl;
    }

    // Testing
    function doTestSequence ( motorControl ) {
        return W.promise( function ( resolve, reject ) {
            
            var stepTime = 5000;
            
            W.sequence()
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedLow, doSetRotationForward )( motorControl );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedMedium, doSetRotationForward )( motorControl );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedHigh, doSetRotationForward )( motorControl );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedMedium, doSetRotationForward )( motorControl );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedLow, doSetRotationForward )( motorControl );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedLow, doSetRotationNone )( motorControl );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedLow, doSetRotationBackward )( motorControl );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedMedium, doSetRotationBackward )( motorControl );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedHigh, doSetRotationBackward )( motorControl );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedMedium, doSetRotationBackward )( motorControl );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedLow, doSetRotationBackward )( motorControl );
                })
                .delay( stepTime )
                .then( function () {
                    report( 'STEP', '----' );
                    W.compose( doSetSpeedLow, doSetRotationNone )( motorControl );
                })
                .then( function () {
                    resolve( motorControl );
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
        pfio.init();
        pfio.digital_write( idx, value );
        pfio.deinit();
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
