import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {stepPlayer,buildingTopAt}=await import('../public/world.js');
const {roomAtFeet,interiorCeiling,buildingAction}=await import('../public/building-interiors.js');
const {nearBlackjack}=await import('../public/casino-layout.js');
let p={x:26.2,y:.80,z:-381,vx:0,vy:0,vz:0,grounded:true},world={doors:{}};
function walk(x,z){
  for(let i=0;i<300;i++){
    const dx=x-p.x,dz=z-p.z,length=Math.hypot(dx,dz);if(length<.13)return;
    p=stepPlayer(p,{x:dx/length,z:dz/length},1/30,{},world);
  }
  assert.fail('Could not reach '+[x,z]+' from '+[p.x,p.y,p.z]);
}
walk(26.2,-389.0);assert.match(buildingAction(p,world.doors).label,/Villa Lido/);
walk(26.2,-394.1);assert.equal(roomAtFeet(p,world.doors).label,'Villa Lido');assert.equal(interiorCeiling(p,world.doors),4.53);
walk(17.2,-394.1);walk(17.2,-395.8);assert(buildingTopAt(17.2,-397.4,.05,2,world.doors)>1.5);
walk(17.2,-394.1);walk(31.5,-394.1);assert(!nearBlackjack(p));
walk(26.2,-394.1);walk(26.2,-386.0);assert.equal(roomAtFeet(p,world.doors),undefined);
console.log('Walked through Villa Lido from marina terrace to bedroom and kitchen, then back outside.');
