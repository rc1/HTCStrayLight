/* jshint esnext: true */

// Main.js
// =======
// Entry point of the application.

// Make & Init
// ===========

var makeApp = function () {
    return {
        wsUrl: 'wss://192.168.0.7:7080'
    };
};

var initApp = W.composePromisers( makeWebSocketClient,
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
        app.wsClient = new W.JSONSocketConnection({
            socketUrl: app.wsUrl
        });
        
        var resolveOnFirstConnect = once( function () {
            report( 'CONNECTED', 'to:', app.wsUrl );
            resolve( app );
        });

        app.wsClient.on( 'open', resolveOnFirstConnect );
        app.wsClient.on( 'error', makeReporter( 'Web Socket Error' ) );
        app.wsClient.openSocketConnection();
        
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
                app.punterViz = PunterViz.makeApp();
                // Add out dom element
                app.punterViz.containerEl = el;

                // Initailise it
                PunterViz
                    .initApp( app.punterViz )
                    .error( function ( err ) {
                        console.error( 'Failed to create Punter app', err );
                    }) 
                    .success( function ( initalisedPunterApp ) {
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
