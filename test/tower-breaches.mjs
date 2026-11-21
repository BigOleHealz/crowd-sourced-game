import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,advanceMissiles,tracePulse}=await import('../public/expedition.js');
const {breachTower,rubbleHeight}=await import('../public/tower-damage.js');
const {MAP,groundHeight,solidTopAt}=await import('../public/world.js');
for(const b of MAP.buildings.filter(b=>b.towerId!=null)){
  const w=newExpedition(), from={x:b.x-b.w/2-2.8,y:14,z:b.z-2};
  const dir={x:1,y:0,z:0};
  function shoot(id){
    w.missiles.push({...from,id,source:'rover',shooter:9,yaw:Math.PI/2,pitch:0,remaining:60});
    for(let tick=0;w.missiles.length && tick<60;tick++)advanceMissiles(w,new Map(),[],tick);
  }
  shoot(1);
  assert.equal(w.doors.towerBreaches?.length,1,'first strike on tower '+b.towerId);
  const lateJoin=JSON.parse(JSON.stringify(w));
  const opening=tracePulse(lateJoin,[],from,dir,2.8+b.w/8,false,'rover');
  assert(!opening.blocked && !opening.hitKind,'clear first bay');
  const deeper=tracePulse(lateJoin,[],from,dir,2.8+b.w/2-.25,false,'rover');
  assert(deeper.blocked || deeper.hitKind==='glass','single missile leaves the rest of the old bay intact');
  shoot(2);
  assert.equal(w.doors.towerBreaches.length,2,'next bay takes the second hit');
  const neighbor=tracePulse(w,[],{...from,y:10},dir,b.w,false,'rover');
  assert(neighbor.blocked || neighbor.hitKind==='glass','next band intact');
  from.y=2;shoot(3);
  assert.equal(w.doors.towerBreaches.length,3,'street-level truck missile opens the podium');
}
for(const b of MAP.buildings.filter(b=>b.towerId!=null)){
  const w=newExpedition(),height=6.7;
  for(let line=0;line<4;line++){
    const z=b.z+b.d*((line+.5)/4-.5);
    for(let col=0;col<4;col++){
      w.missiles.push({id:100+line*4+col,x:b.x-b.w/2-2.8,y:height,z,source:'rover',shooter:9,yaw:Math.PI/2,pitch:0,remaining:60});
      for(let tick=0;w.missiles.length && tick<60;tick++)advanceMissiles(w,new Map(),[],tick);
      if(line*4+col<15)assert(!w.doors.collapsedTowers?.includes(b.towerId),'partial floor still stands');
    }
  }
  assert.deepEqual(w.doors.collapsedTowers,[b.towerId],'sixteenth hit collapses tower '+b.towerId);
  const doors=JSON.parse(JSON.stringify(w.doors));
  const top=solidTopAt(b.x,b.z,w.hp,0,Infinity,doors);
  assert.equal(top,rubbleHeight(b,b.x,b.z,doors),'the pile starts at ground level when supports fail');
  assert.equal(groundHeight(b.x,b.z,Infinity,doors),top);
  delete doors.structureFalls;
  assert.equal(groundHeight(b.x,b.z,Infinity,doors),rubbleHeight(b,b.x,b.z,doors),'settled pile supports late arrivals');
  assert.equal(breachTower(MAP.buildings,doors,{x:b.x,y:height,z:b.z}),null,'no repeated property credit');
  const roofOnly={};
  for(let i=0;i<16;i++){
    const x=b.x+b.w*((i%4+.5)/4-.5),z=b.z+b.d*((Math.floor(i/4)+.5)/4-.5);
    breachTower([b],roofOnly,{x,y:b.base+b.eave+.2,z});
  }
  assert(!roofOnly.collapsedTowers,'removing the top band alone leaves the tower standing');
}
console.log('PASS localized first and second missile impacts on all Brickell towers and replicated collision');
