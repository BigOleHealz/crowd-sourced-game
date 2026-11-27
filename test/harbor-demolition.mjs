import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition,advanceMissiles}=await import('../public/expedition.js');
const {homes}=await import('../public/residential-sites.js');
const {breachHarborHouse}=await import('../public/harbor-demolition.js');
const {stepTank}=await import('../public/tank.js');
const {cutGrid,inTankOpening}=await import('../public/tank-wall-cuts.js');
const {MAP,blocked,groundHeight}=await import('../public/world.js');

const harbor=homes.filter(h=>h.id.startsWith('harbor-'));
assert.equal(harbor.length,6,'all four residences and both market halls participate');
const elsewhere=newExpedition(),casa=homes.find(h=>h.id==='casa').parts[0];
assert.equal(breachHarborHouse(elsewhere.doors,{x:casa.x-casa.w/2,y:2,z:casa.z},{x:1,z:0}),null,
  'the Harbor launcher path leaves Lantern Point homes alone');
for(const home of harbor){
  const b=home.parts[0];
  assert(MAP.buildings.some(plot=>plot.x===b.x && plot.z===b.z),home.id+' has a world footprint');
  const world=newExpedition();
  world.missiles=[{id:10,source:'handLauncher',shooter:1,x:b.x-b.w/2-4,y:2,z:b.z,
    yaw:Math.PI/2,pitch:0,remaining:30}];
  for(let tick=0;tick<30 && world.missiles.length;tick++)advanceMissiles(world,new Map(),[],tick);
  const first=[...world.doors.tankWallCuts??[]];
  assert(first.length>=3 && first.length<=12,home.id+' launcher removes a small local patch');
  assert(!world.doors.houseRuins?.[home.id],home.id+' remains standing after one hit');
  const far=b.x+b.w/2;
  assert(!inTankOpening(world.doors,far,2,b.z),home.id+' opposite facade stays intact');
  const late=JSON.parse(JSON.stringify(world.doors));
  for(const cell of first){
    const x=cutGrid.west+(cell%cutGrid.width+.5)*cutGrid.size;
    const z=cutGrid.north+(Math.floor(cell/cutGrid.width)+.5)*cutGrid.size;
    assert(inTankOpening(late,x,2,z),home.id+' breach survives a snapshot');
  }
  // More hits on separate faces share the tank's cut list and can finish the
  // same structure without deleting unaffected buildings elsewhere.
  for(const side of [-1,1])for(let z=b.z-b.d/2+1;z<b.z+b.d/2;z+=1.4)
    breachHarborHouse(world.doors,{x:b.x+side*b.w/2,y:2,z},{x:side,z:0});
  for(const side of [-1,1])for(let x=b.x-b.w/2+1;x<b.x+b.w/2;x+=1.4)
    breachHarborHouse(world.doors,{x,y:2,z:b.z+side*b.d/2},{x:0,z:side});
  assert(world.doors.houseRuins?.[home.id],home.id+' collapses after repeated localized hits');
  assert(!blocked(b.x,.8,b.z,world.hp,world.doors),home.id+' ruin is traversable');
  assert(first.every(cell=>world.doors.tankWallCuts.includes(cell)),home.id+' retains earlier damage');

  const driven=newExpedition(),tank=driven.tank,dir=-1;
  const x=b.x-dir*(b.w/2+4.5),z=b.z;
  Object.assign(tank,{x,z,y:groundHeight(x,z,1),yaw:dir*Math.PI/2,driver:1});
  const occupant={id:1,team:1,life:{hp:100},state:{x,z,y:.8}};
  for(let tick=0;tick<480;tick++){
    driven.simTick=tick;
    stepTank(driven,{throttle:1},1/30,new Map([[1,occupant]]));
  }
  assert(driven.doors.tankWallCuts?.length,home.id+' tank breaks wall cells');
  assert(tank.x<b.x-b.w/2,home.id+' tank drives through to the far side');
  const before=driven.doors.tankWallCuts.length;
  breachHarborHouse(driven.doors,{x:b.x-b.w/2,y:2,z:b.z+b.d*.33},{x:1,z:0});
  assert(driven.doors.tankWallCuts.length>=before,home.id+' missile shares tank damage');
}
console.log('PASS six Harbor Key buildings support launcher breaches, tank traversal, shared progressive damage and full demolition');
