import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,advanceRounds}=await import('../public/expedition.js');
const {firstPaneHit}=await import('../public/rounds.js');
const {storefrontFaces,paneShattered,shatterPane,visitRoadPodium}=await import('../public/frontage-glass.js');
const {officeWindows}=await import('../public/office-windows.js');
const {glassSupportKey,paneSupportLost}=await import('../public/glass-support.js');
const {breachTower}=await import('../public/tower-damage.js');
const {galleryPlans}=await import('../public/gallery-lobbies.js');
const {MAP}=await import('../public/world.js');

const world=newExpedition(),vela=storefrontFaces.find(f=>f.name==='Vela'),tower=vela.building;
const store=vela.glass.bays[3].all,unaffectedStore=vela.glass.bays[1].panes[0];
const windows=officeWindows(tower).filter(p=>p.side===3 && p.floor===0);
const office=windows[3],unaffectedOffice=windows[0];
const neighbor=MAP.buildings.find(b=>b.towerId===0);
const neighboringPane=officeWindows(neighbor).find(p=>p.side===3 && p.floor===0);
const gallery=galleryPlans.find(p=>p.b===tower).panes[0];
const normal={x:.65,y:0,z:0};
const probe=(w,p,z=p.z)=>firstPaneHit(w,{x:p.x-.4,y:(p.bottom+p.top)/2,z},normal).target;
function drivePane(doors,pane){
  let blocked=false;
  visitRoadPodium(tower,vela.x-.1,pane.z,doors,rect=>{if(rect.face===vela && rect.index===pane.index)blocked=true;});
  return blocked;
}

// These rays reach the same sheets from the surviving half of their span.
assert.equal(probe(world,store,44).face,vela);
assert.equal(probe(world,office,44).id,office.id);
assert(drivePane(world.doors,store));
const before=glassSupportKey(world.doors);
breachTower([tower],world.doors,{x:10.8,y:2,z:47});
breachTower([tower],world.doors,{x:10.8,y:6,z:47});
assert.notEqual(glassSupportKey(world.doors),before);
assert(paneSupportLost(store,world.doors));
assert(paneSupportLost(office,world.doors,tower));
assert.equal(probe(world,store,44),null);
assert.equal(probe(world,office,44),null);
assert(!drivePane(world.doors,store));
assert(!paneShattered(store,world.doors) && !world.doors.glassSeq);
assert(!shatterPane(world.doors,store),'Lost support does not create a direct shatter event');
assert(!paneSupportLost(unaffectedStore,world.doors));
assert.equal(probe(world,unaffectedOffice).id,unaffectedOffice.id);
assert(!paneSupportLost(gallery,world.doors));

world.bullets.push({x:office.x-.4,y:(office.bottom+office.top)/2,z:44,vx:56,vy:0,vz:0,left:.65,age:0,weapon:1,shooter:1});
advanceRounds(world,new Map(),[],0);
assert(!world.shots.some(s=>s.hitKind==='glass'),'Traveling rounds ignore the same unsupported pane');

for(let i=0;i<16;i++)breachTower([tower],world.doors,{x:tower.x+tower.w*((i%4+.5)/4-.5),y:2,
  z:tower.z+tower.d*((Math.floor(i/4)+.5)/4-.5)});
assert.deepEqual(world.doors.collapsedTowers,[tower.towerId]);
const late=JSON.parse(JSON.stringify(world));
delete late.doors.structureFalls;
assert(paneSupportLost(gallery,late.doors));
assert.equal(probe(late,unaffectedOffice),null);
assert.equal(probe(late,neighboringPane).id,neighboringPane.id);
assert(!paneSupportLost(neighboringPane,late.doors,neighbor));
assert.equal(late.doors.brokenPanes,undefined);
console.log('Vela storefront and upper office sheets follow missing support, with surviving neighbor glazing, no direct hits, and settled late-join parity.');
