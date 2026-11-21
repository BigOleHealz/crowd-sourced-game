import assert from 'node:assert/strict';
import {Scene} from 'three';
process.env.PINEWATCH_MAP='brickell';
const {surfaceMarks}=await import('../public/surface-marks.js'),{sandHeight}=await import('../public/beach-layout.js');
const scene=new Scene(),marks=surfaceMarks(scene),mesh=scene.getObjectByName('Fading surface marks');
const p={id:1,x:64,y:-.86,z:-208,swimming:true},world={doors:{},rover:{x:0,y:0,z:0,speed:0}};
function step(){marks.update(world,p,[],.1);}
step();p.swimming=false;p.grounded=true;
for(let x=63.8;x>57;x-=.12){p.x=x;p.y=sandHeight(x,p.z);step();}
assert(mesh.count>3 && mesh.visible,'shoreline produces alternating boot impressions');
const array=mesh.instanceMatrix.array;
assert(Math.abs(array[14]-array[30])>.1,'successive soles are laterally offset');
const n=mesh.count;
world.rover.driver=1;p.x-=1;step();assert.equal(mesh.count,n,'no footprints from driver');
delete world.rover.driver;
for(let i=0;i<150;i++){p.x-=.05;p.y=sandHeight(p.x,p.z);step();}
assert(!mesh.visible && mesh.count===n,'marks dry, and a dry hiker makes no new prints');
marks.reset();assert.equal(mesh.count,0);
console.log('PASS swimming wets boots, alternating ground-supported prints follow onto shore, fade and stop aboard or once dry.');
