import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {homes}=await import('../public/residential-sites.js');
const {houseSupportCells,houseLostSupport}=await import('../public/house-support.js');
const {newExpedition}=await import('../public/expedition.js');
const {ramHouse}=await import('../public/residential-falls.js');
const {openTankWall,noteWallBreak}=await import('../public/tank-wall-cuts.js');
const {stepTank}=await import('../public/tank.js');
const {groundHeight}=await import('../public/world.js');

for(const home of homes){
  const cells=[...houseSupportCells(home.id)];
  assert(cells.length>0,home.id+' has lower structural supports');
  const doors=newExpedition().doors;
  assert(!houseLostSupport(doors,home.id));
  for(const cell of cells.slice(0,Math.floor(cells.length*.50)))openTankWall(doors,cell);
  assert(!houseLostSupport(doors,home.id),home.id+' survives local damage');
  for(const cell of cells.slice(Math.floor(cells.length*.50)))openTankWall(doors,cell);
  assert(houseLostSupport(doors,home.id),home.id+' falls with every solid support gone');
  assert(ramHouse(doors,home.id,home.parts[0].x,home.parts[0].z,1,0));
  assert(doors.houseRuins[home.id] && doors.structureFalls.some(e=>e.home===home.id));
}
const doors=newExpedition().doors;
noteWallBreak(doors,'wood',1,2,3);
noteWallBreak(doors,'concrete',4,5,6);
assert.deepEqual(doors.wallSounds.map(e=>e.material),['wood','concrete']);
assert.equal(doors.wallSeq,2);
const wood=readFileSync(new URL('../public/audio/wood-crack.flac',import.meta.url));
assert.equal(wood.toString('ascii',0,4),'fLaC');
assert(wood.length<150_000);
// Sweep adjacent lanes across the peach stucco house shown in the report.
const home=homes.find(h=>h.id==='harbor-1').parts[0],world=newExpedition(),tank=world.tank;
const driver={id:1,team:1,life:{hp:100},state:{x:0,y:.8,z:0}};
tank.driver=driver.id;
for(let z=home.z-home.d/2+1;z<home.z+home.d/2 && !world.doors.houseRuins?.['harbor-1'];z+=2.5){
  const x=home.x-home.w/2-5;
  Object.assign(tank,{x,z,y:groundHeight(x,z,1),yaw:Math.PI/2,speed:0});
  for(let i=0;i<280;i++){
    world.simTick++;
    stepTank(world,{throttle:1},1/30,new Map([[driver.id,driver]]));
  }
}
assert(world.doors.houseRuins?.['harbor-1'],'repeated actual tank passes collapse the house');
assert(world.doors.wallSounds?.some(e=>e.material==='concrete'));
console.log('PASS house support excludes glass; local damage stands, removed supports collapse, and wall sounds retain material.');
