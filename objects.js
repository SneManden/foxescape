/**
 * Player
 */
var Player = function(game, position, texture, size, offset, name) {
    this.game = game;
    this.texture = texture;
    this.name = (name == undefined ? "Player "+Math.floor(Math.random()*100) : name);
    this.position = (position == undefined ? {x:0.0, y:0.0, z:0.0} : position);
    this.size = (size == undefined ? {w:32, h:32} : size);
    this.offset = (offset == undefined ? {x:0, y:0} : offset);
    this.ticks = 0;
    this.frame = 0;
    this.normalSpeed = {x:0.1, y:0.15, z:0.05};
    this.highSpeed = {x:0.05, y:0.1, z:0.04};
    this.speed = {  x:this.normalSpeed.x,
                    y:this.normalSpeed.y,
                    z:this.normalSpeed.z };
    this.acceleration = {x:0, y:0, z:0};
    this.bounds = {top:1.0, right:6.0, bottom: -1.5, left: -6.0};
    this.running = true;
    this.tumble = false;
    this.jumpRun = true;
    this.animRate = 5.0;
    this.radius = 0.5;
    this.high = 0.0; // As in "mushroom high" (1.0 is high, 0.0 is normal)
    this.stamina = 1.0;
    this.jumpEnergy = 0.35;
};
Player.prototype = {

    draw: function(pMatrix, mvMatrix) {
        Util.pushMatrix(mvMatrix);

        // Update position and rotation
        mat4.translate(mvMatrix,
            [this.position.x, this.position.y, this.position.z]);
        mat4.translate(mvMatrix, [-0.5, -0.5, 0]); // adjust anchor
        if (this.running)
            mat4.scale(mvMatrix, [1.5, 1.5, 0.0]);
        else
            mat4.scale(mvMatrix, [1.5, 0.75, 0.0]);
        // Set texture and draw sprite
        Sprite4.setTexture(this.texture);
        var offset = {x:this.offset.x, y:this.offset.y + this.frame*this.size.h};
        Sprite4.renderSprite(this.size, offset, pMatrix, mvMatrix, undefined);
        mvMatrix = Util.popMatrix();

        // Render shadow
        mat4.translate(mvMatrix,
            [this.position.x-0.5, this.bounds.bottom-0.5, this.position.z-0.01]);
        mat4.scale(mvMatrix, [1.5, 0.8, 0.0]);
        Sprite4.renderSprite({w:32.0,h:16.0}, {x:32.0, y:96.0}, pMatrix, mvMatrix,
            [0.0, 0.0, 0.0, 1.0]);
    },

    handleKeys: function() {
        if (this.tumble) return; // can't jump or move when tumbled

        // Movement
        if (this.game.keys[38]) {  // JUMP
            if (this.position.y < this.bounds.bottom+0.25 && this.stamina >= this.jumpEnergy) {
                this.acceleration.y = this.speed.y;
                this.frame = 1;
                this.stamina -= this.jumpEnergy;
                this.game.samples.jump.play();
            }
        }
        if (this.game.keys[37])     // LEFT
            this.acceleration.x -= (this.acceleration.y == this.bounds.bottom ?
                this.speed.x : this.speed.x*0.5);
        if (this.game.keys[39])     // RIGHT
            this.acceleration.x += (this.acceleration.y == this.bounds.bottom ?
                this.speed.x : this.speed.x*0.5);

        // DEBUG ONLY: Forward
        if (true && this.game.debug) {
            if (this.game.keys[87])
                this.acceleration.z -= this.speed.z;
            if (this.game.keys[83])
                this.acceleration.z += this.speed.z;
        }
        // DEBUG ONLY: mushrrom
        if (true && this.game.debug) {
            if (this.game.keys[77] && this.high == 0.0)
                this.highMode();
        }
        // DEBUG ONLY: play sounds
        if (true && this.game.debug) {
            if (this.game.keys[32]) {
                this.game.samples[0].play();
            }
        }
    },

    animate: function(elapsedTime) {
        this.ticks++;

        if (this.running) {
            // Jump animation (small jumps)
            if (this.jumpRun && this.ticks % this.animRate == 0 && this.position.y == this.bounds.bottom) {
                this.acceleration.y = this.speed.y/2.0;
                this.frame++;
                this.game.samples.jump.play();
            }
            this.acceleration.z -= (this.speed.z)*(0.5+this.stamina*0.5); // running
        } else if (this.tumble) {
            this.acceleration.z -= 0.002;
        }
        // Update acceleration
        this.acceleration.x *= 0.7; // friction
        this.acceleration.y -= 0.00982; // gravity
        this.acceleration.z *= 0.92; // friction
        // Update position
        this.position.x += this.acceleration.x;
        this.position.y += this.acceleration.y;
        this.position.z += this.acceleration.z;
        // Eject other entities and world bounds
        this.eject();
        // Stamina
        this.stamina += 0.005;
        if (this.stamina > 1.0) this.stamina = 1.0;

        if (this.high > 0.0 && this.ticks % 30.0 == 0) {
            this.high *= 0.95;
            this.applyMushroomEffect();
            if (this.high < 0.1)
                this.normalMode();
        }
    },

    eject: function() { // use better name?
        // Vertical position bound
        if (this.position.y < this.bounds.bottom) {
            this.position.y = this.bounds.bottom;
        }
        if (this.position.y > this.bounds.top)
            this.position.y = this.bounds.top;
        // Horizontal position bound
        if (this.position.x < this.bounds.left)
            this.position.x = this.bounds.left;
        if (this.position.x > this.bounds.right)
            this.position.x = this.bounds.right;

        // Collide with rock
        for (var i in this.game.obstacles) {
            var obstacle = this.game.obstacles[i],
                zdiff = (obstacle.position.z - this.position.z),
                combinedRadius = this.radius + obstacle.radius;
            // Length is distance to obstacle
            var xdiff = (obstacle.position.x - this.position.x),
                length = Math.sqrt(xdiff*xdiff + zdiff*zdiff);
            // Collision
            if (length < combinedRadius) {// Eject player in direction of normal
                var normal = {x:xdiff/length, z:zdiff/length};
                obstacle.ejectOther(this, normal, combinedRadius - length);
            }
        }
    },

    fall: function() {
        if (this.tumble) return;
        // Update states
        this.running = false;
        this.tumble = true;
        // Update to get proper sprite
        this.size = {w:32.0, h:16.0};
        this.offset = {x:32.0, y:80.0};
        this.frame = 0;
        // Play fall sound
        this.game.samples.fall.play();
        // Getup in a second (literaly)
        var self = this;
        setTimeout(function() { self.getUp(); }, 1000);
    },

    getUp: function() {
        // Update states to running
        this.tumble = false;
        this.running = true;
        // Reset sprite to running animation
        this.size = {w:32.0, h:32.0};
        this.offset = {x:0.0, y:96.0};
    },

    slowDown: function(factor) {
        this.acceleration.z *= factor;
    },

    applyMushroomEffect: function() {
        gl.uniform1f(this.game.shaderProgram.mushroomUniform, this.high);
        this.speed.x = this.highSpeed.x*this.high + this.normalSpeed.x*(1.0-this.high);
        this.speed.y = this.highSpeed.y*this.high + this.normalSpeed.y*(1.0-this.high);
        this.speed.z = this.highSpeed.z*this.high + this.normalSpeed.z*(1.0-this.high);
    },

    highMode: function() {
        this.high = 1.0;
        this.applyMushroomEffect();
    },

    normalMode: function() {
        this.high = 0.0;
        this.applyMushroomEffect();
    },

    resetStamina: function() {
        this.stamina = 1.0;
    }

};




