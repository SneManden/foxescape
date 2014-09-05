/**
 * [Sprite description]
 */
var Sprite = function(game, position, dimensions, texture, textureCoords, color) {
    this.game = game;
    this.position = position;
    this.width = dimensions.width;
    this.height = dimensions.height;
    this.texture = texture;
    this.textureCoords = textureCoords;
    this.color = color;

    this.shaderProgram = null;
    this.vertexPositionBuffer = null;
    this.vertices = [
        -1.0, -1.0,  0.0,   // lower left
         1.0, -1.0,  0.0,   // lower right
         1.0,  1.0,  0.0,   // upper right
        -1.0,  1.0,  0.0,   // upper left
    ];
    this.xRot = 0;
    this.yRot = 0;
    this.zRot = 0;
    this.vertexIndexBuffer = null;
    this.indices = [
        0, 1, 2,    0, 2, 3
    ];
};
Sprite.prototype = {

    initBuffers: function() {
        // Prepare vertex positions buffer
        this.vertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices),
            gl.STATIC_DRAW);
        this.vertexPositionBuffer.numItems = 4; // 4 vertices of
        this.vertexPositionBuffer.itemSize = 3; // 3 elements (x,y,z)

        this.texture.initBuffers();

        this.vertexIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(this.indices), gl.STATIC_DRAW);
        this.vertexIndexBuffer.numItems = 1;
        this.vertexIndexBuffer.itemSize = 6;
    },

    render: function() {
        if (!this.texture.loaded) return;
        // console.log(this.texture);

        this.game.pushMatrix();

        mat4.rotate(this.game.mvMatrix, this.xRot, [1.0, 0.0, 0.0]);
        mat4.rotate(this.game.mvMatrix, this.yRot, [0.0, 1.0, 0.0]);
        mat4.rotate(this.game.mvMatrix, this.zRot, [0.0, 0.0, 1.0]);

        var shaderProgram = this.game.shaderProgram;
        // Push vertex positions
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
            this.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
        // Push texture coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texture.textureCoordBuffer);
        gl.vertexAttribPointer(shaderProgram.textureCoordAttribute,
            this.texture.textureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
        // Use texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture.texture);
        gl.uniform1i(shaderProgram.samplerUniform, 0);
        
        // Set texture uniforms
        var textureMatrix = mat4.create();
        mat4.identity(textureMatrix);
        // mat4.scale(textureMatrix, [1.0/128.0, 1.0/128.0, 0.0]);
        // mat4.translate(textureMatrix, [0.0, 0.0, 0.0]);
        // mat4.scale(textureMatrix, [32.0, 32.0, 0.0]);
        gl.uniformMatrix4fv(shaderProgram.textureUniform,
            false, textureMatrix);
        
        // Set uniforms and draw from arrays
        this.game.setMatrixUniforms();
        
        // Draw arrays
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vertexIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.vertexIndexBuffer.itemSize,
            gl.UNSIGNED_SHORT, 0);
        // gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.vertexPositionBuffer.numItems);

        this.game.popMatrix();
    },

    setTexture: function(texture) {
        this.texture = texture;
        gl.bindTexture(WebGL.TEXTURE_2D, texture.texture);
    },

    draw: function() {
        this.render();
    },

    animate: function(elapsedTime) {
        // return;
        // this.xRot += 0.01;
        this.yRot += 0.01;
        // this.zRot += 0.01;
    }

};








// OLD CODE for Sprite4.renderSprite()
// Setup object transformation
var objMatrix = mat4.create();
mat4.identity(objMatrix);
mat4.translate(objMatrix, [position.x-0.5, position.y-0.5, position.z]);
gl.uniformMatrix4fv(this.shaderProgram.objectUniform, false, objMatrix);