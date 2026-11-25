import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {stepBoat,nearBoat,interactBoat,damageBoat}=await import('../public/patrol-boats.js');
const {groundHeight,MAP}=await import('../public/world.js');
const world=newExpedition(),boat=world.boats[1],home={...boat};
const x=home.x-3.3;
const player={id:7,state:{x,y:groundHeight(x,home.z),z:home.z,grounded:true}};
const crew=new Map([[player.id,player]]);
assert(player.state.y>MAP.waterY-.72);
for(let departure=0;departure<2;departure++){
  assert.equal(nearBoat(world,player.state),boat);
  interactBoat(world,boat,player);
  for(let i=0;i<90;i++)stepBoat(world,boat,{throttle:1},1/30,crew);
  assert(boat.x>home.x+2 && boat.z<home.z-16 && boat.speed>8);
  const yaw=boat.yaw;
  for(let i=0;i<30;i++)stepBoat(world,boat,{throttle:1,steer:1},1/30,crew);
  assert(Math.abs(boat.yaw-yaw)>.4);
  damageBoat(world,boat,boat.hp,crew);
  for(let i=0;i<180;i++)stepBoat(world,boat,{},1/30,crew);
  assert.deepEqual([boat.x,boat.z,boat.yaw,boat.hp],[home.x,home.z,home.yaw,300]);
  player.state={x,y:groundHeight(x,home.z),z:home.z,grounded:true};
}
console.log('PASS beach boarding, two powered offshore departures, turn and fresh oriented recovery.');
