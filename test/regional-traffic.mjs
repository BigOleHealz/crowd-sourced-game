import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

if(!process.argv[2]){
  for(const map of ['brickell','outpost'])execFileSync(process.execPath,[fileURLToPath(import.meta.url),map],
    {env:{...process.env,PINEWATCH_MAP:map},stdio:'inherit'});
}else{
  const {newExpedition}=await import('../public/expedition.js');
  const {cityServices,outpostServices}=await import('../public/traffic-routes.js');
  const {CITY,groundHeight}=await import('../public/world.js');
  const {roadContact}=await import('../public/road-contact.js');
  const {bridges}=await import('../public/brickell-map.js');
  const {bridgeMiddle,trafficStopLine,stepDrawbridges,maxLift}=await import('../public/drawbridges.js');
  const {newCityTraffic,stepCityTraffic,syncTrafficDrivers,trafficDriverCar}=await import('../public/city-traffic.js');
  const {newRivals,updateRival}=await import('../public/rivals.js');
  const dt=1/30,world=newExpedition(),services=CITY?cityServices:outpostServices;
  const residents=newRivals(),players=new Map();
  for(const [route,,model,,bay] of services){
    // Check the entire driveable footprint against barriers, water, vehicles and relief.
    for(let d=0;d<route.length;d+=.3){
      const p=route.pose(d),car={...p,model,y:groundHeight(p.x,p.z)};
      assert(!roadContact(world,p.x,p.z,p.yaw,p.x,p.z,car),'Route obstruction at '+p.x+' '+p.z);
    }
    const [x,z]=bay;
    assert(!roadContact(world,x,z,0,x,z,{model,y:groundHeight(x,z)}),'Recovery bay is blocked');
  }
  world.traffic=newCityTraffic();
  syncTrafficDrivers(world,residents);
  function step(t){
    if(CITY)stepDrawbridges(world,bridges,dt);
    stepCityTraffic(world,players,residents,dt);
    for(const npc of residents)if(!trafficDriverCar(world,npc.id))updateRival(npc,t,dt,world.hp,world);
  }
  const dist=world.traffic.map(()=>0),crossings=new Set();
  for(let t=0;t<6600;t++){
    const previous=world.traffic.map(c=>[c.x,c.z]);
    step(t);
    for(const [i,car] of world.traffic.entries()){
      const [x,z]=previous[i];
      assert(residents.some(n=>n.id===car.npcDriver));
      dist[i]+=Math.hypot(car.x-x,car.z-z);
      if(CITY)for(const b of bridges){
        const middle=bridgeMiddle(b);
        if((z-middle)*(car.z-middle)<0)crossings.add([car.id,middle,Math.sign(car.z-z)].join('/'));
      }
    }
  }
  assert(dist.every(d=>d>(CITY?650:270)),'All districts circulate continuously');
  if(CITY){
    for(const b of bridges)for(const car of world.traffic.slice(3,5))for(const direction of [-1,1])
      assert(crossings.has([car.id,bridgeMiddle(b),direction].join('/')),'Interisland cars traverse both lanes');
    const bridge=bridges[0],middle=bridgeMiddle(bridge),car=world.traffic[3];
    for(let t=0;t<12000 && !(car.z>middle+30 && car.z<middle+35 && Math.cos(car.yaw)>.98);t++)step(t);
    assert(car.z>middle+30 && car.z<middle+35);
    world.yacht.x=0;world.yacht.z=middle;
    for(let t=0;t<240;t++)step(t);
    assert.equal(world.doors.bridgeLifts[bridge.north],maxLift);
    assert.equal(car.speed,0);assert(car.z-middle>=trafficStopLine(car)-.08);
    world.yacht.x=80;
    for(let t=0;t<420;t++)step(t);
    assert.equal(world.doors.bridgeLifts[bridge.north],0);
    assert(car.z<middle-10,'Driver waits for full closure then crosses');
    // A yacht arriving after a driver passes the stop bar must let them clear.
    for(let t=0;t<12000 && Math.abs(car.z-middle)>3;t++)step(t);
    assert(Math.abs(car.z-middle)<=3);
    world.yacht.x=0;
    for(let t=0;t<30;t++)step(t);
    assert.equal(world.doors.bridgeLifts[bridge.north],0,'Leaves hold for a driver already on deck');
    for(let t=0;t<330;t++)step(t);
    assert.equal(world.doors.bridgeLifts[bridge.north],maxLift);
  }
  console.log(process.argv[2]+' PASS complete route sweeps, circulating distances '+dist.map(Math.round).join(', ')+' m');
}
