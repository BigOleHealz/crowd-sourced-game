import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {groundHeight,stepPlayer}=await import('../public/world.js');
const {interiorPlans,buildingAction}=await import('../public/building-interiors.js');
const {galleryPlans,galleryRoomAt}=await import('../public/gallery-lobbies.js');
const {stepHotelDoors}=await import('../public/maravela-hotel.js');
const {club,inClub}=await import('../public/club-lucero.js');
const {stations}=await import('../public/beach-layout.js');
const {beachHut}=await import('../public/harbor-key-structures.js');
const {requestInterior,advanceElevator}=await import('../interior-actions.js');
const dt=1/30;
function approach(x,z){
 const world=newExpedition();
 let feet={x,z,y:groundHeight(x,z,2,world.doors),vy:0,grounded:true};
 const player={id:1,life:{hp:100},inputs:[],lastSeq:0},players=new Map([[1,player]]);
 let seq=0;
 return {get feet(){return feet;},get doors(){return world.doors;},open(d){
   player.state=feet;requestInterior(world,players,player,{door:d.id,seq:++seq,open:true},0);
 },ride(from,to){
   player.state=feet;
   requestInterior(world,players,player,{building:from.p.id,floor:to.index,seq:++seq},0);
   assert.equal(player.trip?.to,to,from.p.name+' accepted floor request');
   advanceElevator(world,player,player.trip.time);feet=player.state;
   assert(feet.grounded && feet.y===to.y);
   assert.equal(buildingAction(feet,world.doors)?.s,to,from.p.name+' destination controls');
 },walk(x,z,label){
   for(let i=0;i<160;i++){
     const dx=x-feet.x,dz=z-feet.z,d=Math.hypot(dx,dz);
     if(d<.11)return;
     stepHotelDoors(world.doors,[feet],dt);
     feet=stepPlayer(feet,{x:dx/d,z:dz/d},dt,world.hp,world);
   }
   assert.fail(label+' obstructed at '+[feet.x,feet.y,feet.z]+' toward '+[x,z]);
 }};
}
for(const g of galleryPlans){
 const p=interiorPlans.find(p=>p.b===g.b);
 for(const e of g.ends){
   const outside=e.z+e.side*1.65,walker=approach(e.x,outside);
   walker.walk(e.x,e.z-e.side*1.40,p.name+' gallery entrance');
   assert(galleryRoomAt(walker.feet.x,walker.feet.y,walker.feet.z));
   if(g.b.housing){
     const [lobby,upper]=p.panels;
     assert.equal(p.lobbyEntries,g.ends);
     for(const o of g.solids.filter(o=>o.kind==='shelf' || o.kind==='luggage')){
       assert(!(Math.abs(o.x-lobby.x)<o.w/2+.50 && Math.abs(o.z-lobby.z)<o.d/2+1.01),p.name+' clear elevator bay');
     }
     walker.walk(lobby.exitX,lobby.exitZ,p.name+' gallery to elevator');
     const c=Math.cos(lobby.angle),s=Math.sin(lobby.angle);
     walker.walk(lobby.x+s*1.10+c*1.33,lobby.z+c*1.10-s*1.33,p.name+' call plate');
     assert.equal(buildingAction(walker.feet,walker.doors)?.s,lobby,p.name+' elevator controls');
     walker.ride(lobby,upper);walker.ride(upper,lobby);
   }
   walker.walk(e.x,outside,p.name+' return to pavement');
 }
}
for(const station of stations){
 const west=station.x-3.4,walker=approach(west,station.z+.15);
 walker.walk(station.x-.60,station.z+.15,'Rescue '+station.number+' gate');
 assert(walker.feet.y>1.95 && walker.feet.grounded);
 walker.walk(west,station.z+.15,'Rescue '+station.number+' stair exit');
}
{
 const x=beachHut.x,z=beachHut.z,walker=approach(x-4,z);
 walker.walk(x,z,'shade hut');walker.walk(x+4,z,'hut east exit');
}
{
 const x=club.x+club.w/2,z=club.z,walker=approach(x+1.5,z);
 walker.walk(x-2.3,z,'Club Lucero');assert(inClub(walker.feet));
 walker.walk(x+1.5,z,'club exit');assert(!inClub(walker.feet));
}
const bank=interiorPlans.find(p=>p.type==='bank');
for(const d of bank.doors.filter(d=>d.axis==='z')){
 const side=Math.sign(d.x-bank.x),x=d.x+side*1.5,walker=approach(x,d.z);
 walker.walk(d.x+side*.82,d.z,d.label+' approach');
 assert.equal(buildingAction(walker.feet,walker.doors)?.d,d);
 walker.open(d);
 walker.walk(d.x-side*1.55,d.z,d.label);walker.walk(x,d.z,d.label+' exterior exit');
}
console.log('PASS both street entrances and upstairs round trips at all 10 Brickell tower lobbies, other gallery doors, bank offices, Club Lucero, lifeguard houses and beach hut.');
