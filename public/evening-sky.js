import * as THREE from 'three';

// Water, glass and atmosphere use the same longitude and elevation convention.
// Keep the evening pair off the initial daytime loading path.
export const eveningAtlas={value:null},eveningReady={value:0};
let requested=false;
export function requestEveningSky(){
  if(requested)return;
  requested=true;
  new THREE.TextureLoader().load('./coastal-evening.webp',image=>{
    image.colorSpace=THREE.SRGBColorSpace;image.wrapS=THREE.RepeatWrapping;
    eveningAtlas.value=image;eveningReady.value=1;
  },undefined,()=>{requested=false;});
}
export const eveningGLSL=`
uniform sampler2D eveningAtlas;
uniform float eveningReady;
vec3 eveningReflection(vec3 daylight,float longitude,float elevation,float darkness){
  if(darkness<.01)return daylight;
  if(eveningReady<.5)return daylight*mix(vec3(1.),vec3(.073,.101,.171),darkness);
  // The brightest part of the low western sky follows the game's key light.
  float u=longitude-.096;
  float v=clamp(elevation/1.5707963,.004,.996)*.5;
  float night=smoothstep(.55,1.,darkness);
  return texture2D(eveningAtlas,vec2(u,v+(night>.5?0.:.5))).rgb;
}`;
