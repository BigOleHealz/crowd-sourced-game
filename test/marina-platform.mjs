import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {stepPlayer,groundHeight,blocked,waterSurfaceAt}=await import('../public/world.js');
const {takeoffBoard}=await import('../public/estate-diving.js');
const {marinaPlatform:p,towerSlabs,inDivingLane}=await import('../public/marina-platform.js');
const world={doors:{},hp:{}};
let player={x:68,z:-419,y:groundHeight(68,-419),grounded:true,vy:0};
const move=cmd=>player=stepPlayer(player,cmd,1/30,world.hp,world);
function walk(x,z){
  for(let i=0;i<650;i++){
    const dx=x-player.x,dz=z-player.z,d=Math.hypot(dx,dz);
    if(d<.09){for(let i=0;i<5;i++)move({});return;}
    const speed=d<.34?.35:1;
    move({x:dx/d*speed,z:dz/d*speed});
  }
  assert.fail('Blocked on route to '+[x,z]+' at '+JSON.stringify(player));
}
walk(p.x,-419);walk(p.x,p.startZ+.5);
for(const flip of [false,true]){
  walk(p.x,p.tip+.58);
  assert.equal(takeoffBoard(player),p);
  assert.ok(Math.abs(player.y-waterSurfaceAt(p.x,p.tip,player.y)-10)<.001);
  assert.ok(blocked(p.x+p.width/2,p.deck,p.near-1,{},{}),'upper side rail supports player');
  move(flip?{flipDive:true}:{jump:true});
  assert.equal(player.dive.kind,'platform');
  assert.equal(player.dive.centerX,p.x);
  const startZ=player.z;
  for(let i=0;i<130 && player.dive;i++)move({jump:player.dive.time/player.dive.duration>.76 && player.dive.release==null});
  assert.ok(player.swimming && player.z<startZ-7.1);
  assert.equal(player.entryMark.kind,'platform');
  assert.equal(player.entryMark.judging.awards.length,7);
  assert.equal(player.entryMark.judging.code,flip?'103C':'101A');
  assert(player.entryMark.judging.points>35);
  assert.ok(inDivingLane(player.x,player.z));
  walk(p.exitX,p.exitEnd-.65);walk(p.exitX,p.exitZ+.8);
  assert.ok(player.grounded && !player.swimming,'swimmer climbs out normally');
  walk(p.exitX,p.startZ+.6);walk(p.x,p.startZ+.6);
}
assert.equal(towerSlabs.filter(s=>s.tread).length,48);
console.log('PASS dock approach, three stair flights, rail contact, ten metres above bay, straight/flip northward entries, swim lane, independent exit and repeat.');
