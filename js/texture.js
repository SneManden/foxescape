/**
 * A texture from an image file: to be used for a sprite (e.g)
 * @param {Object} image With "source", "width" and "height" attributes
 *                       "source" refers to filepath of imagefile on server
 */
var Texture = function(image) {
    this.image = image;
    this.texture = null;
    this.loaded = false;
    // Specifies where, in cartesian (x,y) coordinates,
    // each vertex lies in the texture
    this.textureCoordinates = [
        0.0, 0.0,   // upper left
        0.0, 1.0,   // lower left
        1.0, 0.0,   // upper right
        1.0, 1.0,   // lower right
    ];
};
Texture.prototype = {

    initTexture: function() {
        var self = this;
        this.texture = gl.createTexture();
        this.texture.image = new Image();
        this.texture.image.src = this.image.source;
        this.texture.image.onload = function() {
            self.handleLoadedTexture();
            self.width = self.texture.image.width;
            self.height = self.texture.image.height;
        }
    },

    handleLoadedTexture: function() {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
            this.texture.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null); // clean up

        Util.log("Texture " + this.image.source + " loaded and setup");
        this.loaded = true;
    },

    initBuffers: function() {
        this.textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array(this.textureCoordinates), gl.STATIC_DRAW);
        this.textureCoordBuffer.numItems = 4;
        this.textureCoordBuffer.itemSize = 2;
        Util.log("TextureCoordBuffer initialized");
    }
    
};