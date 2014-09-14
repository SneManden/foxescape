/**
 * A texture from an image file: to be used for a sprite (e.g)
 * @param {Object} image With "source", "width" and "height" attributes
 *                       "source" refers to filepath of imagefile on server
 */
var Sample = function(name, sample, volume, loop, interrupt) {
    this.name = (name === undefined ? "sample" + Math.random()*1000 : name);
    this.sample = sample;
    this.sound = false;
    this.loaded = true;
    this.volume = (volume != undefined ? volume : 1.0);
    this.loop = (loop != undefined ? loop : 0);
    this.interrupt = Sample.prototype.setInterrupt(interrupt);
};
Sample.prototype = {

    hasLoaded: function() {
        this.loaded = true;
        Util.log(" => " + this.name + " has loaded");
    },

    getManifest: function() {
        return {id: this.name, src: this.sample};
    },

    play: function() {
        if (!this.loaded) return;
        if (!this.sound) 
            this.sound = createjs.Sound.play(this.name, {
                interrupt: this.interrupt,
                volume: this.volume,
                loop: this.loop,
            });
        else
            this.sound.play({
                interrupt: this.interrupt,
                volume: this.volume,
                loop: this.loop,
            });
    },

    pause: function() {
        this.sound.pause();
    },

    setVolume: function(volume) {
        if (!this.sound) return;
        this.volume = Math.min(1.0, Math.max(volume, 0.0));
        this.sound.setVolume(this.volume);
    },

    increaseVolume: function(amount) {
        if (this.volume <= 1.0-amount)
            this.setVolume(this.volume + amount);
    },

    decreaseVolume: function(amount) {
        if (this.volume >= 0.0+amount)
            this.setVolume(this.volume - amount);
    },

    setLoop: function(loop) {
        this.loop = loop;
    },

    setInterrupt: function(mode) {
        switch (mode) {
            case "none": this.interrupt = createjs.Sound.INTERRUPT_NONE; break;
            case "late": this.interrupt = createjs.Sound.INTERRUPT_LATE; break;
            case "any":  this.interrupt = createjs.Sound.INTERRUPT_ANY;  break;
            default: this.interrupt = createjs.Sound.INTERRUPT_NONE; break;
        }
    }
    
};