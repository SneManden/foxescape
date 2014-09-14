precision mediump float;

varying vec2 vTextureCoord;
varying float vDist;

uniform sampler2D uSampler;
uniform float uMushroom;
uniform vec4 uColor;
uniform vec3 uFade;

void main(void) {
    // Texture
    vec4 textureColor = texture2D(uSampler, vTextureCoord);
    if (textureColor.a > 0.0) {
        vec4 baseColor = textureColor * uColor;
        // Mushroom and dark
        float mushroom = (1.0 - uMushroom*((1.0+5.0/vDist)));
        float dark = (1.0 / (vDist*vDist*0.1+5.0));
        // Mushroom- and dark effects
        vec3 darkEffect = vec3(0.01, 0.01, 0.01) * (1.0 - dark);
        vec3 mushroomEffect = (vec3(0.15, 0.15, 0.15) - darkEffect)*uMushroom;
        // Apply dark and mushrooms
        gl_FragColor = vec4( baseColor.xyz*dark*mushroom + darkEffect + mushroomEffect - uFade, 1.0);
    } else {
        discard; // makes it transparent?
    }
}