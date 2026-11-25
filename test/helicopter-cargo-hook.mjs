import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {stepCargoHook,slingVehicle,slingHitch}=await import('../public/cargo-hook.js');
const {groundHeight,MAP}=await import('../public/world.js');
const {stepBoat}=await import('../public/patrol-boats.js');
const {newCityTraffic}=await import('../public/city-traffic.js');
for(const type of ['rover','supercar','civilian','boat']){
 const w=newExpedition(),h=w.heli;
 w.traffic=newCityTraffic();
 const v=type==='boat'?w.boats[0]:type==='civilian'?w.traffic[0]:w[type];
 const x=type==='boat'?59:0,z=type==='boat'?21:-30;
 Object.assign(v,{x,z,y:type==='boat'?MAP.waterY:groundHeight(x,z)});
 Object.assign(h,{pilot:1,x,z,y:v.y+8,grounded:false});
 const step=(cmd,n)=>{for(let i=0;i<n;i++)stepCargoHook(w,cmd,1/30);};
 step({lower:true},7);assert(!h.hook.load && h.hook.length>.5);
 step({},9);assert(!h.hook);
 step({lower:true},80);assert.equal(slingVehicle(w,h.hook.load),v);assert.equal(v.sling,'held');
 const y=v.y;h.y+=3;h.z+=1;step({},15);assert(v.y>y+2.8 && v.z>z+.5);
 assert(Math.abs(h.y+.55-v.y-slingHitch(v)-h.hook.length)<1e-5);
 if(type==='boat'){stepBoat(w,v,null,1/30);assert(v.y>y+2.8);}
 if(type==='civilian')h.pilot=null;
 step(type==='civilian'?{}:{release:true},1);assert(!h.hook && v.sling==='falling');
 step({},120);assert(!v.sling && !w.hasFallingCargo && v.y<=y+.15);
}
console.log('PASS manual deployment, retract, latch, carry, release and gravity for pickup, GT, civilian sedan and RHIB');