/**
 * Any obstacle
 */
var Obstacle = function(game, position, texture, size, offset) {
    this.game = game;
    this.position = position;
    this.texture = texture;
    this.offset = offset;
    this.size = size;
    this.radius = 0.5;
};
Obstacle.prototype = {

    draw: function(pMatrix, mvMatrix) {
        var adjustedAnchor = [-this.size.w/64.0, -0.5, 0]; // TODO: maybe alter
        mat4.translate(mvMatrix,
            [this.position.x, this.position.y, this.position.z]);
        mat4.translate(mvMatrix, adjustedAnchor); // adjust anchor
        Sprite4.setTexture(this.texture);
        Sprite4.renderSprite(this.size, this.offset, pMatrix, mvMatrix);
    },

    /**
     * Pushes "object" in direction of "normal" with distance of "distance"
     * (In the XZ plane; Y-dimension is ignored)
     */
    push: function(other, normal, distance) {
        other.position.x -= normal.x * distance;
        other.position.z -= normal.z * distance;
    },

    ejectOther: function(other, normal, distance) {
        this.push(other, normal, distance);
    }

};




/**
 * Rock: makes player fall
 */
var Rock = function(game, position, texture, size, offset) {
    Obstacle.call(this, game, position, texture, size, offset);
    this.radius = 0.20;
};
Rock.prototype = new Obstacle();
Rock.prototype.constructor = Rock;
Rock.prototype.ejectOther = function(other, normal, distance) {
    // // Fall over rock if not in the air
    if (other.position.y < other.bounds.bottom+2*this.radius)
        other.fall();
};




