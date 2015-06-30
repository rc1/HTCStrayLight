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
        errorCallback( err );
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
Packet.defaultJsonError = function ( err ) {
    console.error( 'Packet Json conversion error', err );
};

// # Exports

if ( typeof module !== 'undefined' && typeof module.exports !== 'undefined' ) {
    module.exports = Packet;
}
