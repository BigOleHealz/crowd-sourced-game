import assert from 'node:assert/strict';
import * as THREE from 'three';
import {roverPanelDamage} from '../public/rover-panel-damage.js';

const body=new THREE.BoxGeometry(1.44,.44,3.3,4,3,12).translate(0,.78,0);
const paint=new THREE.MeshPhongMaterial(),mesh=new THREE.Mesh(body,paint);
const fold=roverPanelDamage([mesh],paint),pos=body.attributes.position;
const shader={vertexShader:'',fragmentShader:'',uniforms:{}};
paint.onBeforeCompile(shader);
assert.deepEqual(shader.uniforms.panelDamage.value.toArray(),[0,0,0,0],'fresh paint starts clear on every side');
const original=pos.array.slice(),normals=body.attributes.normal.array.slice();
const maxDent=(region,damage)=>{
  fold({[region]:damage});
  const axis=region==='front'||region==='rear'?2:0, sign=region==='front'||region==='left'?-1:1;
  let maximum=0;
  for(let i=0;i<original.length;i+=3){
    const coord=original[i+axis],distance=(coord-pos.array[i+axis])*sign;
    if(coord*sign<=0)assert.equal(distance,0*Math.sign(distance),'opposite panel remains pristine');
    maximum=Math.max(maximum,distance);
  }
  return maximum;
};
for(const region of ['front','rear','left','right']){
  const light=maxDent(region,.08),medium=maxDent(region,.35),heavy=maxDent(region,.92);
  assert.ok(light>.023 && medium>light && heavy>medium,region+' dents progressively');
  const version=pos.version;
  fold({[region]:.92});
  assert.equal(pos.version,version,'unchanged snapshot incurs no buffer upload');
}
fold(undefined);
assert.deepEqual(pos.array,original,'a replacement vehicle gets its original panel positions');
assert.deepEqual(body.attributes.normal.array,normals,'factory surface normals restored');
console.log('PASS light, moderate and heavy directional deformation for all four faces and full reset.');
