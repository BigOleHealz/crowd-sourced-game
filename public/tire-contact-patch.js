import * as THREE from 'three';

// Flatten only the tread at ground contact. The direction rotates back into
// wheel-local space so the flat stays against the road as the wheel spins.
export function tireContactPatch(material,radius){
  const state={value:new THREE.Vector3(0,1,0)};
  material.onBeforeCompile=shader=>{
    shader.uniforms.rubberState=state;
    shader.uniforms.tireRadius={value:radius};
    shader.vertexShader='uniform vec3 rubberState;\nuniform float tireRadius;\n'+shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      float height=position.y*rubberState.y-position.z*rubberState.z;
      float fold=step(.01,rubberState.x)*max(0.,-tireRadius+rubberState.x-height);
      transformed.yz+=vec2(rubberState.y,-rubberState.z)*fold;
      transformed.x+=sign(position.x)*fold*.32;`);
  };
  return state;
}
