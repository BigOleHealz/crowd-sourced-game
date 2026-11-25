import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition,advanceRounds}=await import('../public/expedition.js');
const {newLife,vehicleContacts}=await import('../public/rivals.js');
const {localWorldReactions}=await import('../public/pedestrian-reactions.js');
const {stepCourtResident}=await import('../court-residents.js');
const {createBasketball}=await import('../basketball-game.js');
const {createVolleyball}=await import('../harbor-volleyball.js');
const {basketballCourt}=await import('../public/basketball-layout.js');
const {courts,sandHeight}=await import('../public/beach-layout.js');

for(const sport of ['basketball','volleyball']){
  const world=newExpedition(),players=new Map(),residents=[];
  const basketball=createBasketball(world,players),volleyball=createVolleyball(()=>true,()=>.5);
  world.basketball=basketball.state;world.volleyball=volleyball.state;
  basketball.roster.attach(residents);
  for(const roster of volleyball.rosters)roster.attach(residents);
  assert.equal(residents.length,10);
  const hoops=sport==='basketball',game=hoops?world.basketball:world.volleyball[0];
  const roster=hoops?basketball.roster:volleyball.rosters[0];
  const npc=residents.find(n=>n.id===(hoops?'hoops-maya':'volley-0-0'));
  const {x,y,z}=npc.state,dt=1/30;
  const score=()=>(hoops?game.scores:game.score).join('-');
  function step(tick){
    for(const n of residents)stepCourtResident(n,tick,dt,world);
    basketball.step(dt);volleyball.step(world,players,tick,dt);
  }
  function hit(tick){
    const {x,y,z}=npc.state;
    world.bullets.push({id:tick,shooter:9,x,y:y+1.1,z:z+1,vx:0,vy:0,vz:-60,left:12,age:0,weapon:1});
    advanceRounds(world,players,residents,tick);
    assert.equal(world.shots.at(-1)?.targetId,npc.id);
    localWorldReactions(world,residents,tick,players);
  }
  hit(1);step(2);
  assert(npc.life.hp>0 && npc.life.hp<100);
  assert.equal(roster.view(2)[0].hp,npc.life.hp);
  assert.equal(roster.view(2)[0].reaction,'gunfire');
  assert(npc.courtPose.sidelined);
  for(let t=3;t<=34;t++)step(t);
  assert(Math.hypot(npc.state.x-x,npc.state.z-z)>.4);
  assert.equal(score(),'0-0');
  if(!hoops)assert.equal(game.phase,'interrupted');
  for(let t=35;t<49 && npc.life.hp;t++){hit(t);step(t);}
  assert.equal(npc.life.hp,0);assert(roster.view(49)[0].dead);
  const due=npc.life.returnAt;
  for(let t=50;t<=due;t++)step(t);
  assert.equal(npc.life.hp,100);assert(roster.view(due)[0].protected);
  for(let t=due+1;t<1000;t++)step(t);
  assert(!npc.courtPose.sidelined);
  assert(hoops?game.shot || game.result:game.hits || game.score.some(Boolean),'court resumes');
  const court=hoops?basketballCourt:courts[0],feet={x:court.x-1,y:hoops?court.y:sandHeight(court.x-1,court.z-2),z:court.z-2,grounded:true};
  const human={id:22,state:feet,life:newLife(1000,false)};
  players.set(human.id,human);
  if(hoops)basketball.interact(human,'join');else volleyball.request(world,human,'join',1000);
  assert.equal(game.players[0],human.id);assert(!residents.includes(npc));
  assert.equal(residents.filter(n=>n.id===human.id).length,0);
  if(hoops)basketball.interact(human,'leave');else volleyball.leave(human.id,1001);
  assert.equal(residents.filter(n=>n===npc).length,1);
  if(!hoops){
    world.doors.nets=[true];step(1002);
    assert(!residents.includes(npc));delete world.doors.nets;step(1003);assert(residents.includes(npc));
  }
  const beforeScore=score(),other=residents.find(n=>n.id===(hoops?'hoops-nico':'volley-0-1'));
  if(hoops)basketball.interact(human,'join');else volleyball.request(world,human,'join',1004);
  const car=world.rover;
  Object.assign(car,{x:other.state.x,y:other.state.y,z:other.state.z+3.30,yaw:0});
  vehicleContacts(world,'rover',{...car,z:car.z+3*dt},residents,1005,dt);
  step(1005);
  assert(other.life.fall && other.courtPose.sidelined && other.life.hp<100);
  assert.equal(game.players[0],human.id);assert.equal(score(),beforeScore);
  console.log(sport,'shared hits, panic and retreat, defeat, protected return, resumed play, human slot ownership verified');
}
