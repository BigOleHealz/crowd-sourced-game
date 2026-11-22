import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {residenceSpirals,spiralPoint,spiralCeiling}=await import('../public/residential-spirals.js');
const {newExpedition}=await import('../public/expedition.js');
const {stepPlayer}=await import('../public/world.js');
const {interiorPlans}=await import('../public/building-interiors.js');
const world=newExpedition();
for(const s of residenceSpirals){
  assert(!interiorPlans.find(p=>p.home===s.home).panels.length);
  const plan=interiorPlans.find(p=>p.home===s.home);
  const door=s.home.startsWith('harbor-')?plan.entrances[0]:null;
  let p={x:door?.x??s.x-s.r-.04,y:door?.y??s.ys[0],z:door?door.z-.5:s.z,grounded:true};
  const r=(s.r+s.inner)*.52;
  function go(x,z){
    for(let i=0;i<430;i++){
      const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.046)return;
      p=stepPlayer(p,{x:dx/d*Math.min(1,d*4),z:dz/d*Math.min(1,d*4)},1/60,world.hp,world);
      assert(p.grounded,s.home+' lost footing at '+[p.x,p.y,p.z]+' to '+[x,z]);
      assert(spiralCeiling(s,p.x,p.y,p.z)>p.y+1.81,s.home+' headroom');
    }
    assert.fail(s.home+' stuck at '+[p.x,p.y,p.z]+' to '+[x,z]);
  }
  if(door){go(door.x,s.z);go(s.x-s.r-.04,s.z);}
  go(s.x-r,s.z);
  for(let flight=0;flight<s.steps.length;flight++){
    for(let k=0;k<=36;k++){const q=spiralPoint(s,k/36,r);go(q.x,q.z);}
    go(s.x-r,s.z);assert(Math.abs(p.y-s.ys[flight+1])<.08,'upper landing');
    go(s.x-s.r-.15,s.z);
    assert(Math.abs(p.y-s.ys[flight+1])<.08,'floor exit');
    go(s.x-r,s.z);
  }
  for(let flight=s.steps.length-1;flight>=0;flight--){
    for(let k=36;k>=0;k--){const q=spiralPoint(s,k/36,r);go(q.x,q.z);}
    go(s.x-r,s.z);assert(Math.abs(p.y-s.ys[flight])<.08,'lower landing');
  }
  console.log(s.home+' walked actual upward and downward helix, '+s.steps.length+' flights');
}
