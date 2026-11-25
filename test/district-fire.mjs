import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
if(!process.env.FIRE_TEST_MAP){
  for(const map of ['brickell','outpost']){
    const r=spawnSync(process.execPath,[process.argv[1]],{stdio:'inherit',env:{...process.env,FIRE_TEST_MAP:map,GOY_THEFT_AUTO_MAP:map}});
    assert.equal(r.status,0);
  }
}else{
  const {newExpedition,fire,advanceRounds,advanceMissiles}=await import('../public/expedition.js');
  const {stepDistrictFires,fireSite}=await import('../public/district-fire.js');
  const {newLife}=await import('../public/rivals.js');
  const {groundHeight,solidTopAt,blocked}=await import('../public/world.js');
  const {roadContact}=await import('../public/road-contact.js');
  const {fuelStop,pumpIslands}=await import('../public/fire-sites.js');
  const {landmarkGuide}=await import('../public/landmark-navigation.js');
  const w=newExpedition(),p={id:1,team:1,life:newLife(0,false),state:{grounded:true},score:{kills:0},fireReady:0,weapon:5};
  const players=new Map([[p.id,p]]);
  const {sampleRanger}=await import('../public/ragdoll.js');
  function place(x,z){
    Object.assign(p.state,{x,y:groundHeight(x,z,1,w.doors),z});
  }
  function cast(tick,yaw=0,pitch=0){
    fire(w,p,{aimYaw:yaw,aimPitch:pitch},tick,players,[]);
    sampleRanger(p,1/30,w);
  }
  if(process.env.FIRE_TEST_MAP==='outpost'){
    place(2.24,4.95);cast(0,Math.PI,.05);
    assert.equal(w.doors.fires?.['trail-0']?.stage,'burning');
    stepDistrictFires(w.doors,140);assert.equal(w.doors.posts['trail-0'],0);
    assert.equal(w.doors.fires['trail-0'].stage,'burned');
    console.log('PASS Outpost wood marker chars and falls');process.exit(0);
  }
  assert.equal(landmarkGuide(fuelStop.name)(fuelStop.x,fuelStop.roadZ,0).cue,'Arrived');
  const car=w.rover;
  for(let z=fuelStop.roadZ;z>=fuelStop.z-2;z-=.4){
    Object.assign(car,{x:fuelStop.x,y:.80,z,yaw:0});
    assert(!roadContact(w,car.x,z,0,car.x,z,car),'clear approach between islands');
  }
  Object.assign(car,{x:19,y:.8,z:-260});
  place(pumpIslands[0],fuelStop.z+5);p.weapon=1;
  for(let i=0;i<4;i++){
    cast(i*10);
    for(let n=0;n<5;n++)advanceRounds(w,players,[],i*10+n);
    assert.equal(w.doors.fuelHits,i+1);
    if(i<3)assert(!w.doors.fires);
  }
  assert.equal(w.doors.fires[fuelStop.id].stage,'burning');
  stepDistrictFires(w.doors,500);assert.equal(w.doors.fires[fuelStop.id].stage,'burned');
  // A vehicle between the operator and the wood face absorbs the effect.
  p.weapon=5;place(-32,-226);
  Object.assign(car,{x:-32,y:.8,z:-228.7,yaw:0});cast(500,0,.04);
  assert(!w.doors.fires['harbor-0']);assert.equal(car.hp,250);
  Object.assign(car,{x:19,y:.8,z:-260});cast(510,0,.04);
  const f=w.doors.fires['harbor-0'];
  assert.equal(f?.stage,'burning','projector meets the visible wood home');
  stepDistrictFires(w.doors,510+115);assert.equal(f.level,2);
  cast(630,0,.04);assert.equal(f.start,510);
  stepDistrictFires(w.doors,510+329);assert(!w.doors.houseRuins);
  const credit=[],rules={damageProperty:(...args)=>credit.push(args)};
  stepDistrictFires(w.doors,510+330,rules);assert.equal(w.doors.fires['harbor-0'].stage,'burned');
  assert.equal(w.doors.structureFalls.length,1);
  stepDistrictFires(w.doors,1100,rules);assert.equal(w.doors.structureFalls.length,1);
  assert.equal(credit.length,1);assert.equal(credit[0][0],p.team);assert.equal(credit[0][2],'house:harbor-0');
  const late=JSON.parse(JSON.stringify(w.doors)),house=fireSite('harbor-0');
  assert(late.houseRuins[house.id]);assert(!blocked(house.x,.85,house.z,w.hp,late));
  assert(solidTopAt(house.x,house.z,w.hp,0,Infinity,late)<1.12);
  place(-36,-171);cast(1110,0,.04);assert(!w.doors.fires['harbor-1'],'stucco stays intact');
  place(9.72,-186);cast(1120);assert(!w.doors.fires['sign-0'],'projector range');
  place(9.72,-192);cast(1130);
  assert.equal(w.doors.fires['sign-0']?.stage,'burning');stepDistrictFires(w.doors,1270);
  assert(w.doors.beachWood['sign-0']);
  assert.equal(Object.keys(w.doors.fires).length,3);
  const alternate=newExpedition();p.weapon=4;p.fireReady=0;place(pumpIslands[0],fuelStop.z+5);
  fire(alternate,p,{aimYaw:0,aimPitch:0},0,players,[]);
  for(let tick=1;tick<15;tick++)advanceMissiles(alternate,players,[],tick);
  assert.equal(alternate.doors.fuelHits,1,'a direct vehicle or launcher projectile counts once');
  console.log('PASS drive-up forecourt, four direct hits to ignite, projector stages, single home collapse, late traversable rubble, wood sign and stone exclusion');
}
