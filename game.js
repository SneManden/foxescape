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
    this.samples = {};
    this.texturesRemaining = 0;
    this.samplesRemaining = 0;
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
    this.keysLocked = false;
    this.paused = false;
    this.playerGoalPosition = -1024.0;
    this.STATES = {
        LOADING: 0,
        PLAY: 1,
        PAUSED: 2,
        WIN: 3,
        LOSE: 4,
    }
    this.state = this.STATES.LOADING;
};

Game.prototype = {

    init: function() {
        this.canvas = document.getElementById("webglcanvas");
        var error = this.initWebGL(this.canvas);

        // Add samples here
        this.samples.background = new Sample("background", "Abstraction-track04.wav", 0.6, -1);
        this.samples.defeat = new Sample("defeat", "SuddenDefeat.mp3", 0.6, -1);
        this.samples.cruelLaugh = new Sample("cruelLaugh", "cruelLaugh.mp3", 1.0, -1);
        this.samples.evilLaugh = new Sample("evilLaugh", "evilLaughHitman.wav", 1.0, -1);
        this.samples.mushroom = new Sample("mushroom", "mushroom.wav", 0.8);
        this.samples.berry = new Sample("berry", "berry.wav", 0.8);
        this.samples.jump = new Sample("jump", "jump.wav", 0.5);
        this.samples.fall = new Sample("fall", "fall.wav", 0.8);
        this.samples.grab = new Sample("grab", "grab.wav", 0.5);
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
        this.textures.push(
            (this.font = new Texture({source:"font.png"}))
        );
        // Add entities here
        this.entities.push(
            (this.player = new Player(this, undefined, this.spriteSheet))
        );
        this.entities.push(
            (this.enemy = new Enemy(this, {x:0,y:0,z:10.0}, this.spriteSheet,
                                    {w:16.0, h:32.0}, {x:64, y:96}))
        );

        // Is WebGl properly initialized and working?
        if (gl) {
            gl.viewportWidth = this.canvas.width;
            gl.viewportHeight = this.canvas.height;
            gl.clearColor(0.0, 0.0, 0.0, 1.0);  // rgba(0.0, 0.0, 0.0, 1.0)
            gl.clearDepth(1.0);                 // "clear everything"
            gl.enable(gl.DEPTH_TEST);           // Enable depth testing
            gl.depthFunc(gl.LEQUAL);            // Near things obscure those far
            this.initShaders();
            this.initBuffers();
            document.onkeydown = partial(this.handleKeyDown, this);
            document.onkeyup = partial(this.handleKeyUp, this);
            this.initTextures();
            this.initSamples();
        } else {
            Util.displayError("WebGL initialization failed: " + error);
        }
    },

    initWebGL: function(canvas) {
        try { // Try real "webgl" context
            gl = canvas.getContext("webgl");
        } catch(e) {
            try { // Try experimental version
                gl = canvas.getContext("experimental-webgl");
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
    },

    initTextures: function() {
        for (var i in this.textures) {
            this.texturesRemaining++;
            this.textures[i].initTexture();
        }
    },

    initSamples: function() {
        if (!createjs.Sound.initializeDefaultPlugins()) return;
        var manifest = [];
        for (var i in this.samples) {
            manifest.push( this.samples[i].getManifest() );
            this.samplesRemaining++;
        }
        createjs.Sound.addEventListener("fileload", partial(this.sampleLoaded, this));
        createjs.Sound.registerManifest(manifest, "snd/");
    },

    sampleLoaded: function(self, e) {
        self.samples[e.id].hasLoaded();
        self.samplesRemaining--;
        if (self.samplesRemaining == 0)
            self.allLoaded(self);
    },

    allLoaded: function(self) {
        Util.log("All assets has been loaded");
        self.start();
    },

    start: function() {
        if (this.shaderProgram == null) {
            Util.displayError("Shaderprogram not properly initialized");
            return;
        }
        this.state = this.STATES.PLAY;
        Util.log("Game started");
        this.nextLevel();
        // Play background music
        this.samples.background.play();
        // Start game loop
        gameLoop();
    },

    tick: function() {
        this.handleKeys();
        if (this.state == this.STATES.PLAY) {
            this.drawScene();
            this.animate();
        } else if (this.state == this.STATES.WIN || this.state == this.STATES.LOSE) {
            this.drawWinLose();
            this.animateWinLose();
        }
        if (new Date().getTime() - this.keysLocked > 50) this.keysLocked = false;
    },

    drawScene: function() {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        // gl.clearColor(0.25, 0.25, 0.25, 1.0);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Initialize matrices for perspective and camera/view
        var pMatrix = mat4.create(),
            mvMatrix = mat4.create();
        mat4.perspective(35, gl.viewportWidth/gl.viewportHeight,
            0.1, 100.0, pMatrix);
        mat4.identity(mvMatrix);
        // Set camera
        mat4.rotate(mvMatrix, Math.PI/20.0, [1, 0, 0]);
        mat4.translate(mvMatrix, [0.0, 0.0, -6.0]); // move a little back
        mat4.translate(mvMatrix, [-this.player.position.x*0.65,
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

        // Draw left side #1
        Util.pushMatrix(mvMatrix);
        mat4.translate(mvMatrix, [-0.5-11.0, -0.5-7.75, 0.0+this.groundOffset]);
        mat4.scale(mvMatrix, [10.0, 10.0, 128.0]);
        mat4.rotate(mvMatrix, Math.PI/2.0, [0, 1, 0]);
        Sprite4.setTexture(this.background);
        Sprite4.renderSprite({w:128, h:128}, {x:0, y:0}, pMatrix, mvMatrix);
        mvMatrix = Util.popMatrix();
        // Draw left side #2
        Util.pushMatrix(mvMatrix);
        mat4.translate(mvMatrix, [-0.5-11.0, -0.5-7.75, -128.0+this.groundOffset]);
        mat4.scale(mvMatrix, [10.0, 10.0, 128.0]);
        mat4.rotate(mvMatrix, Math.PI/2.0, [0, 1, 0]);
        Sprite4.setTexture(this.background);
        Sprite4.renderSprite({w:128, h:128}, {x:0, y:0}, pMatrix, mvMatrix);
        mvMatrix = Util.popMatrix();
        // Draw right side #1
        Util.pushMatrix(mvMatrix);
        mat4.translate(mvMatrix, [-0.5+11.0, -0.5-7.75, 0.0+this.groundOffset]);
        mat4.scale(mvMatrix, [10.0, 10.0, 128.0]);
        mat4.rotate(mvMatrix, Math.PI/2.0, [0, 1, 0]);
        Sprite4.setTexture(this.background);
        Sprite4.renderSprite({w:128, h:128}, {x:0, y:0}, pMatrix, mvMatrix);
        mvMatrix = Util.popMatrix();
        // Draw right side #2
        Util.pushMatrix(mvMatrix);
        mat4.translate(mvMatrix, [-0.5+11.0, -0.5-7.75, -128.0+this.groundOffset]);
        mat4.scale(mvMatrix, [10.0, 10.0, 128.0]);
        mat4.rotate(mvMatrix, Math.PI/2.0, [0, 1, 0]);
        Sprite4.setTexture(this.background);
        Sprite4.renderSprite({w:128, h:128}, {x:0, y:0}, pMatrix, mvMatrix);
        mvMatrix = Util.popMatrix();
        // Draw background
        Util.pushMatrix(mvMatrix);
        mat4.translate(mvMatrix, [-0.5-11.0, -0.5-7.75, -75.0+this.player.position.z]);
        mat4.scale(mvMatrix, [22.0, 10.0, 10.0]);
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

        // Draw (enemy vs player)-bar
        gl.disable(gl.DEPTH_TEST);
        var width = gl.viewportWidth,   height = gl.viewportHeight;
        var oMatrix = mat4.create(),    vMatrix = mat4.create();
        mat4.identity(oMatrix);         mat4.identity(vMatrix);


        // Render bar
        Util.pushMatrix(vMatrix);
        mat4.translate(vMatrix, [-1.0, -0.75, -1.0]);
        mat4.scale(vMatrix, [0.25, 1.0, 0.0]);
        Sprite4.setTexture(this.spriteSheet);
        Sprite4.renderScreenSprite({w:16,h:32}, {x:112,y:96}, oMatrix, vMatrix);
        vMatrix = Util.popMatrix();
        
        // Render fox
        var playerPos = (this.player.position.z / this.playerGoalPosition);
        Util.pushMatrix(vMatrix);
        mat4.translate(vMatrix, [-1.0+0.0625, -0.8 + 0.9*playerPos, -1.0]);
        mat4.scale(vMatrix, [0.15, 0.15, 0.0]);
        Sprite4.renderScreenSprite({w:16,h:16}, {x:96,y:112}, oMatrix, vMatrix);
        vMatrix = Util.popMatrix();

        // Render enemy
        var enemyPos = (this.enemy.position.z / this.playerGoalPosition);
        Util.pushMatrix(vMatrix);
        mat4.translate(vMatrix, [-1.0+0.0625, -0.8 + 0.9*enemyPos, -1.0]);
        mat4.scale(vMatrix, [0.15, 0.15, 0.0]);
        Sprite4.renderScreenSprite({w:16,h:16}, {x:96,y:96}, oMatrix, vMatrix);
        vMatrix = Util.popMatrix();

        gl.enable(gl.DEPTH_TEST);
    },

    fadeToBlack: function(draw, callback) {
        draw.call(this);
        if (!this.fade) this.fade = [0.0, 0.0, 0.0];
        if (vec3.nearlyEquals(this.fade, [0.35, 0.35, 0.35]))
            callback.call(this);
        else
            vec3.add(this.fade, [0.001, 0.001, 0.001], this.fade);
        gl.uniform3fv(this.shaderProgram.fadeUniform, this.fade);
    },

    fadeFromBlack: function(draw, callback) {
        // draw.call(this);
        if (!this.fade) this.fade = [0.35, 0.35, 0.35];
        if (vec3.nearlyEquals(this.fade, [0.0, 0.0, 0.0]))
            callback.call(this);
        else
            vec3.subtract(this.fade, [0.001, 0.001, 0.001], this.fade);
        gl.uniform3fv(this.shaderProgram.fadeUniform, this.fade);
    },

    drawWinLose: function() {
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Initialize matrices for perspective and camera/view
        var pMatrix = mat4.create(),
            mvMatrix = mat4.create();
        mat4.perspective(35, gl.viewportWidth/gl.viewportHeight,
            0.1, 100.0, pMatrix);
        mat4.identity(mvMatrix);
        // Set camera
        mat4.rotate(mvMatrix, Math.PI/20.0, [1, 0, 0]);
        mat4.translate(mvMatrix, [0.0, 1.0, -6.0]); // move a little back

        // Draw ground
        Util.pushMatrix(mvMatrix);
        mat4.translate(mvMatrix, [0.0, -2.0, -32.0]);
        mat4.rotate(mvMatrix, Math.PI/2.0, [1, 0, 0]);
        mat4.scale(mvMatrix, [48.0, 128.0, 1.0]);
        mat4.translate(mvMatrix, [-0.5, -0.5, 0.0]); // adjust anchor
        Sprite4.setTexture(this.groundTexture);
        Sprite4.renderSprite({w:128, h:128}, {x:0, y:0}, pMatrix, mvMatrix);
        mvMatrix = Util.popMatrix();

        // Draw Evil Mr. Grabberson with fox
        Util.pushMatrix(mvMatrix);
        mat4.translate(mvMatrix, [-0.5, -0.5-1.5, 3.5]); // adjust anchor
        Sprite4.setTexture(this.spriteSheet);
        Sprite4.renderSprite3({w: 48, h: 48}, {x: 32, y: 32}, pMatrix, mvMatrix);
        mvMatrix = Util.popMatrix();

        // Draw text
        gl.disable(gl.DEPTH_TEST);
        var width = gl.viewportWidth,   height = gl.viewportHeight;
        var oMatrix = mat4.create(),    vMatrix = mat4.create();
        mat4.identity(oMatrix);         mat4.identity(vMatrix);
        // Draw lose text
        mat4.translate(vMatrix, [-0.9, 0.75, 1.0]);
        mat4.scale(vMatrix, [0.1, 0.2, 1.0]);
        mat4.scale(vMatrix, [0.5, 0.5, 0.5]);
        Util.pushMatrix(vMatrix);
        Sprite4.drawText("Evil Mr. Grabberson: ", this.font, oMatrix, vMatrix);
        Sprite4.drawText(" Muahaha! You lose, Foxboy! Fox is mine!", this.font, oMatrix, vMatrix);
        vMatrix = Util.popMatrix();
        gl.enable(gl.DEPTH_TEST);
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

        // Winning condition
        if (this.player.position.z <= this.playerGoalPosition)
            this.playerWins();
        // Lose condition
        if (this.player.position.z >= this.enemy.position.z-2.0)
            this.playerLoses();

        // this.playerLoses();
    },

    animateWinLose: function() {
        // return;
        if (this.doFade === undefined) this.doFade = true;
        if (this.hasFaded === undefined) this.hasFaded = false;
        if (this.doFade) {
            if (!this.hasFaded) {
                var self = this;
                this.fadeToBlack(this.drawScene, function() {
                    self.hasFaded = true;
                    // console.log("hasFaded from black");
                });
                return;
            } else {
                var self = this;
                this.fadeFromBlack(undefined, function() {
                    self.doFade = false;
                    // console.log("Done fading");
                });
            }
        }
    },

    playerWins: function() {
        this.state = this.STATES.WIN;
        Util.log("Player wins!");
    },

    playerLoses: function() {
        this.state = this.STATES.LOSE;
        createjs.Sound.stop();
        createjs.Sound.setMute(false);
        this.samples.defeat.play();
        // this.samples.evilLaugh.play();
        Util.log("Player loses!");
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
            // Rock 20%, Tree 70%, Mushroom 7%, Berry 3%
            var probs = {tree:0.7, rock:0.2, mushroom:0.07, berry:0.03};
            var rand = Math.random();
            if (rand < probs.tree)
               obstacle = new Tree(this, pos, this.spriteSheet,
               {w:32.0, h:48.0}, {x:80.0, y:16.0} );
            else if (rand < probs.tree+probs.rock) 
                obstacle = new Rock(this, pos, this.spriteSheet,
                {w:16.0, h:16.0}, {x:32.0+16.0*sprite, y:0.0} );
            else if (rand < probs.tree+probs.rock+probs.mushroom)
               obstacle = new Mushroom(this, pos, this.spriteSheet,
               {w:16.0, h:16.0}, {x:64.0, y:0.0}, i);
            else
                obstacle = new Berry(this, pos, this.spriteSheet,
                {w:16.0, h:16.0}, {x:32.0+16.0*sprite, y:16.0}, i);
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
        if (!this.keysLocked && this.keys[68]) {
            this.toggleDebugMode();
            this.keysLocked = new Date().getTime();
        }

        // Pause game
        if (!this.keysLocked && this.keys[80]) {
            if (this.paused)    this.unPause();
            else                this.pause();
            this.keysLocked = new Date().getTime();
        }

        this.entities[0].handleKeys();
    },

    pause: function() {
        this.state = this.STATES.PAUSED;
        this.paused = true;
        // this.samples.background.pause();
        createjs.Sound.setMute(true);
    },

    unPause: function() {
        this.state = this.STATES.PLAY;
        this.paused = false;
        createjs.Sound.setMute(false);
        // this.samples.background.play();
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