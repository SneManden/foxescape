/**
 * Sprite renderer; renders a flat surface in 3D with a texture
 */
var Sprite4 = {

    shaderProgram: null,
    texture: null,
    vertices: new Float32Array([    // Vertex positions
         0.0,  0.0,  0.0, // lower left
         0.0,  1.0,  0.0, // upper left
         1.0,  1.0,  0.0, // upper right
         1.0,  0.0,  0.0, // lower right
    ]),
    vertexItemSize: 3,
    texCoords: new Float32Array([   // Texture coordinates
        0.0, 0.0,
        0.0, 1.0,
        1.0, 1.0,
        1.0, 0.0,
    ]),
    texCoordsItemSize: 2,
    indices: new Uint16Array([      // Vertex indices
        0, 1, 2,    0, 2, 3
    ]),
    indexItemSize: 6,

    initBuffers: function() {
        // Vertex buffer setup
        var vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
        gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute,
            this.vertexItemSize, gl.FLOAT, false, 0, 0);
        // Texture buffer setup
        var textureBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.texCoords, gl.STATIC_DRAW);
        // gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute,
        //     this.texCoordsItemSize, gl.FLOAT, false, 0, 0);
        // Index buffer setup
        var indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        Util.log("Buffers initialized");
    },

    setShaderProgram: function(shaderProgram) {
        this.shaderProgram = shaderProgram;
    },

    setTexture: function(texture) {
        this.texture = texture;
        gl.bindTexture(gl.TEXTURE_2D, texture.texture);
    },

    setCamera: function(pMatrix, mvMatrix) {
        gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, mvMatrix);
    },

    renderSprite: function(size, offset, pMatrix, mvMatrix, color, mushroom) {
        if (!this.texture.loaded) return;
        color = (color === undefined ? [1.0, 1.0, 1.0, 1.0] : color);
        mushroom = (mushroom === undefined ? 0.0 : mushroom);
        // Setup texture matrix
        var texMatrix = mat4.create();
        mat4.identity(texMatrix);
        mat4.scale(texMatrix,
            [1.0/this.texture.width, 1.0/this.texture.height, 0.0]);
        mat4.translate(texMatrix, [offset.x+0.1, 256.0-size.w-offset.y+0.1, 0.0]);
        mat4.scale(texMatrix, [size.w-0.2, size.h-0.2, 0.0]);
        gl.uniformMatrix4fv(this.shaderProgram.textureUniform, false, texMatrix);
        // Apply color
        gl.uniform4fv(this.shaderProgram.colorUniform, color);
        // Set camera and draw sprite
        this.setCamera(pMatrix, mvMatrix);
        gl.drawElements(gl.TRIANGLES, this.indexItemSize, gl.UNSIGNED_SHORT, 0);
    },

    renderSprite2: function(size, offset, pMatrix, mvMatrix, color, mushroom) {
        if (!this.texture.loaded) return;
        color = (color === undefined ? [1.0, 1.0, 1.0, 1.0] : color);
        mushroom = (mushroom === undefined ? 0.0 : mushroom);
        // Setup texture matrix
        var texMatrix = mat4.create();
        mat4.identity(texMatrix);
        mat4.scale(texMatrix,
            [1.0/this.texture.width, 1.5/this.texture.height, 0.0]);
        mat4.translate(texMatrix, [offset.x+0.1, 256.0-size.w-offset.y+0.1, 0.0]);
        mat4.scale(texMatrix, [size.w-0.2, size.h-0.2, 0.0]);
        gl.uniformMatrix4fv(this.shaderProgram.textureUniform, false, texMatrix);
        // Apply color
        gl.uniform4fv(this.shaderProgram.colorUniform, color);
        // Set camera and draw sprite
        this.setCamera(pMatrix, mvMatrix);
        gl.drawElements(gl.TRIANGLES, this.indexItemSize, gl.UNSIGNED_SHORT, 0);
    },

    renderSprite3: function(size, offset, pMatrix, mvMatrix, color) {
        if (!this.texture.loaded) return;
        color = (color === undefined ? [1.0, 1.0, 1.0, 1.0] : color);
        // Setup texture matrix
        var texMatrix = mat4.create();
        mat4.identity(texMatrix);
        mat4.scale(texMatrix,
            [1.0/this.texture.width, /*(size.h/size.w)*/1.0/this.texture.height, 0.0]);
        mat4.translate(texMatrix, [offset.x, 256-size.w-offset.y-16.0, 0.0]);
        mat4.scale(texMatrix, [size.w, size.h, 0.0]);
        gl.uniformMatrix4fv(this.shaderProgram.textureUniform, false, texMatrix);
        gl.uniform4fv(this.shaderProgram.colorUniform, color);
        this.setCamera(pMatrix, mvMatrix);
        gl.drawElements(gl.TRIANGLES, this.indexItemSize, gl.UNSIGNED_SHORT, 0);
    },

    renderSprite4: function(size, offset, pMatrix, mvMatrix, color) {
        if (!this.texture.loaded) return;
        color = (color === undefined ? [1.0, 1.0, 1.0, 1.0] : color);
        // Setup texture matrix
        var texMatrix = mat4.create();
        mat4.identity(texMatrix);
        mat4.scale(texMatrix,
            [1.0/this.texture.width, 1.0/this.texture.height, 0.0]);
        mat4.translate(texMatrix, [offset.x, 256-size.w-offset.y-16.0, 0.0]);
        mat4.scale(texMatrix, [size.w, size.h, 0.0]);
        gl.uniformMatrix4fv(this.shaderProgram.textureUniform, false, texMatrix);
        gl.uniform4fv(this.shaderProgram.colorUniform, color);
        this.setCamera(pMatrix, mvMatrix);
        gl.drawElements(gl.TRIANGLES, this.indexItemSize, gl.UNSIGNED_SHORT, 0);
    },

    renderScreenSprite: function(size, offset, pMatrix, mvMatrix, color) {
        if (!this.texture.loaded) return;
        color = (color === undefined ? [1.0, 1.0, 1.0, 1.0] : color);
        var texMatrix = mat4.create();
        mat4.identity(texMatrix);
        mat4.scale(texMatrix,
            [1.0/this.texture.width, 1.0/this.texture.height, 0.0]);
        mat4.translate(texMatrix, [offset.x+0.1, 256.0-size.h-offset.y+0.1, 0.0]);
        mat4.scale(texMatrix, [size.w-0.2, size.h-0.2, 0.0]);
        gl.uniformMatrix4fv(this.shaderProgram.textureUniform, false, texMatrix);
        gl.uniform4fv(this.shaderProgram.colorUniform, [1.0, 1.0, 1.0, 1.0]);
        this.setCamera(pMatrix, mvMatrix);
        gl.drawElements(gl.TRIANGLES, this.indexItemSize, gl.UNSIGNED_SHORT, 0);
    },

    drawText: function(message, texture, pMatrix, mvMatrix, color) {
        color = (color === undefined ? [1.0, 1.0, 1.0, 1.0] : color);
        this.setTexture(texture);
        var size = {w:5, h:8},
            offset = {x:0, y:0},
            xPos, yPos, letter;
        var totalOffset = 0;
        for (var i=0; i<message.length; i++) {
            symbolInFont = message.charCodeAt(i) - 32; // space=32
            xPos = (symbolInFont % 12);
            yPos = Math.floor(symbolInFont / 12);
            offset.x = 5 * xPos;
            offset.y = 8 * yPos;
            // Draw the letter
            // console.log("Writing letter " + message[i] + " (code="+(symbolInFont+32)+")");
            // console.log(" => offset = {x:"+offset.x+", y:"+offset.y+"}");
            this.renderScreenSprite(size, offset, pMatrix, mvMatrix, color);
            // Move to the right for next letter
            if ( (yPos==2 && xPos>=8) || (yPos==3) || (yPos==4 && xPos<=9) ) {
                mat4.translate(mvMatrix, [1.1, 0.0, 0.0]);
                totalOffset += 1.1;
            } else {
                mat4.translate(mvMatrix, [0.99, 0.0, 0.0]);
                totalOffset += 0.99;
            }
        }
        mat4.translate(mvMatrix, [-totalOffset, -1.5, 0.0]);
    }

};