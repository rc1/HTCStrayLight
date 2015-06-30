var ws;

$( function  () {

    // # Bindings

    // Make them
    var bindings = $( '[data-bind-uri]' )
        .map( makeFromEl )
        .each( doFixTypes )
        .each( addUi )
        .toArray();

    console.log( bindings );

    // # Triggers

    var tiggers = $( '[data-bind-click-now]' )
            .css( { 'cursor' : 'pointer' } )
            .on( 'click touch', function () {
                console.log(  $( this ).data() );
                sendNow( $( this ).data( 'bindClickNow' ) );
            }); 

    // # Keyboard Binding
    var ascii = { UP : 119, DOWN : 115, LEFT : 97, RIGHT : 100 };
    // Create state object for each robot
    var keyboardBindings = $( '[data-bind-keyboard]' )
            .toArray()
            .map( function ( el ) {
                var $el = $( el );
                // Create the binding
                var obj = { id: $el.data( 'robotId' ), state: $el.is(':checked') };
                // Need to listen for changes here
                $el.on( 'change', function () {
                    obj.state = $el.is(':checked');
                });
                return obj;
            });
    // Listen for keypresses
    document.addEventListener( 'keypress', _.throttle( function ( event ) {
        // Don't copy this code in the client facing app!
        console.log( keyboardBindings  );
        switch( event.keyCode ) {
            case ascii.UP: keyboardBindings.forEach( W.partial( sendKeyBindingWhenTrue, 'backward' ) ); break;
            case ascii.DOWN: keyboardBindings.forEach( W.partial( sendKeyBindingWhenTrue, 'forward' ) ); break;
            case ascii.LEFT: keyboardBindings.forEach( W.partial( sendKeyBindingWhenTrue, 'right' ) ); break;
            case ascii.RIGHT: keyboardBindings.forEach( W.partial( sendKeyBindingWhenTrue, 'left' ) ); break;
        }
    }, 200, { leading: true } ), false );
    // This does the sending
    function sendKeyBindingWhenTrue ( direction, kb ) {
        if ( kb.state ) {
            console.log( '/robot-'+kb.id+'/movement-requested/'+direction+'/' );
            sendNow( '/robot-'+kb.id+'/movement-requested/'+direction+'/' );
        }
    }
    // Key ups
    // document.addEventListener( 'onkeyup', _.throttle( function ( event ) {
    //     keyboardBindings.forEach( W.partial( sendKeyBindingWhenTrue, 'forward' ) );
    // }, 200, { leading: true } ), false );

    // # Socket

    // Connect to the sockets
    ws = new W.JSONSocketConnection( {
        socketUrl : connectTo
    });

    ws.on( 'json', function ( json ) {
        // console.log( 'json:', json );
    });

    // Open subscribe them
    ws.on( 'open', function () {
        _( bindings )
            .forEach( get )
            .forEach( subscribe );
    });

    ws.on( 'error', function ( error ) {
        console.log( 'error', arguments );
    });

    ws.on( 'closed', function () {
        // console.log( '@stub need to remove on publish handlers' );
    });

    // Connect
    ws.openSocketConnection();

    // Heartbeat
    setInterval( function () {
        ws.send( 'heartbeat' );
    }, 20000 );

    // # Drawing

    // Update all changes to the DOM on requestAnimationFrame
    (function drawLoop () {
        updateConnectionState( ws );
        renderAll( bindings );
        if ( ws.socket.readyState ) {

        }
        window.requestAnimationFrame( drawLoop );
    }());

});

// # Bindings

function makeFromEl ( el ) {
    // Becuase jQuery send it last
    var $el = $( W.last( arguments ) );
    // Get all the data combind with the $el
    return $.extend( $el.data(), { 
        $el : $el,
        needsUpdate : false
    });
}

// Jquery data returns strings, so we need to parse some keys
function doFixTypes ( binding ) {
    binding.bindCols = parseInt( binding.bindCols, 10 );
}

// ## Subscribe

function get ( binding ) {
    Restesque.send( ws, makeGetPacket( binding ) )
        .error( W.partial( logError, 'Binding subscribe error:' ) )
        .success( function ( packet ) {
            console.log( packet.obj.uri, packet.obj.body, packet );
            setValueFromPacket( binding, packet );
        });
}

function subscribe ( binding ) {
    Restesque.makeSubscriptionAsync( ws, makeSubscriptionPacket( binding ) )
        .error( W.partial( logError, 'Binding subscribe error:' ) )
        .success( function ( subscription ) {
            subscription.on( 'publish', W.partial( setValueFromPacket, binding ) );
        });
}

// ## Value

