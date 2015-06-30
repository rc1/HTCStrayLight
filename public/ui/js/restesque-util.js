var RestesqueUtil = (function () {

    // # Make

    function make () {
        return {
            socketUrl : ''    
        };
    };

    // # Init
    
    var init = W.composeAsync([
        addJsonSocketConnection,
        bindCloseHander,
        startConnection,
        waitForOpen
    ]);

    function addJsonSocketConnection ( util, done ) {
        util.connection = new W.JSONSocketConnection({
            socketUrl : util.socketUrl
        });
        W.call( done, util );
    }

    function bindCloseHander ( util, done ) {
        util.connection.on( 'close', function () {
            throw new Error( 'web sockets closed' );
        });
        W.call( done, util );
    }

    function startConnection ( util, done ) {
        util.connection.openSocketConnection();
        // Heartbeat
        setInterval( function () {
            util.connection.send( 'heartbeat' );
        }, 20000 );
        W.call( done, util );
    }

    function waitForOpen ( util, done ) {
        var handler = function () {
            util.connection.off( 'open', handler );
            done( util );
        };
        util.connection.on( 'open', handler );
    }
    
    // # Messsages 

    // Can take ws or a restesque.util as first arg
    function get ( util, uri ) {
        var ws = util.connection ? util.connection : util;
        var p = Packet
                .make()
                .uri( uri )
                .method( 'GET' );

        return Restesque.send( ws, p );
    }

    // Can take ws or a restesque.util as first arg
    function post ( util, uri, body ) {
        var ws = util.connection ? util.connection : util;
        var p = Packet
                .make()
                .uri( uri )
                .method( 'POST' )
                .body( body );

        return Restesque.send( ws, p );
    }

    // Can take ws or a restesque.util as first arg
    function subscribe ( util, uri, handler ) {
        var ws = util.connection ? util.connection : util;
        var p = Packet
                .make()
                .uri( uri )
                .method( 'SUBSCRIBE' );

        return W.promise( function ( resolve, reject ) {
            Restesque.makeSubscriptionAsync( ws, p )
                .success( function ( subscribe ) {
                    subscribe.on( 'publish', handler );
                    resolve( subscribe );
                })
                .error( reject );
        });
    }

    // Can take ws or a restesque.util as first arg
    function subscribeWithInitialGet( util, uri, handler ) {
        var ws = util.connection ? util.connection : util;
         return W.promise( function ( resolve, reject ) {
            get( ws, uri )
                .success( function ( packet ) {
                    handler( packet );
                    subscribe( ws, uri, handler );
                    resolve();
                })
                .error( reject );
     });
    }

    // # Export

    return {
        // Connection
        make : make,
        init : init,
        // Messages
        get : get,
        post : post,
        subscribe : subscribe,
        subscribeWithInitialGet : subscribeWithInitialGet
    };
    
}());
