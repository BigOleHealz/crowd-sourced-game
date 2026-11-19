import assert from 'node:assert/strict';
import * as THREE from 'three';

process.env.PINEWATCH_MAP='brickell';
const {glassBreakDebris}=await import('../public/glass-break-debris.js');

const scene=new THREE.Scene();
const debris=glassBreakDebris(scene,2);
const edges=scene.getObjectByName('Broken glass edges and fragments');
const flying=scene.getObjectByName('Flying glass fragments');
const storefront={x:-9.64,z:11,width:2.50,bottom:.89,top:3.13,widthAxis:'z'};
const gallery={x:-15,z:-23,width:.80,bottom:.90,top:3.10,widthAxis:'x'};

debris.setBroken(storefront,true,true);
debris.update(.016);
assert.equal(edges.count,16);
assert.equal(flying.count,34);
debris.setBroken(storefront,true,true);
debris.update(1.2);
assert.equal(flying.count,0);
assert.equal(edges.count,16);

const before=edges.instanceMatrix.array.slice(0,16*16);
debris.setBroken(gallery,true,true);
debris.update(.016);
assert.equal(flying.count,34);
debris.setBroken(gallery,false);
debris.setBroken(storefront,false);
debris.update(.016);
assert.equal(edges.count,0);
assert.equal(flying.count,0);
debris.setBroken(storefront,true); // Welcome state for a player joining after the crash.
debris.setBroken(gallery,true);
debris.update(.016);
assert.equal(edges.count,32);
assert.deepEqual(edges.instanceMatrix.array.slice(0,16*16),before);
assert.equal(flying.count,0);

const matrix=new THREE.Matrix4(), point=new THREE.Vector3();
edges.getMatrixAt(0,matrix);
point.setFromMatrixPosition(matrix);
assert(Math.abs(point.x-storefront.x)<.025 && point.y>3.05);
edges.getMatrixAt(16,matrix);
point.setFromMatrixPosition(matrix);
assert(Math.abs(point.z-gallery.z)<.025 && point.y>3.05);

debris.setBroken(storefront,false);
debris.setBroken(gallery,false);
debris.update(.016);
assert.equal(edges.count,0);
console.log('PASS temporary fragments, deterministic late-join glass remnants on both axes, and room reset.');
