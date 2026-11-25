import assert from 'node:assert/strict';
import {stepSuspension, interpolateSuspension} from '../public/road-suspension.js';
import {mountPosition} from '../public/mounts.js';
import {roadCabin} from '../public/road-cabin.js';

const dt=1/30, flat=()=>0;
const truck={x:0,z:0,y:0,yaw:0,speed:0};
const settle=(surface=flat)=>{for(let i=0;i<120;i++)stepSuspension(truck,dt,surface);};
settle();
assert.deepEqual(truck.suspension,{heave:0,pitch:0,roll:0,wheels:[0,0,0,0]});
const curb=(x,z)=>x<0 && z<0 ? .14 : 0;
stepSuspension(truck,dt,curb);
assert.deepEqual(truck.suspension.wheels,[.14,0,0,0]);
assert(truck.suspension.heave>0 && truck.suspension.heave<.02);
settle(curb);
assert(truck.suspension.pitch>.018 && truck.suspension.roll<-.04);
settle();
truck.speed=10;
settle();
truck.speed=0;
stepSuspension(truck,dt,flat);
const contact=truck.suspension;
assert(contact.pitch<-.015,'braking compresses front springs');
for(let i=0;i<3;i++)stepSuspension(truck,dt,flat);
assert(truck.suspension.pitch<contact.pitch,'springs continue compressing after impact');
const half=interpolateSuspension(contact,truck.suspension,.5);
assert.equal(half.pitch,(truck.suspension.pitch+contact.pitch)/2);
assert(mountPosition(truck,[0,1,-1]).y<1,'front mounting point follows nose dive');
truck.lateralSpeed=4;
stepSuspension(truck,dt,flat);
assert(truck.suspension.roll>0,'an acceleration to the right loads the left wheels');
settle();assert.equal(truck.suspension.roll,0);assert.equal(truck.suspension.pitch,0);
console.log('PASS independent curb response, stationary settling, braking, impact rebound, lateral load, mount alignment and snapshot interpolation.');

const gt={kind:'supercar',x:0,z:0,y:0,yaw:0,speed:0};
stepSuspension(gt,dt,flat);
let peak=0;
for(let i=0;i<45;i++){
  gt.speed+=15*dt;stepSuspension(gt,dt,flat);peak=Math.max(peak,gt.suspension.pitch);
}
assert(peak>.04 && peak<.085,'sports springs retain acceleration feedback without excessive squat');
assert(gt.suspension.wheels.every(h=>Math.abs(h)<.001),'four tyres stay on the road');
console.log('GT peak acceleration pitch', (peak*180/Math.PI).toFixed(1), 'degrees');

const cheetahs=[{kind:'supercar'},{kind:'valet-falco',model:'falco'},{kind:'valet-veloce',model:'veloce'}]
  .map(car=>({...car,x:0,z:0,y:0,yaw:0,speed:0}));
const uneven=(x,z)=>x<0 && z<0 ? .13 : 0;
for(let i=0;i<60;i++){
  for(const car of cheetahs){car.speed=i<25?i*.4:Math.max(0,10-(i-25)*.4);stepSuspension(car,dt,uneven);}
  for(const valet of cheetahs.slice(1))assert.deepEqual(valet.suspension,cheetahs[0].suspension,
    'Every Cheetah must have the same curb response, spring travel, and acceleration/braking attitude');
}
for(const valet of cheetahs.slice(1))assert.deepEqual(roadCabin(valet),roadCabin(cheetahs[0]),
  'All Cheetahs use the same driving position');
