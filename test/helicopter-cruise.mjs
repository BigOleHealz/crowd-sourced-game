import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {fly}=await import('../public/airframe.js');
const world=newExpedition(),h=world.heli,dt=1/30;
Object.assign(h,{x:0,y:67,z:30,grounded:false,pilot:1});
let last;
for(let tick=0;tick<420;tick++){
  last=h.z;fly(world,{x:0,z:-1,lift:0,aimYaw:0},dt);
}
const speed=(last-h.z)/dt;
assert(Math.abs(speed-18.4)<.02,'steady forward cruise doubles from 9.2 m/s');
assert.equal(h.hp,500);assert.equal(h.y,67);
console.log('PASS sustained forward flight at',speed.toFixed(2),'m/s');
