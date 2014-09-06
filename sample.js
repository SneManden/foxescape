/**
 * A texture from an image file: to be used for a sprite (e.g)
 * @param {Object} image With "source", "width" and "height" attributes
 *                       "source" refers to filepath of imagefile on server
 */
var Sample = function(name, sample, volume, loop, interrupt) {
    this.name = (name === undefined ? "sample" + Math.random()*1000 : name);
    this.sample = sample;
    this.loaded = true;
    this.volume = (volume != undefined ? volume : 1.0);
    this.loop = (loop != undefined ? loop : 0);
    this.interrupt = Sample.prototype.setInterrupt(interrupt);
};
Sample.prototype = {

    hasLoaded: function() {
        this.loaded = true;
        console.log(" => " + this.name + " has loaded");
    },

    getManifest: function() {
        return {id: this.name, src: this.sample};
    },

    play: function(attributes) {
        if (!this.loaded) return;
        createjs.Sound.play(this.name, {
            interrupt: this.interrupt,
            volume: this.volume,
            loop: this.loop,
        });
    },

    loop: function() {
        console.log("Not implemented");
    },

    setVolume: function(volume) {
        this.volume = volume;
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