/**
 * Mushroom: makes the player feel dizy and see weird colors
 */
var Mushroom = function(game, position, texture, size, offset, index) {
    Obstacle.call(this, game, position, texture, size, offset);
    this.index = index;
    this.radius = 0.20;
};
Mushroom.prototype = new Obstacle();
Mushroom.prototype.constructor = Mushroom;
Mushroom.prototype.ejectOther = function(other, normal, distance) {
    // Make player "high"
    if (other.position.y < other.bounds.bottom+2*this.radius) {
        other.highMode();
        this.destroy();
        this.game.samples.mushroom.play();
    }
};
Mushroom.prototype.destroy = function() {
    var index = this.game.obstacles.indexOf(this);
    this.game.obstacles.splice(index, 1);
}




/**
 * A berry: cures high-ness
 */
var Berry = function(game, position, texture, size, offset, index) {
    Obstacle.call(this, game, position, texture, size, offset);
    this.index = index;
    this.radius = 0.20;
    this.ticks = this.position.z % 128;
};
Berry.prototype = new Obstacle();
Berry.prototype.constructor = Berry;
Berry.prototype.draw = function(pMatrix, mvMatrix) {
    this.ticks++;
    // Pulse over ground
    this.position.y = -1.5 + 0.3*(1.0+Math.sin(Math.PI*this.ticks/65.0));
    // Draw self
    Util.pushMatrix(mvMatrix);
    Obstacle.prototype.draw.call(this, pMatrix, mvMatrix);
    mvMatrix = Util.popMatrix();
    // Render shadow
    mat4.translate(mvMatrix,
        [this.position.x-this.size.w/64.0, -2.0, this.position.z-0.01]);
    var offset = {x:this.offset.x, y:this.offset.y+16.0};
    Sprite4.renderSprite(this.size, offset, pMatrix, mvMatrix);
};
Berry.prototype.ejectOther = function(other, normal, distance) {
    // Cure player
    if (other.position.y < 3.0) {
        other.resetStamina(); 
        other.normalMode();
        this.destroy();
        this.game.samples.berry.play();
    }
};
Berry.prototype.destroy = function() {
    var index = this.game.obstacles.indexOf(this);
    this.game.obstacles.splice(index, 1);
};




/**
 * Tree: slows down the player
 */
var Tree = function(game, position, texture, size, offset) {
    Obstacle.call(this, game, position, texture, size, offset);
    this.radius = 0.5;
    this.ticks = 0;
    this.direction = (Math.random() < 0.5 ? 1 : -1);
};
Tree.prototype = new Obstacle();
Tree.prototype.constructor = Tree;
Tree.prototype.ejectOther = function(other, normal, distance) {
    other.slowDown( Math.cos(normal.z)-0.25 );
    Obstacle.prototype.ejectOther(other, normal, distance);
}
Tree.prototype.draw = function(pMatrix, mvMatrix) {
    this.ticks++;

    var pos = this.position,
        dir = this.direction,
        rad = this.game.player.high/10.0;
    if (this.game.player.high > 0.1) {
        pos.x = this.position.x + dir*rad*Math.cos(this.ticks*(Math.PI/100.0));
        pos.z = this.position.z + dir*rad*Math.sin(this.ticks*(Math.PI/100.0));
    }

    var adjustedAnchor = [-0.5, -1.5, 0.25]; // TODO: maybe alter
    mat4.translate(mvMatrix, [pos.x, pos.y, pos.z]);
    mat4.translate(mvMatrix, adjustedAnchor); // adjust anchor
    mat4.scale(mvMatrix, [1.5, 1.5*2, 1.0]);
    mat4.scale(mvMatrix, [2.0, 2.0, 1.0]);
    mat4.translate(mvMatrix, [-0.25, -0.165, 0.0]);
    Sprite4.setTexture(this.texture);

    Sprite4.renderSprite2(this.size, this.offset, pMatrix, mvMatrix);
};