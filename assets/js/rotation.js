// Rotation
// ========
// Provides the status of the rotation
//
// See: https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Orientation_and_motion_data_explained
// See: https://developer.mozilla.org/en-US/docs/Web/API/Detecting_device_orientation

var Rotation = (function () {

    // Make & Init
    // ===========
    var make = function () {
        return {};
    };

    var init = W.composePromisers();

    // Promisers
    // =========
    
    // Export
    // ======
    return {
        make: make,
        init: init
    };

}());
