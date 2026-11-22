import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setImmediate} from 'node:timers/promises';
import {Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {civilianLooks,civilianScanLooks} from '../public/civilian-style.js';
import {createCivilianScans} from '../public/civilian-scans.js';
import {fitCharacterScan} from '../public/player-scan.js';
import {createRangerRig,poseRig} from '../public/ranger-pose.js';

// Three can parse the real GLB buffers and material bindings in Node. Supply
// a stand-in for the browser bitmap decoder; the test exercises geometry and posing.
globalThis.self=globalThis;
globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
const parser=new GLTFLoader();
const requests=new Map();
const waiting=[];
const ready=createCivilianScans({
  loadAsync(url){
    requests.set(url,(requests.get(url)??0)+1);
    const pending=readFile(new URL('../public/'+url,import.meta.url)).then(buffer=>
      parser.parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),''));
    waiting.push(pending);
    return pending;
  },
});

const residents=Object.keys(civilianScanLooks);
assert.equal(residents.length,20);
assert.deepEqual(new Set(residents.map(id=>civilianScanLooks[id].model)),new Set([1,2,3,4,5]));
for(const id of [1,'officer-1','rival-marisol','rival-della','rival-mateus','lucero-luz','shipwreck-1']){
  assert.equal(ready({id}),undefined);
}
assert.equal(ready({id:'rival-fern',officer:true}),undefined);
assert.equal(ready({id:'rival-fern',lostParts:{leftLeg:{tick:1}}}),undefined);
assert.equal(requests.size,0);

for(const id of [...residents,...residents])assert.equal(ready({id}),undefined);
assert.equal(requests.size,5);
assert([...requests.values()].every(count=>count===1));
await Promise.all(waiting);
await setImmediate();

assert.equal(ready({id:'rival-fern',lostParts:{rightArm:{tick:1}}}),undefined);
assert.equal(ready({id:'rival-fern',lostParts:{}}),ready({id:'rival-fern'}));
const perModel=new Map();
for(const id of residents){
  assert(civilianLooks[id]);
  const model=civilianScanLooks[id].model;
  const parts=ready({id});
  assert(parts?.length);
  if(perModel.has(model)){
    assert.equal(parts,perModel.get(model));
    continue;
  }
  perModel.set(model,parts);
  const first=createRangerRig(),second=createRangerRig();
  for(const rig of [first,second])fitCharacterScan(rig,parts,'Civilian scan');
  const skins=first.root.children.filter(node=>node.isSkinnedMesh);
  const twins=second.root.children.filter(node=>node.isSkinnedMesh);
  assert.equal(skins.length,parts.length);
  const skeletons=new Map();
  for(const [i,skin] of skins.entries()){
    const twin=twins[i];
    const template=parts[i];
    assert.equal(skin.geometry,twin.geometry);
    assert.equal(skin.material,twin.material);
    assert(skin.geometry.userData.sharedFieldKit);
    assert.notEqual(skin.skeleton,twin.skeleton);
    assert(skin.skeleton.bones.every(Boolean));
    if(skeletons.has(template.skeleton))assert.equal(skin.skeleton,skeletons.get(template.skeleton));
    skeletons.set(template.skeleton,skin.skeleton);
  }
  const state={id,x:4,y:0,z:2,yaw:0,grounded:true,moving:true};
  first.civilian=civilianScanLooks[id];first.tools=[];
  poseRig(first,state,1/60);
  first.root.updateMatrixWorld(true);
  const sample=new Vector3();
  for(const skin of skins){
    const positions=skin.geometry.getAttribute('position');
    for(let i=0;i<positions.count;i+=Math.max(1,Math.floor(positions.count/32))){
      skin.getVertexPosition(i,sample);
      assert(sample.toArray().every(Number.isFinite));
      assert(sample.distanceTo(skin.boundingSphere.center)<=skin.boundingSphere.radius,'posed vertex fits the local culling sphere');
    }
  }
}
console.log('PASS five shared pedestrian models, persistent identities, independent poses and special-role fallbacks.');
