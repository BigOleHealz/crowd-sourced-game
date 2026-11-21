import assert from 'node:assert/strict';
import {roadGarages,garageAt,serviceRoadCar} from '../public/road-garages.js';
import {roadContact} from '../public/road-contact.js';
import {driveRover} from '../public/rover.js';
import {newExpedition} from '../public/expedition.js';
import {groundHeight} from '../public/world.js';
for(const g of roadGarages){
  const w=newExpedition(),r=w.rover;
  Object.assign(r,{x:g.x,z:g.z,y:groundHeight(g.x,g.z),driver:1,hp:85,flatTires:9,fittingDamage:[0,90,0,0],brokenGlass:{left:true},bodyDamage:{front:1}});
  assert.equal(roadContact(w,r.x,r.z,0,r.x,r.z,r),undefined,g.name+' is clear');
  assert.equal(garageAt(r),g);
  const run=n=>{for(let i=0;i<n;i++)serviceRoadCar(r,1/30);};
  run(40);assert(r.repairPercent>40 && r.hp===85);
  r.speed=.5;run(1);assert.equal(r.repairPercent,undefined);
  r.speed=0;run(88);assert.equal(r.hp,85);r.hp-=25;run(2);assert(r.repairPercent<4);
  run(90);assert.equal(r.hp,r.maxHp);assert.equal(r.flatTires,0);assert.equal(r.brokenGlass,undefined);
  assert.equal(r.fittingDamage,undefined);assert(!Object.values(r.bodyDamage).some(Boolean));assert.equal(r.repairPercent,undefined);
  driveRover(w,{throttle:1},1/30);assert(r.speed>.25);
  r.driver=null;r.hp=50;run(100);assert.equal(r.hp,50);
}
console.log('PASS accessible marked repair bays, stopped-driver and interruption rules, repair and restored handling.');
