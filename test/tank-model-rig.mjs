import assert from 'node:assert/strict';
import * as THREE from 'three';
import {splitTankTracks,advanceTankTracks,splitTankDetail} from '../public/tank-model-rig.js';

function mesh(points,indices){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(p=>p.slice(0,3)),3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(points.flatMap(p=>p.slice(3)),2));
  geometry.setIndex(indices);
  return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());
}

const tracks=mesh([
  [-2,0,0,0,.1],[-2,0,1,0,.5],[-2,1,0,1,.1],
  [2,0,0,0,.1],[2,0,1,0,.5],[2,1,0,1,.1],
],[0,1,2,3,4,5]);
const belts=splitTankTracks(tracks);
assert.deepEqual(belts.map(b=>b.mesh.geometry.getIndex().count),[3,3]);
assert.deepEqual(belts.map(b=>b.mesh.name),['Right tank track','Left tank track']);
advanceTankTracks(belts,4,0,1);
assert(Math.abs(belts[0].uv.getY(0)-(.1-.25))<1e-6);
assert(Math.abs(belts[1].uv.getY(0)-(.1-.25))<1e-6);
advanceTankTracks(belts,0,1,1);
assert(belts[0].uv.getY(0)>-.15 && belts[1].uv.getY(0)<-.15,'the left belt advances faster in a right pivot');
const details=mesh([
  [0,100,0,0,0],[1,100,0,0,0],[0,110,1,0,0],
  [0,200,0,0,0],[1,200,0,0,0],[0,210,1,0,0],
],[0,1,2,3,4,5]);
const {fixed,moving}=splitTankDetail(details);
assert.equal(fixed.geometry.getIndex().count,3);
assert.equal(moving.geometry.getIndex().count,3);
assert(fixed.geometry.boundingBox.max.y<181.5 && moving.geometry.boundingBox.min.y>181.5);
console.log('PASS separate GLB belts scroll with speed and opposite pivot motion; upper details follow the turret.');
