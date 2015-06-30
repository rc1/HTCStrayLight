/* jshint esnext: true */

// WebApp
// ======

// Modules
// =======
var https = require( 'https' );
var httpProxy = require( 'http-proxy' );
var fs = require( 'fs' );
var path = require( 'path' );
var express = require( 'express' );
var serveStatic = require( 'serve-static' );
var ws = require( 'ws' );
var W = require( 'w-js' );
var less = require( 'less' );
var repl = require( 'repl' );
var redis = require( 'redis' );
var RedisThreeLevelTreeStorage = require( './lib/restesque/libs/redis-three-level-tree-storage' );
var RestesqueWebsocketRouter = require( './lib/restesque/libs/restesque-websocket-router.js' );

// Make & Init
// ===========

function makeWebApp () {
    return {
        nonSecurePort: W.isDefined( process.env.NON_SECURE_PORT ) ? Number( process.env.NON_SECURE_PORT ) : 7081,
        port: process.env.PORT || 7080,
        resdisDb: W.isDefined( process.env.REDIS_DB ) ? Number(  process.env.REDIS_DB ) : 4,
        redisRootKey: process.env.REDIS_ROOT_KEY || 'mt',
        isLocal: W.isDefined( process.env.IS_LOCAL ) ? Boolean( process.env.IS_LOCAL ) : false
    };
}

var initWebApp = W.composePromisers( makeExpressApp,
                                     makeServer,
                                     makeRestesque,
                                     makeRepl,
                                     makeHttpToHttpsProxy,
                                     makeReporter( 'OK', 'Server running.' ) );

initWebApp( makeWebApp() ).success( function ( app ) {
    report( 'OK', 'Listening on port: ' + app.port );
});

// Promisers
// =========

function makeExpressApp ( app ) {
    return W.promise( function ( resolve, reject ) {

        app.expressApp = express();

        // Jade
        // ----
        app.expressApp.set( 'view engine', 'jade' );
        app.expressApp.set( 'views', path.join( __dirname, 'views' ) );
        app.expressApp.locals.pretty = true;

        // Middleware
        // ----------

        // ### Static Files
        app.expressApp.use( serveStatic( path.join( __dirname, 'public' ) ) );

        // ### Errors
        app.expressApp.use( ( err, req, res, next ) => res.status( 500 ).send( '<pre>' + err  + '<pre>' ) );
        
        // Routes
        // ------
        // ### Manifest
        app.expressApp.get( '/manifest.json', function ( req, res ) {
            res.json({
                "name": "HTC Punter",
                "start_url": "/punter/1",
                "display": "standalone",
                "orientation": "portrait"
            });
        });
        
        // ### Home
        app.expressApp.get( '/', ( req, res ) => res.render( 'homepage', makeJadeData( app ) ) );

        // ### Punters
        app.expressApp.get( '/punter/:cid', function ( req, res ) {
            var jadeData = makeJadeData( app );
            jadeData.cid = req.params.cid;
            res.render( 'punter', jadeData );
        });

        // ### Hosts
        app.expressApp.get( '/host/', function ( req, res ) {
            res.render( 'host', makeJadeData( app ) );
        });

        // ### Controller
        app.expressApp.get( '/controller.ui', ( req, res ) => res.render( 'ui/controller.ui.jade', {} ) );

        // ### W.js Clientside
        app.expressApp.get( '/W.min.js', W.jsMinMiddleware() );
        
        resolve( app );
    });
}

function makeServer ( app ) {
    return W.promise( function ( resolve, reject ) {
        app.server = https.createServer( {
            key: fs.readFileSync( './assets/ssl-certs/server.key' ),
            cert: fs.readFileSync( './assets/ssl-certs/server.crt' ),
            requestCert: false,
            rejectUnauthorized: false
        }, app.expressApp );
        app.server.listen( app.port );
        resolve( app );
    });
}

function makeRepl ( app ) {
    return W.promise( function ( resolve, reject ) {
        if ( app.isLocal ) {
            setTimeout( function () {
                var r = repl
                        .start({
                            prompt: "REPL> ",
                            input: process.stdin,
                            output: process.stdout
                        });
                r.context.app = app;
            }, 1000 );
        }
        resolve( app );
    });
}

function makeRestesque ( app ) {
    return W.promise( function ( resolve, reject ) {

        // Web Socket Server
        // -----------------
        app.wss = new ws.Server({ server: app.server });

        // Redis
        // -----
        app.redisClient = redis.createClient();
	app.redisClient.select( app.resdisDb );
        app.redisClient.on( 'error', makeReporter( 'REDIS Error' ) );

        // Storage Mechanism
        // -----------------
        var storage = new RedisThreeLevelTreeStorage( app.redisClient );

        // Restesque
        // ---------
        RestesqueWebsocketRouter( app.wss, storage, app.redisRootKey );

        resolve( app );
    });
}

function makeHttpToHttpsProxy ( app ) {
    return W.promise( function ( resolve, reject ) {
        app.httpProxy = httpProxy
            .createProxyServer( { target: 'https://localhost:' + app.port + '/',
                                  secure: false,
                                  ws: true } )
            .listen( app.nonSecurePort );
                                                    
        report( 'OK', 'Non-https proxy running on:', app.nonSecurePort );
        resolve( app );
    });
}

// Jade
// ----

function makeJadeData ( app ) {
    return {
        isLocal: app.isLocal
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
