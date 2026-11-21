import * as THREE from 'three';
import {skyDarkness} from './road-lighting.js';

// Nine diffuse reflection probes baked from the actual, unoccupied Brickell streets.
// All shops share one atlas. Rendering a pane costs no extra scene or draw pass.
let streetAtlas;
export function frontageGlassMaterial(panorama,instanced=false) {
  if(!streetAtlas){
    streetAtlas=new THREE.TextureLoader().load('./avenue-reflection-probes.webp');
    streetAtlas.colorSpace=THREE.SRGBColorSpace;
  }
  return new THREE.ShaderMaterial({
    name:'Storefront glass',side:THREE.DoubleSide,transparent:true,depthWrite:false,forceSinglePass:true,
    uniforms:{streets:{value:streetAtlas},panorama:{value:panorama},skyDarkness},
    vertexShader:`varying vec3 wp,wn;
      void main(){
        mat4 m=modelMatrix${instanced?'*instanceMatrix':''};
        vec4 p=m*vec4(position,1.);
        wn=mat3(m)*normal;
        wp=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;
      }`,
    fragmentShader:`uniform sampler2D streets,panorama;uniform float skyDarkness;
      varying vec3 wp,wn;
      vec3 street(vec2 tile,vec3 hit){
        vec3 origin=vec3(tile.x<.5?-38.:tile.x<1.5?0.:32.,2.35,tile.y<.5?-47.:tile.y<1.5?7.:54.);
        vec3 d=normalize(hit-origin);
        vec2 uv=vec2(.5+atan(d.x,-d.z)*.15915494,.5+asin(clamp(d.y,-1.,1.))*.31830989);
        return texture2D(streets,(vec2(tile.x,2.-tile.y)+clamp(uv,vec2(.003,.005),vec2(.997,.995)))/3.).rgb;
      }
      void main(){
        vec3 v=normalize(wp-cameraPosition),n=normalize(wn),r=reflect(v,n);
        // The pavement lies below the viewer while opposite façades are farther away.
        float reach=r.y<-.04?min(28.,max(.3,(.76-wp.y)/r.y)):28.;
        vec3 hit=wp+r*reach;
        vec2 cell=vec2(smoothstep(-22.,-16.,wp.x)+smoothstep(13.,19.,wp.x),
                       smoothstep(-23.,-17.,wp.z)+smoothstep(27.,34.,wp.z));
        vec2 base=floor(cell),f=fract(cell),next=min(base+1.,vec2(2.));
        vec3 a=street(base,hit);
        if(f.x>0.)a=mix(a,street(vec2(next.x,base.y),hit),f.x);
        if(f.y>0.){
          vec3 b=street(vec2(base.x,next.y),hit);
          if(f.x>0.)b=mix(b,street(next,hit),f.x);
          a=mix(a,b,f.y);
        }
        vec3 sky=texture2D(panorama,vec2(atan(r.x,-r.z)*.46+.17,clamp((asin(clamp(r.y,-1.,1.))+.16)/.69,0.,1.))).rgb;
        vec3 reflection=mix(a,sky,smoothstep(.42,.88,r.y));
        reflection*=mix(vec3(1.),vec3(.15,.20,.30),skyDarkness);
        float edge=1.-abs(dot(v,n));
        gl_FragColor=vec4(reflection*vec3(.91,.98,.96),.105+.49*edge*edge);
        #include <colorspace_fragment>
      }`,
  });
}
