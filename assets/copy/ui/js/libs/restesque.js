// Copyright 2013 The Workers (London) Ltd., Ross Cairns 
// # Packet

function Packet( data ) {
    this.obj = data || {
        body : ''
    };
}

Packet.make = function () {
    return new Packet();
};

// ## Setters

Packet.prototype.body = function ( body ) {
    this.obj.body = body;
    return this;
};

Packet.prototype.uri = function ( uri ) {
    this.obj.uri = uri;
    return this;
};

Packet.prototype.status = function ( status ) {
    this.obj.status = status;
    return this;
};

Packet.prototype.token = function ( token ) {
    this.obj.token = token || "";
    return this;
};

Packet.prototype.method = function ( method ) {
    this.obj.method = method;
    return this;
};

// ## Getters

Packet.prototype.getRef = function () {
    return this.obj;
};

Packet.prototype.getAsJsonStr = function ( errorCallback ) {
    if ( typeof errorCallback === 'undefined' ) {
        errorCallback = Packet.defaultJsonError;
    }   
    var str = "";
    try {
        str = JSON.stringify( this.obj );
    } catch (err) {
        errorCallback( err, this );
    }
    return str;
};

Packet.prototype.tokensMatch = function ( packet ) {
    return this.equalsToken( packet.getToken() );
};

Packet.prototype.equalsToken = function ( token ) {
    return this.obj.token === token;
};

Packet.prototype.hasToken = function ( ) {
    return typeof this.obj.token !== 'undefined';
}; 

Packet.prototype.getToken = function () {
    return this.obj.token;
};

Packet.prototype.hasStatus = function () {
    return typeof this.obj.status !== 'undefined';
};

Packet.prototype.hasErrorStatus = function () {
    return this.hasStatus() ? this.obj.status == Packet.ERROR : false;
};

Packet.prototype.hasOkStatus = function () {
    return this.hasStatus() ? this.obj.status == Packet.OK : false;
};

Packet.prototype.getBody = function () {
    return this.obj.body;
};

// ## Utils - Public

Packet.makeToken = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
};

// ## Constants 

// ### Status
Packet.OK = '200';
Packet.ERROR = '500';

// ## Defaults
Packet.defaultJsonError = function ( err, packet ) {
    console.error( 'Packet Json conversion error', err, packet );
};

// # Exports

if ( typeof module !== 'undefined' && typeof module.exports !== 'undefined' ) {
    module.exports = Packet;
}

// # CommonJS: Import
if ( typeof module !== 'undefined' && typeof module.exports !== 'undefined' ) {
    module.exports = Restesque;
    var Packet = require( './packet.js' );
    var W = require( 'w-js' );
}

var Restesque = ( function () {

    var RESTESQUE_TIMEOUT_AFTER = 60000;

    // # Sending

    function send ( ws, packet ) {

        var listener;
        // The promise which sends the request
        return W.promise( function ( resolve, reject ) {
            // Make sure there is a packet
            if ( !packet.hasToken() ) {
                packet.token( Packet.makeToken() );
            }
            // the listener which waits for a responce
            listener = function ( receivedPacket ) {
                // Check it is a packet
                if ( !isPacket( receivedPacket ) ) { 
                    return; 
                }
                // Make it a packet
                receivedPacket = new Packet( receivedPacket );
                // See if it is our packet
                if ( packet.tokensMatch( receivedPacket ) ) {
                    if ( receivedPacket.hasOkStatus() ) {
                        resolve( receivedPacket );
                    } else {
                        reject( receivedPacket );
                    }
                    // Leave the event stream
                    ws.off( 'json', listener );
                }
            };
            // Do the send
            ws.send( packet.getAsJsonStr(), function ( err ) {
                if ( err ) {
                    return reject( err );
                }
                // Join the event stream
                ws.on( 'json', listener );
            });
        }).timeoutAfter( RESTESQUE_TIMEOUT_AFTER, function () { 
           // leave the event
            ws.off( 'packet', listener ); 
        });
    }

    // # makeSubscriptionAsync

    // Almost same as send execpt success is returned with a subscribed subscription object
    function makeSubscriptionAsync( ws, packet ) {
        return W.promise( function ( resolve, reject ) {
            // Make sure there is a packet
            if ( !packet.hasToken() ) {
                packet.token( 'sub-' + Packet.makeToken() );
            }
            send( ws, packet )
                .success( function () {
                    resolve( new Subscription( ws, packet ) );
                })
                .error( reject );
        });
    }

    // # Subscription
    // Events:
    // * 'publish' - signature ( packet<Packet> )
    function Subscription ( ws, packet ) {
        this.ws = ws;
        this.packet = packet;
        // Add event functionality to this
        W.extend( this, W.eventMixin );
        // Sign up for events
        this.ws.on( 'json', W.bind( this.jsonHandler, this ) );
    }

    Subscription.prototype.jsonHandler = function ( receivedPacket ) {
        // Ignore if not packet
        if ( !isPacket( receivedPacket ) ) {
            return;
        }
        // Make it a packet
        receivedPacket = new Packet( receivedPacket );
        // See if it is our packet
        if ( this.packet.tokensMatch( receivedPacket ) ) {
            this.trigger( 'publish', receivedPacket );
        }
    };

    // Subscriptions will always unsubscribe locally even if
    // the server request fails. Therefore if the subscription
    // fails it should be requested.
    Subscription.prototype.unsubscribe = function () {
        return W.promise( function ( resolve, reject ) {
            // Send requested
            var packet = W.clone( this.packet );
            packet.method( 'UNSUBSCRIBE' );
            packet.send( packet ).success( resolve ).error( reject );
            // Unbind events
            this.ws.off( 'json', this.jsonHandler );
        });
    };

    // # Utils

    function isPacket ( obj ) {
        return typeof obj.uri === 'string' && typeof obj.token !== 'undefined';
    }


    // # Exports 
    return {
        send : send,
        makeSubscriptionAsync : makeSubscriptionAsync,
        Packet : Packet
    };
}() );

// # CommonJS: Export

if ( typeof module !== 'undefined' && typeof module.exports !== 'undefined' ) {
    module.exports = Restesque;
}
