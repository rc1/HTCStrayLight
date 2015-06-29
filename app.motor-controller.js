// Motor Control
// =============
// Client application to control the motors

var MotorControl = require( './lib/motor-control' );


MotorControl
    .init( MotorControl.make() )
    .success( function ( motorControl ) {
        MotorControl.doTestSequence( motorControl );
    });

