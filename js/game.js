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
    this.playerGoalPosition = -2048.0-64.0; // Better not on boundary (x*128)
    this.STATES = {
        LOADING: 0,
        TITLE: 1,
        PLAY: 2,
        PAUSED: 3,
        WIN: 4,
        LOSE: 5,
    }
    this.state = this.STATES.LOADING;
    this.SCREENS = {
        WELCOME: 0,
        STORY: 1,
        CONTROLS: 2,
        CREDITS: 3
    };
    this.screen = this.SCREENS.WELCOME;
    this.doFade = true;
    this.hasFaded = false;
};

Game.prototype = {

    init: function() {
        this.canvas = document.getElementById("webglcanvas");
        var error = this.initWebGL(this.canvas);

        // Add samples here
        this.samples.background = new Sample("background", "Abstraction04-running.wav", 0.6, -1);
        this.samples.victory = new Sample("victory", "Abstraction01-victory.wav", 0.6, -1);
        this.samples.defeat = new Sample("defeat", "Abstraction05-defeat.wav", 0.6, -1);
        this.samples.title = new Sample("title", "Abstraction08-title.wav", 0.6, -1);
        // this.samples.defeat = new Sample("defeat", "SuddenDefeat.mp3", 0.6, -1);
        this.samples.mushroom = new Sample("mushroom", "mushroom.wav", 0.8);
        this.samples.berry = new Sample("berry", "berry.wav", 0.8);
        this.samples.jump = new Sample("jump", "jump.wav", 0.5);
        this.samples.fall = new Sample("fall", "fall.wav", 0.8);
        this.samples.grab = new Sample("grab", "grab.wav", 0.5);
        // Add textures here
        this.textures.push(
            (this.spriteSheet = new Texture({source:"/tex/spriteSheet.png"}))
        );
        this.textures.push(
            (this.groundTexture = new Texture({source:"/tex/ground.png"}))
        );
        this.textures.push(
            (this.background = new Texture({source:"/tex/backgroundTrees.png"}))
        );
        this.textures.push(
            (this.font = new Texture({source:"/tex/font.png"}))
        );
        this.textures.push(
            (this.titleTexture = new Texture({source:"/tex/title.png"}))
        );
        // Add entities here
        this.entities.push(
            (this.player = new Player(this, undefined, this.spriteSheet))
        );
        this.entities.push(
            (this.enemy = new Enemy(this, {x:0,y:0,z:32.0}, this.spriteSheet,
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
            document.onkeypress = partial(this.handleKeyPressed, this);
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
        var shader = new Shader("/shaders/vertexShader.glsl", "/shaders/fragmentShader.glsl");
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
        createjs.Sound.registerManifest(manifest, "/snd/");
    },

    sampleLoaded: function(self, e) {
        self.samples[e.id].hasLoaded();
        self.samplesRemaining--;
        if (self.samplesRemaining == 0)
            self.allLoaded(self);
    },

    allLoaded: function(self) {
        Util.log("All assets has been loaded");
        // Remove "Loading..." text
        document.getElementById('loading').style.display = "None";
        self.title();
    },

    title: function() {
        if (this.shaderProgram == null) {
            Util.displayError("Shaderprogram not properly initialized");
            return;
        }
        this.state = this.STATES.TITLE;
        this.samples.title.play();
        gameLoop();
    },

    start: function() {
        if (this.shaderProgram == null) {
            Util.displayError("Shaderprogram not properly initialized");
            return;
        }
        // Reset
        this.obstacles = [];
        this.player.position = {x:0, y:-1.5, z:0};
        this.enemy.position = {x:0, y:-1.5, z:32.0};
        this.level = -1;
        this.doFade = true;
        this.hasFaded = false;
        this.foxhole = null;
        // Stop previous playing sounds/music
        createjs.Sound.stop();
        // Play background music
        this.samples.background.setVolume(0.6);
        this.samples.background.play();
        // Set state and begin next level
        this.state = this.STATES.PLAY;
        this.nextLevel();
        Util.log("Game started");
    },

    backToTitle: function() {
        createjs.Sound.stop();
        this.state = this.STATES.TITLE;
        this.samples.title.play();
    },

    tick: function() {
        this.handleKeys();
        if (this.state == this.STATES.PLAY) {
            this.drawScene();
            this.animate();
        } else if (this.state == this.STATES.WIN || this.state == this.STATES.LOSE) {
            this.drawWinLose();
            this.animateWinLose();
        } else if (this.state == this.STATES.TITLE) {
            this.drawTitle();
            this.animateTitle();
        }
    },

    drawTitle: function() {
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

        if (this.screen == this.SCREENS.WELCOME) {
            // Draw Evil Mr. Grabberson, chasing fox
            Util.pushMatrix(mvMatrix);
            mat4.translate(mvMatrix, [-1.5, -2.05, 2.9]); // adjust anchor
            mat4.scale(mvMatrix, [1.5, 1.0, 1.0]);
            Sprite4.setTexture(this.titleTexture);
            Sprite4.renderSprite({w:48, h:32}, {x:0, y:16}, pMatrix, mvMatrix);
            mvMatrix = Util.popMatrix();
            // Draw escaping fox
            Util.pushMatrix(mvMatrix);
            mat4.translate(mvMatrix, [0.2, -2.05, 2.9]); // adjust anchor
            mat4.scale(mvMatrix, [1.5, 1.0, 1.0]);
            Sprite4.setTexture(this.titleTexture);
            Sprite4.renderSprite({w:48, h:32}, {x:0, y:-16}, pMatrix, mvMatrix);
            mvMatrix = Util.popMatrix();
        }

        // Prepare to draw text
        gl.disable(gl.DEPTH_TEST);
        var width = gl.viewportWidth,   height = gl.viewportHeight;
        var oMatrix = mat4.create(),    vMatrix = mat4.create();
        mat4.identity(oMatrix);         mat4.identity(vMatrix);

        // Set proper size and position at top-left corner
        mat4.translate(vMatrix, [-0.95, 0.8, 1.0]);
        mat4.scale(vMatrix, [0.1, 0.2, 1.0]);
        mat4.scale(vMatrix, [0.5, 0.5, 1.0]);
        
        Util.pushMatrix(vMatrix);
        if (this.screen == this.SCREENS.WELCOME) {
            Util.pushMatrix(vMatrix);
            mat4.translate(vMatrix, [30.0, 1.0, 0.0]);
            mat4.scale(vMatrix, [0.4, 0.4, 0.4])
            Sprite4.drawText("Released: 2014-09-10",
                this.font, oMatrix, vMatrix);
            vMatrix = Util.popMatrix();
            
            Util.pushMatrix(vMatrix);
            mat4.translate(vMatrix, [12.0, -0.5, 0.0]);
            mat4.scale(vMatrix, [0.7, 0.7, 1.0]);
            Sprite4.drawText("SneManden Games presents",
                this.font, oMatrix, vMatrix);
            vMatrix = Util.popMatrix();

            mat4.translate(vMatrix, [0.65, -2.5, 0.0]);
            Sprite4.drawText("Fox, escape from Evil Mr. Grabberson!",
                this.font, oMatrix, vMatrix);

            mat4.translate(vMatrix, [4.0, -12.0, 0.0]);
            mat4.scale(vMatrix, [0.75, 0.75, 0.75]);
            var extra = [
                "Navigate menu with <left> and <right>",
                "Press <Enter> or <Space> to start game",
            ];
            this.drawLines(extra, this.font, oMatrix, vMatrix);
        }
        else if (this.screen == this.SCREENS.STORY) {
            var story = [
                "The best animal in the world, the Fox,",
                "is chased by the villainous and wicked",
                "Evil Mr. Grabberson.",
                "",
                "Fox must therefore escape the wrath of",
                "Evil Mr. Grabberson, and return safely",
                "to its foxhole in the midst of the",
                "unilluminated forest.",
                "",
                "For all you do, do not let the immoral",
                "Evil Mr. Grabberson get hold of Fox!",
            ];
            this.drawLines(story, this.font, oMatrix, vMatrix);
        }
        else if (this.screen == this.SCREENS.CONTROLS) {
            var controls = [
                "CONTROLS:",
                "  Move and jump Fox with <ARROW> keys",
                "  <M> to mute, <P> to pause",
                "",
                "Be careful in the forest:",
                "  Fox may tumble on stone",
                "  Fox will get high by eating mushroom",
                "  Fox will get well by eating berry",
                "",
                "Do not miss the foxhole!",
            ];
            this.drawLines(controls, this.font, oMatrix, vMatrix);
        }
        else if (this.screen == this.SCREENS.CREDITS) {
            var credits = [
                "The game, graphics and sound effects",
                "are created and/or generated by:",
                "  Casper Kehlet Jensen",
                "",
                "Music can be credited Soundcloud-user:",
                "  Abstraction",
                "",
                "Special mentions:",
                "  Joakim & Soeren (game characters)",
                "  Notch (inspiration and awesome)",
                "",
                "HTML5, Javascript, WebGL",
            ];
            this.drawLines(credits, this.font, oMatrix, vMatrix);
        }
        vMatrix = Util.popMatrix();
        gl.enable(gl.DEPTH_TEST);
    },

    drawLines: function(lines, font, pMatrix, mvMatrix) {
        for (var i=0; i<lines.length; i++) {
            var line = lines[i];
            Sprite4.drawText(line, font, pMatrix, mvMatrix);
        }
    },

    drawScene: function() {
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
        mat4.translate(mvMatrix, [0.0, 0.0, -6.0]); // move a little back
        mat4.translate(mvMatrix, [-this.player.position.x*0.65,
                                  -0.25-this.player.position.y*0.25,
                                  -this.player.position.z] ); // follow player

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

        if (this.enemy) {
            // Render enemy
            var enemyPos = (this.enemy.position.z / this.playerGoalPosition);
            Util.pushMatrix(vMatrix);
            mat4.translate(vMatrix, [-1.0+0.0625, -0.8 + 0.9*enemyPos, -1.0]);
            mat4.scale(vMatrix, [0.15, 0.15, 0.0]);
            Sprite4.renderScreenSprite({w:16,h:16}, {x:96,y:96}, oMatrix, vMatrix);
            vMatrix = Util.popMatrix();
        }

        gl.enable(gl.DEPTH_TEST);
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

        // Draw Win or Lose 
        if (this.state == this.STATES.WIN)
            this.drawWin(pMatrix, mvMatrix);
        if (this.state == this.STATES.LOSE)
            this.drawLose(pMatrix, mvMatrix);
    },

    drawWin: function(pMatrix, mvMatrix) {
        // Draw exhausted Evil Mr. Grabberson
        Util.pushMatrix(mvMatrix);
        mat4.translate(mvMatrix, [-1.0, -2.0, 3.5]); // adjust anchor
        Sprite4.setTexture(this.spriteSheet);
        Sprite4.renderSprite3({w:32, h:48}, {x:80, y:48}, pMatrix, mvMatrix);
        mvMatrix = Util.popMatrix();

        // Draw Fox in Foxhole
        Util.pushMatrix(mvMatrix);
        mat4.translate(mvMatrix, [0.5, -2.0, 1.5]); // adjust anchor
        mat4.scale(mvMatrix, [1.0, 0.5, 1.0]);
        Sprite4.setTexture(this.spriteSheet);
        Sprite4.renderSprite({w:32, h:16}, {x:64, y:16-16}, pMatrix, mvMatrix);
        mvMatrix = Util.popMatrix();

        // Draw text
        gl.disable(gl.DEPTH_TEST);
        var width = gl.viewportWidth,   height = gl.viewportHeight;
        var oMatrix = mat4.create(),    vMatrix = mat4.create();
        mat4.identity(oMatrix);         mat4.identity(vMatrix);
        // Draw win text
        mat4.translate(vMatrix, [-0.95, 0.8, 1.0]);
        mat4.scale(vMatrix, [0.1, 0.2, 1.0]);
        mat4.scale(vMatrix, [0.5, 0.5, 0.5]);
        Util.pushMatrix(vMatrix);
        var winText = [
            "Evil Mr. Grabberson: ",
            " \"Aaah! Damn you, Fox!",
            "  You win this time!\"",
            "","","","","","","","",
            "<R> to try again; <Space> to return",
        ];
        this.drawLines(winText, this.font, oMatrix, vMatrix);
        vMatrix = Util.popMatrix();
        gl.enable(gl.DEPTH_TEST);
    },

    drawLose: function(pMatrix, mvMatrix) {
        // Draw Evil Mr. Grabberson with fox
        Util.pushMatrix(mvMatrix);
        mat4.translate(mvMatrix, [-0.5, -0.5-1.5, 3.5]); // adjust anchor
        Sprite4.setTexture(this.spriteSheet);
        Sprite4.renderSprite3({w:48, h:48}, {x:32, y:32}, pMatrix, mvMatrix);
        mvMatrix = Util.popMatrix();

        // Draw text
        gl.disable(gl.DEPTH_TEST);
        var width = gl.viewportWidth,   height = gl.viewportHeight;
        var oMatrix = mat4.create(),    vMatrix = mat4.create();
        mat4.identity(oMatrix);         mat4.identity(vMatrix);
        // Draw lose text
        mat4.translate(vMatrix, [-0.95, 0.8, 1.0]);
        mat4.scale(vMatrix, [0.1, 0.2, 1.0]);
        mat4.scale(vMatrix, [0.5, 0.5, 0.5]);
        Util.pushMatrix(vMatrix);
        var loseText = [
            "Evil Mr. Grabberson: ",
            " \"Muahaha! You lose, Foxboy!",
            "  Fox is mine!\"",
            "","","","","","","","",
            "<R> to try again; <Space> to return",
        ];
        this.drawLines(loseText, this.font, oMatrix, vMatrix);
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

    animateTitle: function() {
        // ..
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
        // Lose condition(s)
        if (this.enemy && this.player.position.z >= this.enemy.position.z-2.0)
            this.playerLoses();
        if (this.enemy && this.player.position.z < this.foxhole.position.z-5.0)
            this.playerLoses();
    },

    animateWinLose: function() {
        if (this.doFade) {
            if (!this.hasFaded) {
                var self = this;
                this.fadeToBlack(this.drawScene, function() {
                    self.hasFaded = true;
                    self.player.normalMode();
                    // Stop all sounds and start playing defeat/victory
                    createjs.Sound.stop();
                    if (this.state == this.STATES.WIN) {
                        this.samples.victory.play();
                        this.samples.victory.setVolume(0);
                    } else if (this.state == this.STATES.LOSE) {
                        this.samples.defeat.play();
                        this.samples.defeat.setVolume(0);
                    }
                });
                this.samples.background.decreaseVolume(0.01);
                return;
            } else {
                var self = this;
                this.fadeFromBlack(undefined, function() {
                    self.doFade = false;

                    if (this.state == this.STATES.WIN)
                        this.samples.victory.setVolume(0.6);
                    if (this.state == this.STATES.LOSE)
                        this.samples.defeat.setVolume(0.6);
                });
                if (this.state == this.STATES.WIN && this.samples.victory.volume<0.6)
                    this.samples.victory.increaseVolume(0.01);
                if (this.state == this.STATES.LOSE && this.samples.defeat.volume<0.6)
                    this.samples.defeat.increaseVolume(0.001);
            }
        }
    },

    playerWins: function() {
        this.state = this.STATES.WIN;
        Util.log("Player wins!");
    },

    playerLoses: function() {
        this.state = this.STATES.LOSE;
        Util.log("Player loses!");
    },

    nextLevel: function() {
        Util.log("Level " + this.level);
        this.level++;
        if (this.level == 0) {
            // Create foxhole
            var pos = {x:Math.random()*4-2, y:-1.5, z:this.playerGoalPosition};
            this.obstacles.push(
                ( this.foxhole = new FoxHole(this, pos, this.spriteSheet,
                    {w:32,h:16}, {x:64,y:16}) )
            );
            this.createNextLevel( (this.level)*128.0, (this.level+1)*128.0);
        }
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

            // Don't place objects near foxhole
            if (this.foxhole && Math.abs(pos.z - this.foxhole.position.z) < 8.0)
                continue;

            sprite = Math.floor(Math.random() * (2 - 0)) + 0; // [0..1]
            // Rock 20%, Tree 70%, Mushroom 7%, Berry 3%
            var probs = {tree:0.7, rock:0.2, mushroom:0.07, berry:0.03};
            var rand = Math.random();
            if (rand < probs.tree)
               obstacle = new Tree(this, pos, this.spriteSheet,
               {w:32.0, h:48.0}, {x:96.0, y:16.0} );
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
        if (this.player)
            this.player.handleKeys();
    },

    pause: function() {
        this.state = this.STATES.PAUSED;
        this.paused = true;
        createjs.Sound.setMute(true);
    },

    unPause: function() {
        this.state = this.STATES.PLAY;
        this.paused = false;
        createjs.Sound.setMute(false);
    },

    handleKeyDown: function(self, e) {
        if (self.debug)
            Util.log(e.keyIdentifier + " (" + e.keyCode + ")");
        self.keys[e.keyCode] = true;
        // Suppress default action
        if ([37,38,39,40].indexOf(e.keyCode) > -1)
            e.preventDefault();
    },

    handleKeyUp: function(self, e) {
        self.keys[e.keyCode] = false;
        // Handle that arrow keys are pressed
        if ([37,38,39,40].indexOf(e.keyCode) > -1)
            self.handleKeyPressed(self, e);
    },

    handleKeyPressed: function(self, e) {
        Util.log(e.keyCode);

        // Suppress default action
        if ([100,109,112,32,13,37,39,114].indexOf(e.keyCode) > -1)
            e.preventDefault();

        var keyCode = e.keyCode;
        // Debug mode (false = disabled)
        if (false && keyCode == 100) // D
            self.toggleDebugMode();
        // Mute
        if (keyCode == 109) // M
            createjs.Sound.setMute(!createjs.Sound.getMute());
        // Pause game
        if (keyCode == 112) { // P
            if (self.paused)    self.unPause();
            else                self.pause();
        }
        // TITLE SCREEN CONTROLS
        if (self.state == self.STATES.TITLE) {
            // Space, Enter => PLAY GAME
            if (keyCode == 32 || keyCode == 13)
                self.start();
            // ARROW KEYS (left, right)
            if (keyCode == 37)
                self.screen = Math.max(self.screen-1, self.SCREENS.WELCOME);
            if (keyCode == 39)
                self.screen = Math.min(self.screen+1, self.SCREENS.CREDITS);
        }
        // WIN/LOSE CONTROLS
        if (self.state == self.STATES.WIN || self.state == self.STATES.LOSE) {
            // R, Space, Enter => BACK TO TITLE SCREEN
            if (keyCode == 114)
                self.start();
            if (keyCode == 32 || keyCode == 13)
                self.backToTitle();
        }
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

// Restarts the game by null'ing "game" and creating a new instance
// DOES NOT WORK (?)
function restartGame() {
    game = null;
    game = new Game(false);
    game.init();
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
    restartGame();
    // game = new Game(false); // debug=true
    // game.init();   
}