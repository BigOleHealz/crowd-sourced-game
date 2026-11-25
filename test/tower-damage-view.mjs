import assert from 'node:assert/strict';
import * as THREE from 'three';
process.env.PINEWATCH_MAP='brickell';
const {MAP}=await import('../public/world.js');
const {towerCell,towerBase,bandHeight}=await import('../public/tower-damage.js');
const {towerDamageView}=await import('../public/tower-damage-view.js');

const towers=MAP.buildings.filter(b=>b.towerId!=null);
const target=towers.find(b=>b.towerId===3);
const neighbor=towers.find(b=>b.towerId===4);
assert(target && neighbor);
assert.notEqual(towers[3],target,'replacement towers leave a gap in the ID sequence');

const scene=new THREE.Scene();
const material=new THREE.MeshLambertMaterial();
const mesh=new THREE.Mesh(new THREE.BoxGeometry(),material);
scene.add(mesh);
const update=towerDamageView(scene,MAP.buildings,[mesh],{shadowMap:{needsUpdate:false}});
const point={x:target.x-target.w*.375,y:2,z:target.z-target.d*.375};
const cell=towerCell(target,point.x,point.y,point.z);
update({towerBreaches:[cell]},0);

const shader={uniforms:{},vertexShader:'#include <project_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};
material.onBeforeCompile(shader,{});
const {data,width,depth}=shader.uniforms.towerMask.value.image;
const west=Math.floor(Math.min(...towers.map(b=>b.x-b.w/2-2)));
const north=Math.floor(Math.min(...towers.map(b=>b.z-b.d/2-2)));
const masked=(x,y,z)=>data[(Math.floor((y-towerBase)/bandHeight)*depth+Math.floor(z-north))*width+Math.floor(x-west)];
assert.equal(masked(point.x,point.y,point.z),255,'the struck tower bay is hidden');
assert.equal(masked(neighbor.x,point.y,neighbor.z),0,'another tower stays intact');

update({collapsedTowers:[target.towerId]},0);
assert.equal(masked(target.x,point.y,target.z),255,'collapse masks the struck tower');
assert.equal(masked(neighbor.x,point.y,neighbor.z),0,'collapse leaves the other tower intact');
assert(scene.getObjectByName('Tower rubble '+target.towerId),'rubble appears on the struck tower');
assert(!scene.getObjectByName('Tower rubble '+neighbor.towerId),'no rubble appears on the other tower');
console.log('PASS tower damage and rubble use stable tower IDs after replacement');
