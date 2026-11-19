import * as THREE from 'three';

export function frontageGlassMaterial(panorama,normalAxis='x',instanced=false) {
  return new THREE.ShaderMaterial({
    name:'Storefront glass', side:THREE.DoubleSide,transparent:true,depthWrite:false,
    forceSinglePass:true,
    uniforms:{panorama:{value:panorama},paneNormal:{value:normalAxis==='x'?new THREE.Vector3(1,0,0):new THREE.Vector3(0,0,1)}},
    vertexShader:`varying vec3 wp;
      void main(){
        vec4 p=modelMatrix*${instanced?'instanceMatrix*':''}vec4(position,1.);
        wp=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;
      }`,
    fragmentShader:`uniform sampler2D panorama;uniform vec3 paneNormal;varying vec3 wp;
      void main(){
        vec3 v=normalize(wp-cameraPosition),r=reflect(v,paneNormal);
        vec3 sky=texture2D(panorama,vec2(atan(r.x,-r.z)*.46+.17,clamp((asin(clamp(r.y,-1.,1.))+.16)/.69,0.,1.))).rgb;
        float grazing=1.-abs(dot(v,paneNormal));
        gl_FragColor=vec4(mix(vec3(.24,.43,.44),sky*vec3(.73,.90,.87),.72),.145+.26*grazing*grazing);
        #include <colorspace_fragment>
      }`,
  });
}
