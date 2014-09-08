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
        // Mushroom and fog
        float mushroom = (1.0 - uMushroom*((1.0+5.0/vDist)));
        float fog = (1.0 / (vDist*vDist*0.1+5.0));
        // Mushroom- and fog effects
        vec3 fogEffect = vec3(0.01, 0.01, 0.01) * (1.0 - fog);
        vec3 mushroomEffect = (vec3(0.15, 0.15, 0.15) - fogEffect)*uMushroom;
        // Apply fog and mushrooms
        gl_FragColor = vec4( baseColor.xyz*fog*mushroom + fogEffect + mushroomEffect - uFade, 1.0);
    } else {
        discard; // makes it transparent?
    }
}