import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

if(process.env.GOY_THEFT_AUTO_MAP!=='brickell'){
  execFileSync(process.execPath,[fileURLToPath(import.meta.url)],{
    env:{...process.env,GOY_THEFT_AUTO_MAP:'brickell'},stdio:'inherit'});
}else{
  const {groundHeight,insideTravelArea,MAP}=await import('../public/world.js');
  const {coastalBedHeight}=await import('../public/brickell-map.js');
  const {onRunway,onAirfield}=await import('../public/runway-layout.js');
  const {patrolFleet,nearBoat}=await import('../public/patrol-boats.js');
  const {militaryIsland,insideMilitary,onMilitaryRockShore,militaryRunway,militaryHelipads,militaryDockHeight,militaryBarriers}=await import('../public/military-island.js');
  assert(insideTravelArea(militaryIsland.west+1,-230));
  assert(insideMilitary(-160,-230));
  assert(!insideMilitary(-85,-210),'water gap remains between the islands');
  assert.equal(groundHeight(-160,-230),.8);
  assert(groundHeight(-85,-210)<0,'gap is navigable water');
  for(const [x,z] of [[-225,-230],[-106,-230],[-220,-305],[-110,-305],[-220,-155],[-110,-155]]){
    assert(onMilitaryRockShore(x,z),`rock apron covers exposed shore at ${x},${z}`);
    assert(Math.abs(groundHeight(x,z)-coastalBedHeight(x,z))<1e-6,
      `walking collision follows visible rock at ${x},${z}`);
    assert(groundHeight(x,z,MAP.waterY)<groundHeight(x,z)-1,
      `boats retain the deeper bed beside the rock at ${x},${z}`);
  }
  assert(!onMilitaryRockShore(-85,-210),'rock apron leaves the water channel open');
  assert(onRunway(-199,-230,true));
  assert(onAirfield(-175,-250));
  assert.equal(groundHeight(-199,-230),.8);
  assert.equal(militaryRunway.south-militaryRunway.north,134);
  assert.equal(militaryHelipads.length,2);
  for(const pad of militaryHelipads)assert.equal(groundHeight(pad.x,pad.z),.8);
  assert.equal(groundHeight(-93,-252),militaryDockHeight(-93,-252));
  assert(groundHeight(-93,-252)>MAP.waterY,'pier deck is above the tide');
  assert(militaryBarriers.some(b=>b.bottom>5),'hangar has a roof');
  const boats=patrolFleet().filter(b=>b.id.startsWith('base-rhib'));
  assert.equal(boats.length,2);
  assert(nearBoat({boats},{x:-84,y:.56,z:-263,grounded:true})?.id==='base-rhib-south');
}
