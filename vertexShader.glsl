attribute vec3 aVertexPosition;

uniform mat4 uPmatrix;  // perspective/view: 
uniform mat4 uMVmatrix; // camera: move/rotate this and draw object
uniform mat4 uTexture;  // texture: e.g. position and size on object

varying vec2 vTextureCoord;
varying float vDist;

void main(void) {
    vTextureCoord = (uTexture * vec4(aVertexPosition, 1.0)).xy;
    vec4 position = uPmatrix * uMVmatrix * vec4(aVertexPosition, 1.0);
    vDist = position.z/3.0;///3.0; // For fog
    gl_Position = position;
}