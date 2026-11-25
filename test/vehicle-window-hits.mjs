import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition,fire,advanceRounds}=await import('../public/expedition.js');
const {newLife}=await import('../public/rivals.js');
const {parkedTrafficCar}=await import('../public/city-traffic.js');
const {yachtPoint}=await import('../public/yacht-layout.js');
const w=newExpedition(),people=new Map();
function fireAcross(x,y,z,yaw){
  const shooter={id:7,state:{x,y:y-1.3,z},weapon:1,life:{hp:100},fireReady:0};
  fire(w,shooter,{aimYaw:yaw,aimPitch:0},0,people,[]);
  for(let tick=0;tick<8;tick++)advanceRounds(w,people,[],tick);
}
for(const [kind,height,aft] of [['rover',1.30,0],['supercar',.94,.15],['heli',1.71,-1.10]]){
  const v=w[kind];Object.assign(v,{x:0,y:30,z:0,yaw:0,pitch:0,roll:0});
  const hp=v.hp,body=structuredClone(v.bodyDamage);
  fireAcross(5,30+height,aft,-Math.PI/2);
  assert(Object.keys(v.brokenGlass??{}).length===1,kind+' side window shatters');
  assert.equal(v.hp,hp,kind+' glass hit leaves vehicle health intact');
  assert.deepEqual(v.bodyDamage,body,kind+' glass hit leaves bodywork intact');
  v.x=55;
}
const y=w.yacht,from=yachtPoint(y,7.2,3.8,-5);
fireAcross(from.x,from.y,from.z,y.yaw-Math.PI/2);
assert.equal(Object.keys(y.brokenGlass??{}).length,1,'yacht salon window shatters');
assert.equal(w.doors.glassSounds.length,4);
console.log('PASS replicated pane damage and shatter events on truck, GT, Black Hawk and yacht');

function shootCar(kind,height,driver=true,breakFirst=false){
  const world=newExpedition(),car=world[kind]??parkedTrafficCar('test-car',kind,0,0,0);
  if(!world[kind])world.traffic=[car];
  Object.assign(car,{x:0,y:30,z:0,yaw:0,driver:driver?2:null});
  const occupant={id:2,state:{x:0,y:30,z:0},life:newLife(0,false),yaw:0};
  const x=kind==='rover'?-.323:kind==='supercar'?-.365:-.43;
  const shooter={id:1,state:{x,y:30+height-1.3,z:-5},weapon:1,life:newLife(0,false),fireReady:0};
  const players=new Map([[1,shooter],[2,occupant]]);
  if(breakFirst){
    car.driver=null;
    players.delete(occupant.id);
    fire(world,shooter,{aimYaw:Math.PI,aimPitch:0},0,players,[]);
    for(let tick=0;tick<8;tick++)advanceRounds(world,players,[],tick);
    assert.equal(occupant.life.hp,100);
    car.driver=2;players.set(occupant.id,occupant);
  }
  const hp=car.hp;
  fire(world,shooter,{aimYaw:Math.PI,aimPitch:0},10,players,[]);
  for(let tick=10;tick<18;tick++)advanceRounds(world,players,[],tick);
  return {world,car,occupant,hp};
}
for(const [kind,height] of [['rover',1.2],['supercar',.9],['sedan',1.3],['hatchback',1.3],['van',1.5]]){
  for(const alreadyBroken of [false,true]){
    const {world,car,occupant,hp}=shootCar(kind,height,true,alreadyBroken);
    assert.equal(car.hp,hp,kind+' keeps its health through the window');
    assert(occupant.life.hp<100,kind+' seated driver takes bullet damage');
    assert.equal(world.shots.filter(shot=>shot.hitKind==='player' && shot.targetId===2).length,1);
    assert(car.brokenGlass?.front,kind+' windscreen remains broken');
  }
}
const metal=shootCar('rover',1.0);
assert(metal.car.hp<metal.hp,'sheet metal still takes damage');
assert.equal(metal.occupant.life.hp,100,'sheet metal shields the driver');
{
  const world=newExpedition(),car=parkedTrafficCar('npc-car','sedan',0,0,0);
  Object.assign(car,{x:0,y:30,z:0,npcDriver:'driver'});world.traffic=[car];
  const npc={id:'driver',state:{x:0,y:30,z:0},life:newLife(0,false),yaw:0};
  const shooter={id:1,state:{x:-.43,y:30,z:-5},weapon:1,life:newLife(0,false),fireReady:0};
  const players=new Map([[1,shooter]]),hp=car.hp;
  fire(world,shooter,{aimYaw:Math.PI,aimPitch:0},0,players,[npc]);
  for(let tick=0;tick<8;tick++)advanceRounds(world,players,[npc],tick);
  assert.equal(car.hp,hp,'NPC car windscreen leaves vehicle health intact');
  assert(npc.life.hp<100,'seated NPC driver takes bullet damage');
}
console.log('PASS car glass absorbs no vehicle HP, bullets reach seated drivers, and bodywork shields them');
