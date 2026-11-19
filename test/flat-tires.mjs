import assert from 'node:assert/strict';
import {newExpedition,advanceRounds} from '../public/expedition.js';
import {roverRoundContact} from '../public/rounds.js';
import {driveRover,damageRover,recoverRover} from '../public/rover.js';
import {isFlat,wheelStations,flatWheelDrop} from '../public/road-wheel-layout.js';
import {stepSuspension} from '../public/road-suspension.js';

const w=newExpedition(),r=w.rover,crew=new Map();
r.x=0;r.y=120;r.z=0;
for(let i=0;i<4;i++){
  const [x,z]=wheelStations[i],side=Math.sign(x),yaw=i*.75,c=Math.cos(yaw),s=Math.sin(yaw);
  r.yaw=yaw;
  const bx=x+1.9*side,bz=z;
  const from={x:bx*c-bz*s,y:r.y+.368,z:bx*s+bz*c};
  const d={x:-c*side*4,y:0,z:-s*side*4};
  const hit=roverRoundContact(r,from,d);
  assert.equal(hit?.wheel,i,'nearest exposed wheel on rotated vehicle');
  w.bullets=[{...from,id:i,weapon:1,source:null,shooter:99,vx:d.x*30,vy:0,vz:d.z*30,left:80,age:0}];
  const before=r.flatTires;
  advanceRounds(w,crew,[],i+1);
  assert.equal(r.flatTires,before|(1<<i));
  assert.equal(w.bullets.length,0);
  assert.equal(r.hp,250);
}
r.yaw=0;
assert.equal(roverRoundContact(r,{x:3,y:120.86,z:-.94},{x:-5,y:0,z:0}).wheel,null,'door or fender above tire intercepts');
const world=newExpedition(),fresh=world.rover;
fresh.driver=1;
function launch(mask){fresh.flatTires=mask;fresh.speed=0;fresh.lateralSpeed=0;fresh.x=-3;fresh.z=17;fresh.yaw=0;for(let n=0;n<9;n++)driveRover(world,{throttle:1},1/30);return fresh.speed;}
assert.ok(launch(0)>launch(2) && launch(2)>launch(15) && launch(15)>0,'progressive arcade mobility penalty');
fresh.flatTires=2;
for(let i=0;i<90;i++)stepSuspension(fresh,1/30,()=>fresh.y);
assert.ok(Math.abs(fresh.suspension.wheels[1]+flatWheelDrop)<.002);
assert.equal(fresh.suspension.wheels[0],0);
damageRover(world,250,crew);recoverRover(world,7);
assert.equal(world.rover.flatTires,0);
assert.ok(wheelStations.every((_,i)=>!isFlat(world.rover,i)));
console.log('PASS all four independent wheels and yaw angles, competing body contact, stance, gradual mobility loss, surviving chassis HP and fresh replacement.');