function sendNow ( bindingOrUri ) {
    console.log( bindingOrUri, typeof bindingOrUri );
    var packet = ( typeof bindingOrUri === 'string' ) ? Packet.make().method( 'POST' ).uri( bindingOrUri ).body( Date.now() ) : makePostPacket( bindingOrUri, Date.now() );
    Restesque.send( ws, packet  )
        .error( logError );
}

function sendValue ( binding, value ) {
    Restesque.send( ws,  makePostPacket( binding, value ) )
        .error( logError );
}

function setValueFromPacket ( binding, packet ) {
    if ( packet.getBody() !== null ) {
        binding.bindValue = packet.getBody();
        binding.needsUpdate = true;
    }
}

// ## UIs

function addUi ( binding ) {
    binding = W.last( arguments );

    // ### Now trigger button

    if ( binding.bindUi === 'now' ) {
        binding.$el.find( '.ui.now' ).on( 'click touch', W.partial( sendNow, binding ) );
    }

    // ### Toggle Yes No

    else if ( binding.bindUi === 'toggle-yes-no' ) {
        console.log( 'holler!',binding.$el.find( '.ui.toggle' )  );
        binding.$el.find( '.ui.toggle' ).on( 'click touch', function () {
            // Set the toggled value
            sendValue( binding, ( binding.bindValue === 'no' ) ? 'yes' : 'no' );
        });
    }

    // ### Slider

    else if ( binding.bindUi === 'slide' ) {

        // Set the css
        binding.$el
            .css({ cursor : 'ew-resize' })
            // Hide the ui slider
            .find( '.bar.ui' )
            .hide();

        // Prepare our send function 
        var throttledSendValue = _.throttle( sendValue, 100, { trailing : true } );

        // Slider dragging
        binding.$el.on( 'mousedown touch', function ( e ) {
            var documentEl = $( document );
            documentEl.on( 'mouseup touchend', onUpHandler);
            documentEl.on( 'mousemove touchmove', onMoveHandler );
            onMoveHandler( e );
        });
        function onUpHandler () {
            var documentEl = $( document );
            documentEl.off( 'mousemove touchmove', onMoveHandler );
            documentEl.off( 'mouseup touchend', onUpHandler );
            // Hide the ui slider
            binding.$el
                .find( '.bar.ui' )
                .hide();
        }
        function onMoveHandler ( e ) {
            // Stop text selecting
            e.stopPropagation();
            // Show the ui slider
            binding.$el
                .find( '.bar.ui' )
                .show();
            /// Calc the values
            var value = W.map( e.pageX - binding.$el.offset().left, 0, binding.$el.width(), binding.bindMin, binding.bindMax, true );
            var valueStepped = value - ( value % binding.bindStep );
            var width = Math.floor( W.map( valueStepped, binding.bindMin, binding.bindMax, 0, binding.$el.width(), true ) );
            binding.$el.find( '.bar.ui' ).width( width  );
            // Set the packet
            throttledSendValue( binding, valueStepped );
            return false;
        }    
    }

    // ### Text Line

    else if ( binding.bindUi === 'text-line' ) {

        // Elements
        var $input  = binding.$el.find( '.text-line .input' );
        var $enable = binding.$el.find( '.text-line .enable' );
        var $liveEditButton = binding.$el.find( '.text-line .live' );
        var $nonLiveEditButton = binding.$el.find( '.text-line .non-live' );
        var $doneButton = binding.$el.find( '.text-line .done' );
        var $inputContainer = binding.$el.find( '.text-line .input' );
        var $input = binding.$el.find( '.text-line input' );
        var $send = binding.$el.find( '.text-line .send' );

        // State
        var isLive = false;
        var lastValae = "";

        var setInput = function () {
            $input.val( binding.bindValue );
            lastValue = binding.bindValue;
        };
        var bindInputChange = function () {

        };
        var bindDonePresses = function () {

        };

        // DOM
        $inputContainer.hide();

        $doneButton.on( 'click touch', function () {
            $inputContainer.hide();
            $enable.show();
            $inputContainer.off();
            isLive = false;
        });

        $liveEditButton.on( 'click touch', function () {
            setInput();
            $inputContainer.show();
            $enable.hide();
            isLive = true;
        });

        $nonLiveEditButton.on( 'click touch', function () {
            setInput();
            $inputContainer.show();
            $enable.hide();
            isLive = false;
        });

        $input.keyup( function () {
            if ( isLive ) {
                sendValue( binding, $input.val() );
            }
        });

        $send.on( 'click touch', function () {
            sendValue( binding, $input.val() );
        });
    }
} 


// ## Rendering 

function renderAll ( bindings ) {
    // Call render on evey binding that needs it
    _( bindings )
        .filter( needsUpdate )
        .each( render );
}

