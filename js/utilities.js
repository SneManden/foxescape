/**
 * Various utility functions
 */
var Util = {

    debug: false,
    errors: 0,
    matrixStack: [],

    pushMatrix: function(matrix) {
        var copy = mat4.create();
        mat4.set(matrix, copy);
        this.matrixStack.push(copy);
    },

    popMatrix: function() {
        if (this.matrixStack.length == 0)
            throw "Invalid use of popMatrix(): stack is empty!";
        return this.matrixStack.pop();
    },

    displayError: function(message) {
        var eContainer = document.getElementById("errors-container"),
            errors = document.getElementById("errors"),
            error = document.createElement("li"),
            num = document.getElementById("errors-num");
        error.innerHTML = message;          // Set error message
        errors.appendChild(error);          // Add error
        eContainer.style.display = "";      // Show container
        this.log(message);                  // Log it, too
        num.innerHTML = ++this.errors;      // Set number of errors
    },

    deg2rad: function(angle) {
        return angle*Math.PI/180.0;
    },

    log: function(message) {
        if (this.debug) console.log(message);
    },

    randPos: function(bounds) {
        return {x: Math.random() * (bounds.right - bounds.left) + bounds.left,
                y: -1.5,
                z: Math.random() * (bounds.here - bounds.there) + bounds.there}
    }

};