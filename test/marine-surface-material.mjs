import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {marineSurfaceMaterial} from '../public/manatee-model.js';

test('licensed animal materials retain their texture and shader while rendering through surface water',()=>{
  const map=new THREE.Texture(),waterline=-1.2,clock={value:3};
  const skin=new THREE.MeshStandardMaterial({map});
  skin.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',
      '#include <map_fragment>\ndiffuseColor.rgb*=vec3(.8);');
  };
  marineSurfaceMaterial(skin,waterline,clock);
  const shader={uniforms:{},vertexShader:'#include <project_vertex>',
    fragmentShader:'#include <map_fragment>\n#include <opaque_fragment>'};
  skin.onBeforeCompile(shader);
  assert.equal(skin.map,map);
  assert.equal(skin.transparent,true);
  assert.equal(skin.depthWrite,true);
  assert.equal(shader.uniforms.manateeWaterline.value,waterline);
  assert.equal(shader.uniforms.manateeTime,clock);
  assert.match(shader.vertexShader,/gl_Position=projectionMatrix\*viewMatrix\*vec4\(projected,1\.\)/);
  assert.match(shader.fragmentShader,/diffuseColor\.rgb\*=vec3\(\.8\)/);
  assert.match(shader.fragmentShader,/diffuseColor\.a\*=distanceFade/);
});
