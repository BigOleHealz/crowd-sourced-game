import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {flightState,recoverHelicopter,fly}=await import('../public/airframe.js');
const {MAP,solidTopAt}=await import('../public/world.js');
const {breachTower,baysPerFloor,towerCellBounds,towerStride}=await import('../public/tower-damage.js');
for(const pilot of [null,1]){
 const world=newExpedition(),h=world.heli,b=MAP.buildings.find(v=>v.towerId===3);
 Object.assign(h,{x:b.x-4,z:b.z-2,pilot});
 h.y=solidTopAt(h.x,h.z,{},0,Infinity,world.doors);
 const before=h.y,idle={x:0,z:0,lift:0,aimYaw:0};
 const step=()=>{recoverHelicopter(world,1/30);if(pilot)fly(world,idle,1/30);};
 step();assert.equal(h.y,before);
 for(let i=0;i<baysPerFloor;i++){
   const c=towerCellBounds(b,b.towerId*towerStride+i);
   breachTower([b],world.doors,{x:(c.x0+c.x1)/2,z:(c.z0+c.z1)/2,y:c.y0+.2});
 }
 step();assert(!h.grounded && h.y<before);
 for(let i=0;i<20;i++)step();
 assert(flightState(h).vy < -5);
 if(pilot){for(let i=0;i<80;i++)fly(world,{...idle,lift:1},1/30);assert(flightState(h).vy>0);}
 else{for(let i=0;i<130;i++)step();assert(h.grounded && h.y<before-10 && h.hp<500);}
}
console.log('PASS occupied and parked aircraft lose a demolished roof, with gravity, impact and pilot recovery');
