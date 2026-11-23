import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {bridges}=await import('../public/brickell-map.js');
const {newExpedition}=await import('../public/expedition.js');
const {stepTank}=await import('../public/tank.js');
const {groundHeight}=await import('../public/world.js');
const w=newExpedition(),t=w.tank,b=bridges[0];
Object.assign(t,{driver:1,x:(b.west+b.east)/2,z:b.south-1,yaw:0});
t.y=groundHeight(t.x,t.z);
const inclines=[];
for(let i=0;i<1000 && t.z>b.north+1;i++){
  stepTank(w,{throttle:1},1/30);
  inclines.push(t.suspension.pitch);
}
assert(t.z<b.north+2,'crossed entire bridge');
assert(Math.max(...inclines)>.08 && Math.min(...inclines)<-.08,'climbs nose up and descends nose down');
