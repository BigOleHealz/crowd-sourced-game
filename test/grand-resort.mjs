import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {stepPlayer,blocked,solidTopAt}=await import('../public/world.js');
const {buildingAction,doorIsOpen,setDoorOpen,roomAtFeet,interiorCeiling}=await import('../public/building-interiors.js');
const {grandStoryY,grandLift,resortLevels,penthousePool,GRAND_STORIES,grandTopAt}=await import('../public/grand-resort-layout.js');
const {advanceElevator,requestInterior}=await import('../interior-actions.js');
const pos=(x,y,z)=>({x,y,z,vy:0,vx:0,vz:0,grounded:true});
const {newExpedition}=await import('../public/expedition.js');
const w=newExpedition(),player={id:1,lastSeq:0,state:pos(grandLift.exitX,.8,grandLift.exitZ),inputs:[],life:{hp:100}};
const players=new Map([[1,player]]);
let seq=0;
function walk(x,z){
  for(let i=0;i<400;i++){
    const p=player.state,dx=x-p.x,dz=z-p.z,len=Math.hypot(dx,dz);
    if(len<.11)return;
    player.state=stepPlayer(p,{x:dx/len,z:dz/len},1/30,w.hp,w);
  }
  assert.fail('Could not reach '+[x,z]+' from '+JSON.stringify(player.state));
}
function lift(n){
  assert.equal(buildingAction(player.state,w.doors)?.kind,'lift');
  requestInterior(w,players,player,{seq:++seq,building:25,floor:n},0);
  assert(player.trip,'lift accepted '+n);
  advanceElevator(w,player,player.trip.time);
  assert(Math.abs(player.state.y-grandStoryY(n))<.001);
  assert(!blocked(player.state.x,player.state.y,player.state.z,w.hp,w.doors));
}
for(let i=1;i<GRAND_STORIES;i++){
  lift(i);
  walk(-59,43);
  assert.equal(roomAtFeet(player.state,w.doors).casinoStorey,i);
  if(i>=5 && i<17){
    walk(-59,47);walk(-60,47);
    const d=buildingAction(player.state,w.doors).d;assert(d && !doorIsOpen(d,w.doors));
    setDoorOpen(d,w.doors,true);
    walk(-61.55,47);walk(-62.5,48);walk(-61.55,47);walk(-59,47);
  }
  if(i>=9 && i<17){
    walk(-59,53.5);walk(-59,56);walk(-56,58);walk(-56,61.1);
    const d=buildingAction(player.state,w.doors).d;assert(d);setDoorOpen(d,w.doors,true);walk(-56,63.5);walk(-56,61.1);
    walk(-56,58);walk(-59,56);walk(-59,53.5);
  }
  walk(grandLift.exitX,grandLift.exitZ);
}
const pool=penthousePool;
walk(-59,54.5);walk(-59,56);walk(pool.x,61.9);walk(pool.x,pool.z+.4);
assert(player.state.swimming,'pool deep section');
assert(Math.abs(player.state.y-(pool.water-.72))<.33);
walk(pool.x,61.9);assert(player.state.grounded && !player.state.swimming,'steps out onto pool deck');
walk(-59,56);walk(-59,54.5);walk(grandLift.exitX,grandLift.exitZ);lift(0);
walk(-58.55,43.70);walk(-58.5,45.7);walk(-58.5,48.2);walk(-55,48.2);walk(-55,50.8);
assert.equal(interiorCeiling(player.state,w.doors),grandStoryY(5));
assert(grandTopAt(-55,50.8,0,grandStoryY(5)-.6)<1,'clear five-storey entrance void');
assert(grandTopAt(-56,60,0,5)<1,'road remains passable under tower');
assert(solidTopAt(-60,63,{},0,2.0,w.doors)<1.1,'avenue has drive clearance');
assert.equal(resortLevels.length,20);
console.log('All 20 elevator stops, guest suite doors, 8 skybridge-room crossings, the open atrium, and penthouse pool entry/swim/exit passed.');
