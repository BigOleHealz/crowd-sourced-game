import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {blocked,buildingTopAt,groundHeight,stepPlayer}=await import('../public/world.js');
const {newExpedition}=await import('../public/expedition.js');
const {doorX,storefrontDoors,storefrontRoom,storefrontCeiling,stepStorefrontDoors}=await import('../public/storefront-layout.js');

for(const door of storefrontDoors){
  const world=newExpedition(), dt=1/30;
  let p={x:-8.4,y:.8,z:door.z,grounded:true,vy:0};
  function move(x,z,ticks,jump=false){
    for(let i=0;i<ticks;i++){
      stepStorefrontDoors(world.doors,[p],dt);
      p=stepPlayer(p,{x,z,jump:jump && i===0},dt,world.hp,world);
    }
  }
  assert.equal(blocked(doorX,.824,door.z,world.hp,world.doors),true);
  move(-1,0,30);move(0,0,7);
  assert.equal(storefrontRoom(p.x,p.y,p.z)?.id,door.id);
  assert.ok(p.x < -12 && p.x > -13.35,'accessible floor behind entrance');
  assert.equal(p.y,groundHeight(p.x,p.z));
  move(0,0,30);
  assert.equal(world.doors[door.id],0,'closes when room occupant leaves approach');
  move(1,0,44);move(0,0,7);
  assert.ok(p.x> -8.5,'exit to sidewalk');
  move(0,0,60);
  assert.equal(storefrontRoom(p.x,p.y,p.z),null);
  for(let i=0;i<18;i++)stepStorefrontDoors(world.doors,[{x:doorX,y:.824,z:door.z}],dt);
  assert.equal(world.doors[door.id],1);
  assert.equal(blocked(doorX,.824,door.z,world.hp,world.doors),false);
  assert.equal(blocked(doorX,.824,door.z-1.4,world.hp,world.doors),true);
  assert.ok(buildingTopAt(doorX-.5,door.z)>20,'roof for aircraft');
  p={x:-11.75,y:.824,z:door.z,grounded:true,vy:0};
  let peak=p.y;
  for(let i=0;i<30;i++){move(0,0,1,i===0);peak=Math.max(peak,p.y);}
  assert.ok(peak>1.70 && peak<=storefrontCeiling-1.80+.0001,'ceiling stops a standing jump');
}
assert.ok(blocked(-13.67,.824,11.54,{}),'café counter');
assert.ok(blocked(-11.18,.824,4.10,{}),'café table');
assert.ok(blocked(-11.18,.824,4.79,{}),'café chair');
assert.ok(blocked(-13.67,.824,.68,{}),'concierge desk');
assert.ok(blocked(-14.98,.824,-.22,{}),'lobby chair');
assert.ok(blocked(-11.8,.824,2.41,{}),'partition');
assert.ok(blocked(-16.57,.824,.2,{}),'rear wall');
console.log('PASS both automatic entrances and exits, interior floor, glazing, walls, furniture, ceiling and roof.');
