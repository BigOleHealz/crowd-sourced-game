import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {MAP,stepPlayer}=await import('../public/world.js');
const {towerStories,towerBays}=await import('../public/tower-glass.js');
const {towerCell}=await import('../public/tower-damage.js');
for(const facade of [0,3]){
  const b=MAP.buildings.find(b=>b.housing && b.facade===facade);
  const {story}=towerStories(b,3.9),deck=4.74+story*2;
  const {bay}=towerBays(b.w,facade===0);
  const x=b.x-b.w/2+bay*.5,z=b.z+b.d/2+.61;
  const tick=(p,input={},doors={})=>stepPlayer(p,input,1/30,{}, {doors});
  let p={x,z,y:deck+1,vy:-8,grounded:false};
  for(let i=0;i<90;i++)p=tick(p);
  assert(p.grounded && Math.abs(p.y-deck)<.0001);
  const jumped=tick(p,{jump:true});assert(jumped.y>deck && !jumped.grounded);
  for(let i=0;i<8;i++)p=tick(p,{x:1});
  assert(p.grounded && p.x>x && Math.abs(p.y-deck)<.0001);
  const hole={towerBreaches:[towerCell(b,p.x,deck-.002,p.z)]};
  assert(tick(p,{},hole).y<deck);
  assert(tick(p,{},{collapsedTowers:[b.towerId]}).y<deck);
}
console.log('PASS fall, stand, walk and jump on both balcony styles, and fall through a destroyed slab');
const hotel=MAP.buildings.find(b=>b.towerId===9);
const {floors,story}=towerStories(hotel,3.9);
for(const floor of [0,Math.floor(floors/2),floors-1])for(const side of [-1,1]){
  const y=4.70+floor*story,z=hotel.z-2;
  let p={x:hotel.x+side*4.5,y,z,vy:0,grounded:true};
  for(let i=0;i<36;i++)p=stepPlayer(p,{x:side},1/30,{}, {doors:{}});
  assert(p.x*side>hotel.x*side+hotel.w/2+.45,'walk from room onto balcony');
  assert(p.grounded && Math.abs(p.y-y)<.001,'level balcony threshold');
  for(let i=0;i<36;i++)p=stepPlayer(p,{x:-side},1/30,{}, {doors:{}});
  assert(p.x*side<hotel.x*side+hotel.w/2-1,'walk back into hotel room');
  assert(p.grounded && Math.abs(p.y-y)<.001,'level room threshold');
}
console.log('PASS Hotel Maravela room to balcony and back without jumping');
