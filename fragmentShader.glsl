precision mediump float;

varying vec2 vTextureCoord;
varying float vDist;

uniform sampler2D uSampler;
uniform float uMushroom;
uniform vec4 uColor;

void main(void) {
    // Texture
    vec4 textureColor = texture2D(uSampler, vTextureCoord);
    if (textureColor.a > 0.0) {
        vec4 baseColor = textureColor * uColor;
        // Apply mushroom effect
        float mushrooms = (1.0 - uMushroom*((1.0+5.0/vDist)));
        // Fog
        float fog = 1.0 / (vDist*1.0+2.0);
        vec3 fogEffect = vec3(0.2, 0.2, 0.2) * (1.0 - fog);
        // Apply fog and mushrooms
        gl_FragColor = vec4( baseColor.xyz*fog*mushrooms + fogEffect, 1.0);
    } else {
        discard; // makes it transparent?
    }

    // gl_FragColor = texture2D(uSampler, vTextureCoord);
}