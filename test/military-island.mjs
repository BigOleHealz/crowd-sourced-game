import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

if(process.env.GOY_THEFT_AUTO_MAP!=='brickell'){
  execFileSync(process.execPath,[fileURLToPath(import.meta.url)],{
    env:{...process.env,GOY_THEFT_AUTO_MAP:'brickell'},stdio:'inherit'});
}else{
  const {groundHeight,insideTravelArea,stepPlayer,MAP,HELIPAD}=await import('../public/world.js');
  const {militaryShoreBedHeight,militaryShoreRocks,parapetTop}=await import('../public/brickell-map.js');
  const {onRunway,onAirfield}=await import('../public/runway-layout.js');
  const {parkedJet}=await import('../public/jet.js');
  const {parkedHelicopter}=await import('../public/airframe.js');
  const {patrolFleet,nearBoat,stepBoat}=await import('../public/patrol-boats.js');
  const {newExpedition}=await import('../public/expedition.js');
  const {driveRover}=await import('../public/rover.js');
  const {militaryIsland,militaryBridge,militaryCauseway,onMilitaryBridge,insideMilitary,onMilitaryRockShore,militaryRunway,militaryTaxiways,militaryHangars,militaryHelipads,militaryDockHeight,militaryBarriers}=await import('../public/military-island.js');
  assert(insideTravelArea(militaryIsland.west+1,-230));
  assert(insideMilitary(-160,-230));
  assert(!insideMilitary(-85,-210),'water gap remains between the islands');
  assert.equal(groundHeight(-160,-230),.8);
  assert(groundHeight(-85,-210)<0,'gap is navigable water');
  for(const [x,z] of [[-251,-240],[-132,-240],[-246,-305],[-136,-305],[-246,-155],[-136,-155]]){
    assert(onMilitaryRockShore(x,z),`rock apron covers exposed shore at ${x},${z}`);
    assert(groundHeight(x,z)>=militaryShoreBedHeight(x,z)-1e-6,
      `walking collision follows visible bank or boulder at ${x},${z}`);
    assert(groundHeight(x,z,MAP.waterY)<groundHeight(x,z)-1,
      `boats retain the deeper bed beside the rock at ${x},${z}`);
  }
  assert(militaryShoreRocks.rocks.length>400,'the military shore has continuous boulder coverage');
  for(const rock of militaryShoreRocks.rocks){
    assert(militaryShoreBedHeight(rock.x,rock.z)>MAP.waterY,
      'the boulder sits on exposed ground rather than a water hole');
    assert(groundHeight(rock.x,rock.z)>militaryShoreBedHeight(rock.x,rock.z)+.3,
      'the same visible boulder has a walkable top');
  }
  const stepRock=militaryShoreRocks.rocks.find(r=>r.x<-253 && r.x>-255 && r.z>-220 && r.z<-200);
  assert(stepRock,'west shoreline has a reachable test boulder');
  let climber={x:-249.2,z:stepRock.z,y:.8,vy:0,grounded:true},highest=climber.y;
  for(let tick=0;tick<50;tick++){
    climber=stepPlayer(climber,{x:-1},1/30,{}, {doors:{}});
    highest=Math.max(highest,climber.y);
  }
  assert(highest>1.2 && climber.x<stepRock.x-1,
    'the player walks up and across a visible boulder without jumping or clipping through it');
  assert(!onMilitaryRockShore(-85,-210),'rock apron leaves the water channel open');
  assert.equal(militaryBridge.east-militaryBridge.west,72,'west channel matches Lantern Bridge');
  assert(onMilitaryBridge(-97,-230));
  assert(groundHeight(-97,-230)>5,'raised bridge deck is driveable');
  assert(groundHeight(-97,-230,0)<MAP.waterY,'boats can pass below the bridge');
  for(const x of [-125,-113,-97,-69]){
    const deck=groundHeight(x,-230);
    for(const z of [-237,-223]){
      assert.equal(groundHeight(x,z),deck+militaryCauseway.sidewalkRise,
        'both sidewalk surfaces follow the bridge deck on the approaches and leaves');
    }
    assert.equal(parapetTop(x,-239.35,0,Infinity),deck+militaryCauseway.sidewalkRise+militaryCauseway.parapetHeight,
      'the outside sidewalk guard has matching pedestrian collision');
  }

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
