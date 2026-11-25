import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newRivals,rivalView}=await import('../public/rivals.js');
const {nearbySpeaker,conversations,hotelRegulars}=await import('../public/brickell-conversations.js');
const {newExpedition}=await import('../public/expedition.js');
const {nextUse}=await import('../public/use-target.js');
const {hotelEntrance}=await import('../public/maravela-hotel.js');
const world=newExpedition();world.map='brickell';world.npcs=newRivals().map(n=>rivalView(n,10));
for(const {id,name} of hotelRegulars){
  const npc=world.npcs.find(n=>n.id===id),person=conversations[id];
  assert.equal(npc.name,name);assert(person.age>=30 && person.topics.length>=2);
  const feet={...npc,z:npc.z+1},find=(priority=null)=>nearbySpeaker(world,feet,true,priority,hotelEntrance(feet));
  assert.equal(find(),id);assert.equal(nearbySpeaker(world,feet,false,null,false),null);
  assert.equal(nearbySpeaker(world,feet,true,null,true),null);
  assert.equal(nearbySpeaker(world,{...feet,y:feet.y+2},true,null,false),null);
  assert.equal(nearbySpeaker(world,{...feet,z:feet.z+5},true,null,false,id),null);
  npc.dead=true;assert.equal(find(),null);npc.dead=false;
  npc.fall={};assert.equal(find(),null);delete npc.fall;
  const original={...world.rover};
  Object.assign(world.rover,{x:feet.x,z:feet.z+.9,y:feet.y,speed:0});
  const car=nextUse(world,feet,999);assert.equal(car.target,'rover');assert.equal(find(car),null);Object.assign(world.rover,original);
}
const testNpc={...world.npcs.find(n=>n.id===hotelRegulars[0].id),x:-16.5,y:.8,z:-48.8};
const doorFeet={x:-16.4,y:.8,z:-47.9,grounded:true};assert(hotelEntrance(doorFeet));
assert.equal(nearbySpeaker({...world,npcs:[testNpc]},doorFeet,true,null,hotelEntrance(doorFeet)),null);
const inside={x:-23.4,y:.83,z:-51,grounded:true};
assert.equal(nearbySpeaker(world,inside,true,null,false),null,'Talk cannot cross the hotel wall');
console.log('PASS both named adults, readable dialogue, range, living actors, walls, auto doors and overlapping vehicle priority');
