/**
 * Initializes the vertex- and fragment shaders that takes care of
 * vertex positioning, colouring, texturing, lighting, etc.
 * @param {String} vShaderFile Filename of vertex shader file (.glsl)
 * @param {String} fShaderFile Filename of fragment shader file (.glsl)
 */
var Shader = function(vShaderFile, fShaderFile) {
    this.vShaderFile = vShaderFile;
    this.fShaderFile = fShaderFile;
    this.shaderProgram = null;
};
Shader.prototype = {

    init: function() {
        var vertexShader = this.getShader(this.vShaderFile, "vertex"),
            fragmentShader = this.getShader(this.fShaderFile, "fragment");
        if (vertexShader === null || fragmentShader === null) {
            Util.displayError("Shader error");
            return null;
        }
        this.createProgram(vertexShader, fragmentShader);
        this.setupAttributes();
        this.setupUniforms();
        return this.shaderProgram;
    },

    createProgram: function(vertexShader, fragmentShader) {
        // Crate shader program and attach shaders to it
        this.shaderProgram = gl.createProgram();
        gl.attachShader(this.shaderProgram, vertexShader);
        gl.attachShader(this.shaderProgram, fragmentShader);
        gl.linkProgram(this.shaderProgram);
        // How did it go?
        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS))
            Util.displayError("Unable to initialize the shader program");
        gl.useProgram(this.shaderProgram);
        Util.log("Shader: Shaderprogram created");
    },

    setupAttributes: function() {
        // Vertex position attribute
        this.shaderProgram.vertexPositionAttribute = gl.getAttribLocation(
            this.shaderProgram, "aVertexPosition");
        gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);
        Util.log("Shader: attributes setup and enabled");
    },

    setupUniforms: function() {
        this.shaderProgram.pMatrixUniform = gl.getUniformLocation(
            this.shaderProgram, "uPmatrix");
        this.shaderProgram.mvMatrixUniform = gl.getUniformLocation(
            this.shaderProgram, "uMVmatrix");
        this.shaderProgram.samplerUniform = gl.getUniformLocation(
            this.shaderProgram, "uSampler");
        this.shaderProgram.textureUniform = gl.getUniformLocation(
            this.shaderProgram, "uTexture");
        this.shaderProgram.colorUniform = gl.getUniformLocation(
            this.shaderProgram, "uColor");
        this.shaderProgram.mushroomUniform = gl.getUniformLocation(
            this.shaderProgram, "uMushroom");
        this.shaderProgram.fadeUniform = gl.getUniformLocation(
            this.shaderProgram, "uFade");
        Util.log("Shader: uniforms setup");
    },

    getShader: function(filename, type) {
        var data = this.loadShader(filename);
        return this.compileShader(data, type);
    },

    // Warning: fetches files synchonously!
    // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Synchronous_and_Asynchronous_Requests#Synchronous_request
    loadShader: function(filename) {
        var request = new XMLHttpRequest(),
            data;
        request.open("GET", filename, false); // synchronous=false
        request.send(null);
        if (request.status == 200)
            return request.responseText;
        else
            return null;
    },

    compileShader: function(data, type) {
        var shader;
        if (type == "vertex")
            shader = gl.createShader(gl.VERTEX_SHADER);
        else if (type == "fragment")
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        else
            return null;
        // Compile it
        gl.shaderSource(shader, data);
        gl.compileShader(shader);
        // Did it compile successfully?
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            Util.displayError("Error compiling " + type + " shader: " +
                              gl.getShaderInfoLog(shader));
            return null;
        } else
            Util.log("Shader: " + type + " shader compiled succesfully");
        return shader;
    }

};