function render ( binding ) {

    // ValueΩ
    var value = binding.bindValue;

    // ### Formatters

    // #### Time Ago

    if ( binding.bindFormatter === 'time-ago' ) {

        var time = parseInt( value, 10 );
        var duration = Date.now() - time;
        value = makeTimeAgo( duration );

        // Update the class depending on the time ago
        if ( duration < 5000 ) {
            binding.$el.find( '.value' ).addClass( 'ok' ).removeClass( 'better' ).removeClass( 'not-so-bad' );
        } else if ( duration < 30000 ) {
            binding.$el.find( '.value' ).removeClass( 'ok' ).addClass( 'better' ).removeClass( 'not-so-bad' );
        } else if ( duration < 60000 ) {
            binding.$el.find( '.value' ).removeClass( 'ok' ).removeClass( 'better' ).addClass( 'not-so-bad' );
        } else {
            binding.$el.find( '.value' ).removeClass( 'ok' ).removeClass( 'better' ).removeClass( 'not-so-bad' );
        }

        // Expire needs needs update
        expireNeedsUpdate( binding );

    } 

    // #### Range

    else if ( binding.bindFormatter === 'range' ) {

        // Get the mapping for the slider width
        var mapArgs = [ parseFloat( value, 10 ), 
                        parseFloat( binding.bindMin, 10 ), 
                        parseFloat( binding.bindMax, 10 ), 
                        0, 
                        binding.$el.find( '.slider' ).width(), 
                        true ];

        // Map it to the bar width
        var width = W.map.apply( this, mapArgs );
        // Apply it
        binding.$el.find( '.slider.formatter .bar' ).width( width );
    }

    // #### Char Limit

    else if ( binding.bindFormatter === 'char-limit' ) {
        if ( value.length > binding.bindCharLimit + 1 ) {
            value = value.substring( 0, binding.bindCharLimit ) + "…";
        }
    }
 

    // Text
    var key = binding.bindKey;
    var cols = binding.bindCols;
    // Make sure value is a string
    if ( typeof value !== 'string' ) {
        value = value.toString();
    }
    if ( typeof key !== 'string' ) {
        key = key.toString();
    }
    var numberOfDotsNeeded = cols - ( key.length + value.length );

    if ( binding.bindUri === '/robot-config/mac/1/' ) {
        console.log( 'numberOfDotsNeeded', numberOfDotsNeeded, value, key );
    }

    var dots = Array( ( numberOfDotsNeeded > 0 ) ? numberOfDotsNeeded : 4 ).join('.');
    
    // Update the value
    binding.$el.find( '.value' ).text( value );
    /// Update the dots
    binding.$el.find( '.dots' ).text( dots );

    // Cancel any more update
    binding.needsUpdate = false;
}

function needsUpdate ( binding ) {
    return binding.needsUpdate;
}

function expireNeedsUpdate( binding ) {
    setTimeout( function () {
        binding.needsUpdate = true;
    }, 1000 );
}

// # Restesque

function makeSubscriptionPacket ( binding ) {
    return Packet.make().method( 'SUBSCRIBE' ).uri( binding.bindUri );
}

function makeGetPacket ( binding ) {
    return Packet.make().method( 'GET' ).uri( binding.bindUri );
}

function makePostPacket ( binding, body ) {
    return Packet.make().method( 'POST' ).uri( binding.bindUri ).body( body );
}

// # Utils

function logError () {
    console.error( Array.prototype.join.call( arguments, ' ' ) );
}

var SEC = 1000;
var MIN = SEC * 60;
var HOUR = MIN * 60;
var DAY = HOUR * 12;
var WEEK = DAY * 7;

function makeTimeAgo( duration ) {

    if ( W.inRange( duration, 0, SEC * 15 ) ) {
        return divideAndFloor( duration, SEC ) + " sec ago";

    } else if ( W.inRange( duration, 0, SEC * 30 ) ) {
        return "< 15 sec ago";

    } else if ( W.inRange( duration, 0, MIN ) ) {
        return "< 30 sec ago";

    } else if ( W.inRange( duration, 0, HOUR ) ) {
        return divideAndFloor( duration, MIN ) + " min ago";

    } else if ( W.inRange( duration, 0, DAY ) ) {
        return divideAndFloor( duration, HOUR ) + " hr ago";

    } else if ( W.inRange( duration, 0, WEEK ) ) {
        return divideAndFloor( duration, DAY ) + " day ago";

    } else {
        return divideAndFloor( duration, WEEK ) + " wk ago";
    }
}

function divideAndFloor( v, d ) {
    return Math.floor( v / d );
}
