import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {stepPlayer,MAP}=await import('../public/world.js');
const {newExpedition}=await import('../public/expedition.js');
const w=newExpedition(),dt=1/30;
for(const [x,z,dx,dz] of [[43.45,32,-1,0],[67.45,-378,-1,0],[-68.45,-442,1,0]]){
  const swimmer={x,z,y:MAP.waterY-.72,vy:0,grounded:false,swimming:true};
  const input={x:dx,z:dz,jump:true};
  let p=stepPlayer(swimmer,input,dt,w.hp,w);
  assert(p.climb,'grabs edge at '+[x,z]);
  for(let i=0;i<45 && p.climb;i++)p=stepPlayer(p,{x:0,z:0},dt,w.hp,w);
  assert(p.grounded && !p.swimming && p.y>MAP.waterY);
}
const open=stepPlayer({x:80,z:-310,y:MAP.waterY-.72,swimming:true,grounded:false},{x:1,z:0,jump:true},dt,w.hp,w);
assert(open.swimming && !open.climb && !open.grounded);
console.log('PASS pull-up onto mainland, Lantern quay and low marina pier, open-water swimming preserved');
