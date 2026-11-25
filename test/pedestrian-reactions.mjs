import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {newRivals,updateRival,rivalView}=await import('../public/rivals.js');
const {groundHeight,MAP}=await import('../public/world.js');
const {roadway}=await import('../public/brickell-map.js');
const {localWorldReactions,soundRoadHorn}=await import('../public/pedestrian-reactions.js');
const {newCityTraffic,syncTrafficDrivers}=await import('../public/city-traffic.js');
const {hydrants,repairTicks}=await import('../public/hydrants.js');
for(const type of ['horn','spray','collapse']){
  const w=newExpedition(),npcs=newRivals();
  w.traffic=newCityTraffic();syncTrafficDrivers(w,npcs);
  const nx=type==='collapse'?-45:-6.4,nz=type==='collapse'?-31:7.3;
  const n=npcs[0],route=n.route;
  const here=(who,x,z)=>Object.assign(who,{state:{x,y:groundHeight(x,z),z,grounded:true,vy:0}});
  here(n,nx,nz);here(npcs[1],42,65);
  const seated=npcs.find(a=>a.id===w.traffic[0].npcDriver);here(seated,nx,nz);
  if(type==='horn'){
    Object.assign(w.rover,{x:-2,z:8});
    soundRoadHorn(w,w.rover,npcs,100);assert(!n.reaction,'unoccupied car is silent');
    w.rover.driver=9;soundRoadHorn(w,w.rover,npcs,100);const event=w.rover.horn;
    soundRoadHorn(w,w.rover,npcs,101);assert.equal(w.rover.horn,event);
  }else if(type==='spray'){
    w.doors.hydrants={[hydrants[0].id]:repairTicks};localWorldReactions(w,npcs,100);
  }else{
    w.doors.structureFalls=[{tower:MAP.buildings[0].towerId}];localWorldReactions(w,npcs,100);
  }
  assert.equal(rivalView(n,100).reaction,type);assert(!npcs[1].reaction && !seated.reaction);
  const end=n.reaction.until;
  let travel=0;
  for(let t=100;t<=end;t++){
    const prev=n.state;
    updateRival(n,t,1/30,w.hp,w);
    assert(!roadway(n.state.x,n.state.z),'pedestrian remains on the sidewalk');
    travel+=Math.hypot(n.state.x-prev.x,n.state.z-prev.z);
  }
  assert(travel>.2);assert(!n.reaction && n.route===route && n.life.hp===100);
  console.log(type,'PASS',travel.toFixed(2),'m retreat;',end-100,'ticks; driver and distant bystander unaffected');
}
