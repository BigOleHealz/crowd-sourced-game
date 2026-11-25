import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

if(process.env.GOY_THEFT_AUTO_MAP!=='brickell'){
  execFileSync(process.execPath,[fileURLToPath(import.meta.url)],{
    env:{...process.env,GOY_THEFT_AUTO_MAP:'brickell'},stdio:'inherit'});
}else{
  const {groundHeight,insideTravelArea,MAP,HELIPAD}=await import('../public/world.js');
  const {coastalBedHeight}=await import('../public/brickell-map.js');
  const {onRunway,onAirfield}=await import('../public/runway-layout.js');
  const {parkedJet}=await import('../public/jet.js');
  const {parkedHelicopter}=await import('../public/airframe.js');
  const {patrolFleet,nearBoat,stepBoat}=await import('../public/patrol-boats.js');
  const {newExpedition}=await import('../public/expedition.js');
  const {driveRover}=await import('../public/rover.js');
  const {militaryIsland,militaryBridge,onMilitaryBridge,insideMilitary,onMilitaryRockShore,militaryRunway,militaryTaxiways,militaryHangars,militaryHelipads,militaryDockHeight,militaryBarriers}=await import('../public/military-island.js');
  assert(insideTravelArea(militaryIsland.west+1,-230));
  assert(insideMilitary(-160,-230));
  assert(!insideMilitary(-85,-210),'water gap remains between the islands');
  assert.equal(groundHeight(-160,-230),.8);
  assert(groundHeight(-85,-210)<0,'gap is navigable water');
  for(const [x,z] of [[-251,-240],[-132,-240],[-246,-305],[-136,-305],[-246,-155],[-136,-155]]){
    assert(onMilitaryRockShore(x,z),`rock apron covers exposed shore at ${x},${z}`);
    assert(Math.abs(groundHeight(x,z)-coastalBedHeight(x,z))<1e-6,
      `walking collision follows visible rock at ${x},${z}`);
    assert(groundHeight(x,z,MAP.waterY)<groundHeight(x,z)-1,
      `boats retain the deeper bed beside the rock at ${x},${z}`);
  }
  assert(!onMilitaryRockShore(-85,-210),'rock apron leaves the water channel open');
  assert.equal(militaryBridge.east-militaryBridge.west,72,'west channel matches Lantern Bridge');
  assert(onMilitaryBridge(-97,-230));
  assert(groundHeight(-97,-230)>5,'raised bridge deck is driveable');
  assert(groundHeight(-97,-230,0)<MAP.waterY,'boats can pass below the bridge');
  assert(onRunway(-225,-230,true));
  assert(onAirfield(-200,-250));
  assert(onAirfield(-200,-282),'north hangar has a taxiway to the runway');
  assert.equal(militaryHangars.length,2);
  for(const hangar of militaryHangars){
    assert(insideMilitary(hangar.x,hangar.z),'each hangar stays on the base');
    assert(militaryBarriers.some(b=>b.bottom>5 && b.x===hangar.x && b.z===hangar.z),
      'each hangar has a collision roof');
    assert(!militaryBarriers.some(b=>b.x===hangar.x-hangar.w/2+.4 && b.z===hangar.z),
      'taxiway-facing hangar entrance remains open');
  }
  assert.equal(groundHeight(-225,-230),.8);
  assert(!onAirfield(-120,-20),'old Brickell strip is removed');
  assert(groundHeight(-120,-20)<MAP.waterY);
  const jet=parkedJet(),heli=parkedHelicopter();
  assert(onRunway(jet.x,jet.z,true));
  assert.deepEqual([heli.x,heli.z],[HELIPAD.x,HELIPAD.z]);
  assert.deepEqual([heli.x,heli.z],[militaryHelipads[0].x,militaryHelipads[0].z]);
  assert.equal(militaryRunway.south-militaryRunway.north,134);
  assert.equal(militaryHelipads.length,2);
  for(const pad of militaryHelipads)assert.equal(groundHeight(pad.x,pad.z),.8);
  assert.equal(groundHeight(-119,-252),militaryDockHeight(-119,-252));
  assert(groundHeight(-119,-252)>MAP.waterY,'pier deck is above the tide');
  assert(militaryBarriers.some(b=>b.bottom>5),'hangar has a roof');
  const boats=patrolFleet().filter(b=>b.id.startsWith('base-rhib'));
  assert.equal(boats.length,2);
  assert(nearBoat({boats},{x:-110,y:.56,z:-263,grounded:true})?.id==='base-rhib-south');
  const roadWorld=newExpedition(),rover=roadWorld.rover;
  Object.assign(rover,{x:-49,z:-230,y:groundHeight(-49,-230),yaw:-Math.PI/2,driver:1});
  let bridgePeak=0;
  for(let tick=0;tick<320;tick++){
    driveRover(roadWorld,{throttle:1},1/30,new Map());bridgePeak=Math.max(bridgePeak,rover.y);
  }
  assert(rover.x<militaryBridge.west-20 && !rover.sinking && !rover.wrecked,'road vehicle crosses onto the island');
  assert(bridgePeak>5,'road vehicle climbs the raised bridge');
  const boatWorld=newExpedition(),boat=boatWorld.boats[1];
  Object.assign(boat,{x:-97,z:-200,yaw:0,driver:1});
  for(let tick=0;tick<185;tick++)stepBoat(boatWorld,boat,{throttle:1},1/30,new Map());
  assert(boat.z<militaryBridge.north-20 && boat.hp===300,'boat passes beneath the bridge');
}
