// Motor Control
// =============
// Client application to control the motors

// Modules
// =======
var pfio = require( 'piface-node' );

//pfio.digital_write ( 0, 0 ); // (pin, state)

var relays = [ false, false, false, false,
               false, false, false, false ];
var idx = -1;
var doFor = 100;

(function loop () {
    if ( --doFor >= 0 ) { setTimeout( loop, 10 ); }
    if ( ++idx >= relays.length ) { idx = 0; }
    relays[ idx ] = !relays[ idx ];
    
    console.log( 'setting', idx, 'to', relays[ idx ] ? 1 : 0 );
    
    pfio.init();
    pfio.digital_write ( idx, relays[ idx ] ? 1 : 0 );
    pfio.deinit();
}());


