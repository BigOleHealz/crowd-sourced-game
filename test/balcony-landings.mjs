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
