// # DOM

function updateConnectionState ( ws ) {
    var value;
    var className;
    switch ( ws.socket.readyState ) {
        case WebSocket.CONNECTING: value = "CONNECTING"; className = "warning"; break;
        case WebSocket.OPEN: value = "CONNECTED"; className = "ok"; break;
        case WebSocket.CLOSING: value = "CLOSING"; className = "warning"; break;
        case WebSocket.CLOSED: value = "CLOSED"; className = "bad"; break;
    }
    var classes = ['ok', 'bad', 'warning', 'info'];
    $( '.badge.connection' ).removeClass( _(classes).without(className).join(' ') ).addClass( className ).text( value );
}
