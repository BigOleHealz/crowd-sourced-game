import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {MAP,groundHeight,stepPlayer}=await import('../public/world.js');
const {keyShores,keyGround}=await import('../public/offshore-keys.js');
const {stepBoat,interactBoat,helmFeet}=await import('../public/patrol-boats.js');

const dt=1/30;
for(const [x,z,yaw,axis,sign,edge] of [
  [74,-211,Math.PI/2,'x',1,109],[-74,-185,-Math.PI/2,'x',-1,94],
  [14,80,Math.PI,'z',1,109],[15,-285,0,'z',-1,319],
]) {
  const world=newExpedition(),b=world.boats[1],actor={id:7,state:{}},players=new Map([[7,actor]]);
  Object.assign(b,{x,z,yaw,driver:actor.id});
  for(let i=0;i<240;i++)stepBoat(world,b,{throttle:1},dt,players);
  assert(b[axis]*sign>edge-3 && b[axis]*sign<=edge-2.75);
  assert.equal(b.hp,300,'chart edge stops the hull without collision damage');
  actor.state=helmFeet(b);interactBoat(world,b,actor);
  assert.equal(b.driver,null);assert(actor.state.swimming);
  for(let i=0;i<80;i++)actor.state=stepPlayer(actor.state,{x:axis==='x'?sign:0,z:axis==='z'?sign:0},dt,world.hp,world);
  assert.equal(actor.state[axis]*sign,edge,'swimmer stays at the same chart limit');
}

// Low mangrove headlands reached by the expanded chart have physical shores.
for(const shore of keyShores){
  for(const row of shore.slices.slice(1,-1)){
    for(const [u,y,v] of row.slice(1,-1)){
      const x=shore.x-shore.iz*u+shore.ix*v,z=shore.z+shore.ix*u+shore.iz*v;
      assert(Math.abs(keyGround(x,z)-y)<1e-6);
    }
  }
}
const world=newExpedition(),b=world.boats[1];Object.assign(b,{x:82,z:-56,yaw:Math.PI/2,driver:1});
for(let i=0;i<120;i++)stepBoat(world,b,{throttle:1},dt,new Map());
assert(b.x<96 && b.x>83,'hull stops on the visible island shore before the chart edge');
assert(groundHeight(0,-106)>6 && groundHeight(0,-106,0)<MAP.waterY);
console.log('PASS offshore cruising, four chart edges, crew disembarkation and swimming, solid new islet approaches, and two-level causeway.');
