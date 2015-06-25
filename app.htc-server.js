/* jshint esnext: true */

// WebApp
// ======

// Modules
// =======
var https = require( 'https' );
var fs = require( 'fs' );
var path = require( 'path' );
var express = require( 'express' );
var serveStatic = require( 'serve-static' );
var W = require( 'w-js' );
var less = require( 'less' );
var repl = require( 'repl' );

// Make & Init
// ===========

function makeWebApp () {
    return {
        port: process.env.PORT || 9999,
        isLocal: W.isDefined( process.env.IS_LOCAL ) ? Boolean( process.env.IS_LOCAL ) : false
    };
}

var initWebApp = W.composePromisers( makeExpressApp,
                                     makeServer,
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

        // ### W.js Clientside
        app.expressApp.get( '/W.min.js', W.jsMinMiddleware() );
        
        resolve( app );
    });
}

function makeServer ( app ) {
    return W.promise( function ( resolve, reject ) {
        app.server = https.createServer( {
            key: fs.readFileSync( './server.key' ),
            cert: fs.readFileSync( './server.crt' ),
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

// Utils
// =====

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
