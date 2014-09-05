var gl = null;

/**
 * Global game object: initializes WebGL and handles objects, keyinput, etc.
 * @param {bool} debug Set to true for log messages in the console
 */
var Game = function(debug) {
    this.canvas = null;
    this.pMatrix = mat4.create();
    this.mvMatrix = mat4.create();
    this.shaderProgram = null;
    this.treePositions = [];
    this.obstacles = [];
    this.entities = [];
    this.textures = [];
    this.remaining = 0;
    this.timeLast = 0;
    this.keys = {};
    this.camera = { pitch: 0.0, yaw: 0.0, x: 0.0, y: 0.0, z: 0.0 };
    this.debug = debug;
    Util.debug = debug;
    this.frames = 0;
    this.startTime = 0;
    this.level = -1;
    this.bounds = { top:1.0, right:8.0, bottom:-1.5, left:-8.0,
                    here:-64.0, there:-128.0 };
};

Game.prototype = {

    init: function() {
        this.canvas = document.getElementById("webglcanvas");
        var error = this.initWebGL(this.canvas);

        // Add textures here
        this.textures.push(
            (this.spriteSheet = new Texture({source:"spriteSheet.png"}))
        );
        this.textures.push(
            (this.groundTexture = new Texture({source:"ground.png"}))
        );
        this.textures.push(
            (this.background = new Texture({source:"backgroundTrees.png"}))
        );
        // Add entities here
        this.entities.push(
            (this.player = new Player(this, undefined, this.spriteSheet))
        );

        // Is WebGl properly initialized and working?
        if (gl) {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);  // rgba(0.0, 0.0, 0.0, 1.0)
            gl.clearDepth(1.0);                 // "clear everything"
            gl.enable(gl.DEPTH_TEST);           // Enable depth testing
            gl.depthFunc(gl.LEQUAL);            // Near things obscure those far
            this.initShaders();
            this.initBuffers();
            document.onkeydown = partial(this.handleKeyDown, this);
            document.onkeyup = partial(this.handleKeyUp, this);
            this.initTextures();
            this.start();
        } else {
            Util.displayError("WebGL initialization failed: " + error);
        }
    },

    initWebGL: function(canvas) {
        try { // Try real "webgl" context
            gl = canvas.getContext("webgl");
            gl.viewportWidth = this.canvas.width;
            gl.viewportHeight = this.canvas.height;
        } catch(e) {
            try { // Try experimental version
                gl = canvas.getContext("experimental-webgl");
                gl.viewportWidth = this.canvas.width;
                gl.viewportHeight = this.canvas.height;
            } catch(e) {
                return e;
            }
        }
        return null;
    },

    initShaders: function() {
        var shader = new Shader("vertexShader.glsl", "fragmentShader.glsl");
        this.shaderProgram = shader.init();
        Sprite4.setShaderProgram(this.shaderProgram);
    },

    initBuffers: function() {
        Sprite4.initBuffers();
        // for (var i in this.entities)
        //     this.entities[i].initBuffers();
    },

    initTextures: function() {
        for (var i in this.textures) {
            this.remaining++;
            this.textures[i].initTexture();
        }
    },

    // assetLoaded: function() {
    //     this.remaining--;
    //     if (this.remaining == 0)
    //         this.allAssetsLoaded();
    // },

    // allAssetsLoaded: function() {
    //     Util.log("All assets loaded and initialized");
    //     this.start();
    // },

    start: function() {
        if (this.shaderProgram == null) {
            Util.displayError("Shaderprogram not properly initialized");
            return;
        }
        Util.log("Game started");
        this.nextLevel();
        gameLoop();
    },

    tick: function() {
        this.handleKeys();
        this.drawScene();
        this.animate();
    },

    drawScene: function() {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clearColor(0.25, 0.25, 0.25, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Initialize matrices for perspective and camera/view
        var pMatrix = mat4.create(),
            mvMatrix = mat4.create();
        mat4.perspective(35, gl.viewportWidth/gl.viewportHeight,
            0.1, 75.0, pMatrix);
        mat4.identity(mvMatrix);
        // Set camera
        mat4.rotate(mvMatrix, Math.PI/20.0, [1, 0, 0]);
        mat4.translate(mvMatrix, [0.0, 0.0, -6.0]); // move a little back
        mat4.translate(mvMatrix, [-this.player.position.x*0.5,
                                  -0.25-this.player.position.y*0.25,
                                  -this.player.position.z] ); // follow player

        // TODO: OPTIMIZE THIS (reuse code!)
        // Draw ground #1
        Util.pushMatrix(mvMatrix);
        mat4.translate(mvMatrix, [0.0, -2.0, -63.0+this.groundOffset]);
        mat4.rotate(mvMatrix, Math.PI/2.0, [1, 0, 0]);
        mat4.scale(mvMatrix, [24.0, 128.0, 1.0]);
        mat4.translate(mvMatrix, [-0.5, -0.5, 0.0]); // adjust anchor
        Sprite4.setTexture(this.groundTexture);
        Sprite4.renderSprite({w:128, h:128}, {x:0, y:0}, pMatrix, mvMatrix);
        mvMatrix = Util.popMatrix();
        // Draw ground #2
        Util.pushMatrix(mvMatrix);
        mat4.translate(mvMatrix, [0.0, -2.0, -63.0-128.0+this.groundOffset]);
        mat4.rotate(mvMatrix, Math.PI/2.0, [1, 0, 0]);
        mat4.scale(mvMatrix, [24.0, 128.0, 1.0]);
        mat4.translate(mvMatrix, [-0.5, -0.5, 0.0]); // adjust anchor
        // Sprite4.setTexture(this.spriteSheet);
        Sprite4.renderSprite({w:128, h:128}, {x:0, y:0}, pMatrix, mvMatrix);
        mvMatrix = Util.popMatrix();

        Util.pushMatrix(mvMatrix);
        mat4.translate(mvMatrix, [-0.5, -0.5, 0.0]);
        // mat4.translate(mvMatrix, [0.0, 0.0, -5.0]);
        // mat4.translate(mvMatrix, [0.0, 0.0, -63.0-128.0+this.groundOffset]);
        // mat4.rotate(mvMatrix, Math.PI/2.0, [0, 1, 0]);
        // mat4.translate(mvMatrix, [0.0, -1.0, -15.0]);
        // mat4.scale(mvMatrix, [128.0, 3.0, 0.0]);
        // mat4.rotate(mvMatrix, Math.PI/2.0, [0, 1, 0]);
        Sprite4.setTexture(this.background);
        Sprite4.renderSprite({w:128, h:128}, {x:0, y:0}, pMatrix, mvMatrix);
        mvMatrix = Util.popMatrix();

        // Draw each of the entities
        for (var i in this.entities) {
            Util.pushMatrix(mvMatrix);
            this.entities[i].draw(pMatrix, mvMatrix);
            mvMatrix = Util.popMatrix();
        }

        // Draw each of the obstacles
        if (!this.obstacles) return;
        for (var i=0; i<this.obstacles.length; i++) {
            Util.pushMatrix(mvMatrix);
            this.obstacles[i].draw(pMatrix, mvMatrix);
            mvMatrix = Util.popMatrix();
        }
    },

    animate: function() {
        var timeNow = new Date().getTime();
        if (this.timeLast > 0) {
            var elapsed = timeNow - this.timeLast;
            for (var i in this.entities)
                this.entities[i].animate(elapsed);
            this.handleFPS(timeNow);
        }
        this.timeLast = timeNow;

        // Will have values 0..., 128..., 256... (changes for every 128 unit)
        this.groundOffset = Math.ceil(this.player.position.z/128.0)*128.0;

        if (this.level-1 < -Math.ceil(this.player.position.z/128.0)) {
            this.nextLevel();
        }
    },

    nextLevel: function() {
        Util.log("Level " + this.level);
        this.level++;
        if (this.level == 0)
            this.createNextLevel( (this.level)*128.0, (this.level+1)*128.0);
        this.createNextLevel( (this.level+1)*128.0, (this.level+2)*128.0);
        this.clearOldLevel();
    },

    createNextLevel: function(zOffset, zMax) {
        // Add objects (trees, rocks, mushrooms)
        var pos, sprite, obstacle,
            newObjects = 32,
            newTrees = 128,
            bounds = this.bounds;
        for (var i=0; i<newObjects; i++) {
            pos = {
                x: Math.random()*(bounds.right-bounds.left) + bounds.left,
                y: -1.5,
                z: -(Math.random()*(zMax-zOffset) + zOffset)
            };
            sprite = Math.floor(Math.random() * (2 - 0)) + 0; // [0..1]
            // Rock 20%, Tree 75%, Mushroom 5%
            if (Math.random() < 0.20) 
                obstacle = new Rock(this, pos, this.spriteSheet,
                {w:16.0, h:16.0}, {x:32.0+16.0*sprite, y:0.0} );
            else if (Math.random() < 0.95)
                obstacle = new Tree(this, pos, this.spriteSheet,
                {w:32.0, h:48.0}, {x:80.0, y:16.0} );
            else
                obstacle = new Mushroom(this, pos, this.spriteSheet,
                {w:16.0, h:16.0}, {x:64.0, y:0.0}, i);
            this.obstacles.push(obstacle);
        }
        Util.log("Created level from " + zOffset + " to " + zMax);
    },

    clearOldLevel: function() {
        var obstCleared = 0;
        // Remove obstacles behind the player
        for (var i=0; i<this.obstacles.length; i++) {
            if (this.obstacles[i].position.z > this.player.position.z+5.0) {
                this.obstacles.splice(i, 1);
                obstCleared++;
            }
        }
        Util.log("Removed " + obstCleared + " obstacles");
    },

    handleKeys: function() {
        if (this.frames % 3 == 0 && this.keys[68])
            this.toggleDebugMode();
        this.entities[0].handleKeys();
    },

    handleKeyDown: function(self, e) {
        if (self.debug)
            Util.log(e.keyIdentifier + " (" + e.keyCode + ")");
        self.keys[e.keyCode] = true;
    },

    handleKeyUp: function(self, e) {
        self.keys[e.keyCode] = false;
    },

    // http://www.html5gamedevs.com/topic/1828-how-to-calculate-fps-in-plain-javascript/
    handleFPS: function(now) {
        this.frames++;
        var currentTime = (now-this.startTime)/1000,
            result = Math.floor(this.frames/currentTime);
        if (currentTime > 1) {
            this.startTime = new Date().getTime();
            this.frames = 0;
        }
        document.getElementById("fps").innerHTML = result;
    },

    setDebugMode: function(mode) {
        mode = (mode === undefined ? true : mode);
        this.debug = mode;
        Util.debug = mode;
    },

    toggleDebugMode: function() {
        this.debug = !this.debug;
        Util.debug = !Util.debug;
        document.getElementById("debugMode").checked = this.debug;
    }

};



// Somehow does not work if requestAnimFrame gets function reference
// to a function on the game object (weird?) => thus the global function
function gameLoop() {
    requestAnimFrame(gameLoop);
    game.tick();
}

// http://stackoverflow.com/questions/373157/how-can-i-pass-a-reference-to-a-function-with-parameters
function partial(func /*, 0..n args */) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function() {
        var allArguments = args.concat(Array.prototype.slice.call(arguments));
        return func.apply(this, allArguments);
    };
}

// Create game object and begin initialization when the window has done loading
var game;
window.onload = function() {
    game = new Game(false); // debug=true
    game.init();   
}