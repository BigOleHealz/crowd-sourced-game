import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {MAP}=await import('../public/world.js');
const {newExpedition,tracePulse}=await import('../public/expedition.js');
const {segmentContact}=await import('../public/rounds.js');
const {towerGlassIndex}=await import('../public/tower-glass.js');
const {shatterPane}=await import('../public/frontage-glass.js');
for(const tower of towerGlassIndex(MAP.buildings)){
  const b=tower.b,world=newExpedition(),floor=tower.levels.at(-2)??tower.levels[0];
  const p=floor.find(p=>b.finish?p.axis==='z'&&p.side===1:p.facade&&p.axis==='z'&&p.side===1);
  if(!p)continue;
  const y=p.bottom+(p.top-p.bottom)*.70,x=p.x+p.width*.24,z=b.z+b.d/2;
  const dir={x:0,y:0,z:-1},d={x:0,y:0,z:-2.5};
  const from={x,y,z:z+1,source:'rover'};
  const shot=()=>segmentContact(world,from,d,[],new Map(),()=>({distance:Infinity}));
  assert.equal(shot().hitKind,'glass');
  shatterPane(world.doors,p);
  assert(!Number.isFinite(shot().t),'no phantom wall in open bay of '+b.x+','+b.z);
  assert(!tracePulse(world,[],from,dir,2.5,false,'rover').blocked,'same aperture for vehicle projectiles');
  from.z=z-1;d.z=2.5;
  assert(!Number.isFinite(shot().t),'reverse direction');
  from.x=p.office?p.x+p.width/2+.06:p.x;
  assert.equal(shot().hitKind,'scenery','surviving visible frame or pier');
}
console.log('PASS upper window glass, clear aperture in both directions, retained frames and vehicle pulse');
