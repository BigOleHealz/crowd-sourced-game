import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';

const {bridges,cityGround}=await import('../public/brickell-map.js');
const {leafSurface,bridgeMiddle,maxLift}=await import('../public/drawbridges.js');
const {newExpedition}=await import('../public/expedition.js');
const {roadContact}=await import('../public/road-contact.js');
const {driveRover}=await import('../public/rover.js');

for(const bridge of bridges){
  const world=newExpedition();
  for(const z of [bridge.north+10,bridgeMiddle(bridge)-8,bridge.south-10]){
    for(const [x,rail] of [[bridge.east-.2,bridge.east],
      [bridge.west+.2,bridge.west],[bridge.walkEast-.2,bridge.walkEast],
      [bridge.walkWest+.2,bridge.walkWest]]){
      const car=world.rover;
      Object.assign(car,{x,z,y:cityGround(x,z),yaw:0});
      assert.equal(roadContact(world,x,z,0,x,z,car)?.object?.x,rail,
        `vehicle contacts bridge rail at ${rail}, ${z}`);
    }
  }

  const z=bridgeMiddle(bridge)-8,car=world.rover;
  world.doors.bridgeLifts??={};
  world.doors.bridgeLifts[bridge.north]=maxLift;
  const raised=leafSurface(bridge,z,maxLift);
  Object.assign(car,{x:bridge.east-.2,z,y:raised,yaw:0});
  assert.equal(roadContact(world,car.x,z,0,car.x,z,car)?.object?.x,bridge.east,
    'road guard rises with the drawbridge leaf');
  car.y=bridge.height(z,'road')-2;
  assert.notEqual(roadContact(world,car.x,z,0,car.x,z,car)?.object?.x,bridge.east,
    'a vehicle below a raised leaf does not hit its guard');
  world.doors.bridgeLifts[bridge.north]=0;

  for(const [start,limit] of [[0,bridge.east-1.8],[7.5,bridge.walkEast-1.8]]){
    const driving=newExpedition(),rover=driving.rover,approach=bridge.north+10;
    Object.assign(rover,{x:start,z:approach,y:cityGround(start,approach),
      yaw:Math.PI/2,speed:0,driver:1});
    for(let step=0;step<180;step++)driveRover(driving,{throttle:1,steer:0},1/30);
    assert(rover.x<limit,`driving cannot pass the bridge guard at ${approach}`);
    assert(rover.contactSound,'the guard registers a vehicle impact');
  }
}
