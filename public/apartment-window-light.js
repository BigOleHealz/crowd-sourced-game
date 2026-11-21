import * as THREE from 'three';
import {skyDarkness} from './road-lighting.js';

// The room cross-section is evaluated inside each existing destructible pane.
// Balcony frames, guards, broken sheets and missing storeys still use their
// original meshes and index spans.
export function apartmentGlass(atlas,panorama){
  const rooms=new THREE.TextureLoader().load('./brickell-apartment-rooms.webp');
  rooms.colorSpace=THREE.SRGBColorSpace;rooms.anisotropy=4;
  const glass=new THREE.MeshStandardMaterial({map:atlas,vertexColors:true,roughness:.30,metalness:.06});
  glass.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{roomPhotos:{value:rooms},windowSky:{value:panorama},nightAmount:skyDarkness});
    shader.vertexShader='attribute vec4 apartmentPane; varying vec4 windowPane;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nwindowPane=apartmentPane;');
    shader.fragmentShader='uniform sampler2D roomPhotos,windowSky; uniform float nightAmount; varying vec4 windowPane;\n'+
      shader.fragmentShader.replace('#include <opaque_fragment>',`
        vec3 eyeWorld=inverseTransformDirection(normalize(vViewPosition),viewMatrix);
        vec3 paneNormal=inverseTransformDirection(normal,viewMatrix);
        vec3 across=vec3(paneNormal.z,0.,-paneNormal.x);
        float facing=clamp(dot(eyeWorld,paneNormal),.035,1.);
        vec2 shift=-vec2(dot(eyeWorld,across)/windowPane.w,eyeWorld.y)/facing;
        vec2 travel=mix(windowPane.xy,1.-windowPane.xy,step(vec2(0.),shift));
        vec2 stop=travel/max(abs(shift),vec2(.0001));
        float depth=min(.75,min(stop.x,stop.y));
        vec2 wall=clamp(windowPane.xy+shift*depth,0.,1.);
        float seed=windowPane.z;
        float tile=mod(seed,4.);
        if(mod(seed,5.)>=3.)wall.x=1.-wall.x;
        vec2 origin=vec2(mod(tile,2.),1.-floor(tile/2.));
        vec3 room=texture2D(roomPhotos,(origin+mix(vec2(.009),vec2(.991),wall))*.5).rgb;
        // A return wall carries an indirect tint from the rear wall and darkens
        // toward the jamb, leaving the reveal visible as the observer passes.
        float back=smoothstep(.70,.75,depth);
        vec3 plaster=vec3(.28,.24,.20)*(.53+.47*depth/.75);
        room=mix(mix(plaster,room,.19),room,back);
        float occupied=step(2.,mod(seed,7.));
        vec3 roomLight=mix(vec3(.57,.60,.60),mix(vec3(.027,.036,.061),vec3(1.02,.78,.51),occupied),nightAmount);
        float shadeTop=mod(seed,6.)<2.?(.15+.05*mod(seed,4.)):0.;
        if(shadeTop>0. && windowPane.y>1.-shadeTop){
          float slats=.88+.12*cos(windowPane.y*112.);
          room=mix(room,vec3(.38,.36,.31)*slats,.86);
        }
        vec3 reflection=reflect(-eyeWorld,paneNormal);
        vec2 skyUV=vec2(atan(reflection.x,-reflection.z)/6.2831853+.5,clamp(.30+.55*asin(clamp(reflection.y,-1.,1.)),.22,.985));
        vec3 sky=texture2D(windowSky,skyUV,1.7).rgb*mix(vec3(1.),vec3(.07,.096,.16),nightAmount);
        float fresnel=.15+.63*pow(1.-facing,2.);
        vec3 behind=mix(room*roomLight,outgoingLight,.18*(1.-nightAmount));
        outgoingLight=mix(behind,sky,fresnel);
        #include <opaque_fragment>
      `);
  };
  glass.customProgramCacheKey=()=>'apartment-interiors';
  glass.addEventListener('dispose',()=>rooms.dispose());
  return glass;
}
