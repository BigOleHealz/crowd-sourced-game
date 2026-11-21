import assert from 'node:assert/strict';
import {Scene} from 'three';
process.env.PINEWATCH_MAP='brickell';
const {surfaceMarks}=await import('../public/surface-marks.js');
const {sandHeight}=await import('../public/beach-layout.js');
const scene=new Scene(),marks=surfaceMarks(scene),mesh=scene.getObjectByName('Fading surface marks');
const car={x:47,z:-203,yaw:0,speed:4},local={x:47,z:-203},world={rover:car,traffic:[]};
function step(){car.y=sandHeight(car.x,car.z);marks.update(world,local,[],.1);}
for(let i=0;i<100;i++){car.z-=.12;step();}
assert(mesh.visible && mesh.count>30 && mesh.count<448);
const n=mesh.count;car.speed=0;for(let i=0;i<150;i++)step();
assert.equal(mesh.count,n);assert(!mesh.visible,'marks fade while stationary');
car.x=0;car.speed=20;for(let i=0;i<20;i++){car.z-=.4;step();}
assert.equal(mesh.count,n,'no tire stamps on asphalt');
marks.reset();assert(!mesh.visible && mesh.count===0);
console.log('PASS bounded paired tire marks on Harbor Key sand, distance sampling, fade and clean asphalt.');
