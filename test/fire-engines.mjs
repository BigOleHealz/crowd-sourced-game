import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
if(!process.env.FIRE_TEST_REGION){
  for(const map of ['brickell','outpost']){
    const r=spawnSync(process.execPath,[process.argv[1]],{stdio:'inherit',env:{...process.env,PINEWATCH_MAP:map,FIRE_TEST_REGION:map}});
    assert.equal(r.status,0);
  }
}else{
  const {newExpedition}=await import('../public/expedition.js');
  const {newRivals,newLife}=await import('../public/rivals.js');
  const {CITY,groundHeight}=await import('../public/world.js');
  const {roadContact}=await import('../public/road-contact.js');
  const {fireSite,hitFireSite,stepDistrictFires}=await import('../public/district-fire.js');
  const {fireEngine,stepFireEngines,driveWater}=await import('../public/fire-engine.js');
  const {monitorHeight}=await import('../public/water-monitor.js');
  const {newCityTraffic,stepCityTraffic,tryTrafficInteract,driveTrafficCar}=await import('../public/city-traffic.js');
  const {civilianProfiles}=await import('../public/civilian-fleet.js');
  const dt=1/30;
  const sites=CITY?['pelican-fuel','01','02','harbor-0','harbor-2','harbor-3','sign-0','sign-1']:
    ['trail-0','trail-1','trail-2','trail-3','trail-4'];
  function fixture(site){
    const w=newExpedition(),crew=newRivals(),players=new Map(),reserve=fireEngine();
    assert(!roadContact(w,reserve.x,reserve.z,reserve.yaw,reserve.x,reserve.z,reserve),'reserve bay has clear bodywork');
    w.traffic=[...newCityTraffic(),reserve];
    const at={x:site.x-(site.w??0)/2,y:groundHeight(site.x,site.z)+1.5,z:site.z};
    for(let i=0;i<4;i++)hitFireSite(w.doors,site.id,at,0,true,null);
    const step=t=>{
      stepFireEngines(w,players,crew,t,dt);stepCityTraffic(w,players,crew,dt,t);
      stepDistrictFires(w.doors,t);
    };
    return {w,crew,players,step,at};
  }
  for(const id of sites){
    const {w,step}=fixture(fireSite(id));let arrival,parked,left,cleared,peak=1,cooled=false;
    for(let t=1;t<720;t++){
      step(t);const c=w.traffic.find(c=>c.response),f=w.doors.fires?.[id];
      if(c?.response==='arriving')arrival??={x:c.x,z:c.z};
      if(c?.water)parked??={x:c.x,z:c.z};
      if(f?.level<peak)cooled=true;
      peak=Math.max(peak,f?.level??0);
      if(!f)cleared??=t;
      if(c?.response==='departing')left=true;
      if(left&&!c)break;
    }
    assert(arrival&&parked&&left&&cleared,id+' receives an approaching crew, water and departure');
    assert(Math.hypot(parked.x-arrival.x,parked.z-arrival.z)>1.5,id+' physically arrives');
    assert(!w.doors.houseRuins?.[id] && !w.doors.beachWood?.[id] && w.doors.posts?.[id]!==0);
    assert(!w.traffic.some(c=>c.response),'departed engine clears the scene');
    if(peak>1)assert(cooled,'water progressively reduces fire intensity');
  }

  const site=fireSite(sites[0]),{w,crew,players,step,at}=fixture(site);
  let t=0,car;
  while(t<450){step(++t);car=w.traffic.find(c=>c.water);if(car)break;}
  assert(car);
  const p={id:41,state:{x:car.x-2.0*Math.cos(car.yaw),y:car.y,z:car.z-2.0*Math.sin(car.yaw),grounded:true},life:newLife(0,false)};
  const q={id:42,state:{...p.state},life:newLife(0,false)};players.set(p.id,p);players.set(q.id,q);
  assert(tryTrafficInteract(w,p,crew));assert.equal(car.driver,p.id);
  assert(!tryTrafficInteract(w,q,crew));assert.equal(car.npcDriver,null);
  assert(!car.response && !car.water,'AI hands over both driving and monitor');
  for(let n=0;n<32;n++)step(++t);
  assert(!car.takeover && car.driver===p.id,'boarding animation completes');
  const yaw=car.yaw;
  for(let i=0;i<15;i++)driveTrafficCar(w,car,{steer:1},dt,players);
  assert.equal(car.yaw,yaw,'stationary steering cannot pivot a heavy engine');
  assert(civilianProfiles.engine.driveForce/civilianProfiles.engine.mass<civilianProfiles.van.driveForce/civilianProfiles.van.mass);
  assert(civilianProfiles.engine.brakeForce/civilianProfiles.engine.mass<civilianProfiles.van.brakeForce/civilianProfiles.van.mass);
  const aimYaw=Math.atan2(at.x-car.x,car.z-at.z),aimPitch=Math.atan2(at.y-car.y-monitorHeight,Math.hypot(at.x-car.x,at.z-car.z));
  for(let i=0;i<300 && w.doors.fires?.[site.id];i++){
    t++;driveWater(w,car,{aimYaw,aimPitch,fire:true},t);stepDistrictFires(w.doors,t);
  }
  assert(!w.doors.fires?.[site.id],'driver can finish extinguishing an incident');
  driveWater(w,car,{fire:false,aimYaw,aimPitch},++t);
  assert(!car.water,'releasing the trigger clears the replicated stream');
  console.log('PASS',sites.length,'incident sites, reserve clearance, contested takeover, player monitor and heavy steering in',process.env.FIRE_TEST_REGION);
}
