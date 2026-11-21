import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {createWanted}=await import('../public/wanted.js');
const {newExpedition,fire,advanceRounds,advanceMissiles,patrolSight}=await import('../public/expedition.js');
const {tryTrafficInteract,newCityTraffic,stepCityTraffic,syncTrafficDrivers}=await import('../public/city-traffic.js');
const {newLife,newRivals,vehicleContacts}=await import('../public/rivals.js');
const make=(id,x,z)=>({id,state:{x,y:.70,z,vy:0,grounded:true},yaw:0,life:newLife(0,false),fireReady:0,weapon:4,score:{kills:0,deaths:0},inputs:[]});
function fixture(){
  const w=newExpedition(),p=make(1,0,-185),b=make(2,4,-185),players=new Map([[1,p],[2,b]]),npcs=[];
  w.traffic=[];w.wanted=createWanted(w,players);
  const level=t=>w.wanted.view(p,t).stars;
  function shot(t){fire(w,p,{aimYaw:0,aimPitch:0},t,players,npcs);for(let i=0;i<40;i++){advanceRounds(w,players,npcs,t+i);advanceMissiles(w,players,npcs,t+i);}}
  return {w,p,b,players,npcs,level,shot};
}
{
  const {w,p,b,players,level}=fixture();w.traffic=newCityTraffic();const [car]=w.traffic,all=newRivals();syncTrafficDrivers(w,all);
  Object.assign(car,{speed:0});p.state={...car,grounded:true};
  w.wanted.set(p,true);assert.equal(level(0),0);
  assert(tryTrafficInteract(w,p,all));assert.equal(level(0),0);
  for(let i=0;i<36;i++)stepCityTraffic(w,players,all,1/30);
  assert.equal(level(40),1);assert.equal(w.wanted.session(p).heat,1);
  assert(!car.takeover&&car.driver===p.id);assert.equal(w.wanted.view(b,40).enabled,false);
  tryTrafficInteract(w,p,all);tryTrafficInteract(w,p,all);
  assert.equal(w.wanted.session(p).heat,1,'reboarding an empty car is legal');
}
{
  const {w,p,b,players,npcs,level,shot}=fixture();
  const resident=make('resident',0,-190);npcs.push(resident);shot(5);
  assert.equal(resident.life.hp,0);assert.equal(level(5),0);
  w.wanted.set(p,true);resident.life=newLife(60,false);p.fireReady=0;shot(70);
  assert.equal(resident.life.hp,0);assert.equal(w.wanted.session(p).heat,2);
  shot(130);assert.equal(w.wanted.session(p).heat,2,'old defeats cannot score twice');
  const officer=make('officer-test',0,-190);officer.officer=true;officer.targetId=1;npcs.push(officer);
  shot(200);assert.equal(officer.life.hp,0);assert.equal(w.wanted.session(p).heat,5);
  Object.assign(w.rover,{x:0,y:.70,z:-191,speed:0});shot(280);
  assert(w.rover.wrecked);assert.equal(w.wanted.session(p).heat,7);shot(370);assert.equal(w.wanted.session(p).heat,7);
  w.rover.x=25;const car={id:'patrol-car-test',kind:'patrol-car-test',targetId:1,hp:180,maxHp:180,x:0,z:-191,y:.7,yaw:0,model:'sedan'};
  w.patrolCars=[car];shot(460);assert(car.wrecked);assert.equal(w.wanted.session(p).heat,9);
  shot(535);assert.equal(w.wanted.session(p).heat,9);
  assert.equal(w.shots.filter(s=>s.weapon==='vehicleWreck'&&s.source===car.id).length,1);
  w.wanted.set(p,false);assert.equal(w.patrolCars.length,0);assert.equal(level(540),0);
  // An old projectile, reconnect or toggling the system again cannot reclaim its ownership.
  w.wanted.set(p,true);fire(w,p,{aimYaw:0,aimPitch:0},610,players,npcs);
  const m=w.missiles.at(-1);assert(w.wanted.owner(m));w.wanted.set(p,false);w.wanted.set(p,true);assert.equal(w.wanted.owner(m),undefined);
  assert.equal(w.wanted.view(b,610).enabled,false);
}
{
  const {w,p,b,npcs,players,level}=fixture();w.wanted.set(p,true);
  const owner=w.wanted.session(p),levels=[];
  for(let i=0;i<15;i++){w.wanted.record(owner,'theft',1);levels.push(level(1));}
  assert.deepEqual([...new Set(levels)],[1,2,3,4,5]);
  for(let tick=1;tick<164;tick++)w.wanted.step(npcs,tick);
  assert.equal(npcs.filter(o=>o.targetId===p.id).length,3);assert(p.life.hp<100);assert.equal(b.life.hp,100);
  const o=npcs[0];Object.assign(o.state,{x:0,y:.7,z:-191});Object.assign(b.state,{x:0,y:.7,z:-188});
  assert(!patrolSight(w,o,p,players),'an opted-out bystander intercepts sight without taking a hit');
  Object.assign(b.state,{x:8,z:-187});assert(patrolSight(w,o,p,players));
  Object.assign(p.state,{x:75,z:-330,y:22});for(let tick=164;tick<=1150;tick++)w.wanted.step(npcs,tick);
  assert.equal(level(1150),0);assert.equal(npcs.length,0);assert.equal(b.life.hp,100);
  Object.assign(p.state,{x:0,y:.7,z:-185});w.wanted.record(owner,'theft',1151);w.wanted.step(npcs,1151);assert(npcs.length);
  p.life.hp=0;w.wanted.step(npcs,1152);assert.equal(npcs.length,0);assert.equal(level(1152),0);
  assert(w.wanted.view(p,1153).enabled);
}
{
  const {w,p,npcs,players}=fixture();w.wanted.set(p,true);
  const victim=make('resident',0,-186.5);npcs.push(victim);Object.assign(w.rover,{x:0,y:.7,z:-185,driver:p.id});
  vehicleContacts(w,'rover',{x:0,y:.7,z:-184.6},[p,victim],30,1/30);
  assert.equal(victim.life.hp,0);assert.equal(w.wanted.session(p).heat,2);
  vehicleContacts(w,'rover',{x:0,y:.7,z:-184.6},[p,victim],31,1/30);
  assert.equal(w.wanted.session(p).heat,2);
}
{
  const {w,p,b,players,npcs}=fixture();
  for(let i=3;i<=8;i++)players.set(i,make(i,0,-180-i*3));
  for(const person of players.values()){
    w.wanted.set(person,true);
    for(let i=0;i<5;i++)w.wanted.record(w.wanted.session(person),'officer',1);
  }
  for(let t=1;t<=90;t++)w.wanted.step(npcs,t);
  assert.equal(npcs.length,8);assert.equal(new Set(npcs.map(o=>o.targetId)).size,8);
  const before=npcs.slice();w.wanted.set(p,false);
  assert.equal(npcs.length,7);assert(npcs.every(o=>before.includes(o)&&o.targetId!==p.id));
  assert.equal(w.wanted.view(b,90).stars,5);
}
console.log('PASS confirmed theft, direct/splash/vehicle defeats, ordinary and patrol wreck deduplication, five levels, bounded response, crossfire protection, escape, opt-out and defeat reset.');
