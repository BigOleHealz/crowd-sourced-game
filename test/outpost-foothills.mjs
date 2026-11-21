import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sceneryHeight} from '../public/world.js';
import {terrainWidth,terrainLength,terrainCols,terrainRows,ridgeX,ridgeZ,ridgeFloor} from '../public/outpost-relief.js';
const geo=new THREE.PlaneGeometry(terrainWidth,terrainLength,terrainCols,terrainRows)
  .rotateX(-Math.PI/2).translate(0,0,(terrainWidth-terrainLength)/2);
const pos=geo.attributes.position;
for(let i=0;i<pos.count;i++){
  const x=ridgeX(pos.getX(i)),z=ridgeZ(pos.getZ(i));
  pos.setXYZ(i,x,sceneryHeight(x,z),z);
}
const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial()),ray=new THREE.Raycaster();
for(const [x,z] of [[50.3,5.1],[-87,-36],[-38,-107],[114,82],[36.7,33.96],[6,-3],[89.2,-67.7]]){
  ray.set(new THREE.Vector3(x,200,z),new THREE.Vector3(0,-1,0));
  const ground=ray.intersectObject(mesh)[0]?.point.y;
  assert(Math.abs(ground-ridgeFloor(x,z))<.0001,'Trees meet the exact drawn slope at '+[x,z]);
}
console.log('PASS tree roots follow rendered triangles on the outer ridges and inner valley');
