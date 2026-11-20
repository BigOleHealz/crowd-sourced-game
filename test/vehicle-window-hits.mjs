import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,fire,advanceRounds}=await import('../public/expedition.js');
const {yachtPoint}=await import('../public/yacht-layout.js');
const w=newExpedition(),people=new Map();
function fireAcross(x,y,z,yaw){
  const shooter={id:7,state:{x,y:y-1.3,z},weapon:1,life:{hp:100},fireReady:0};
  fire(w,shooter,{aimYaw:yaw,aimPitch:0},0,people,[]);
  for(let tick=0;tick<8;tick++)advanceRounds(w,people,[],tick);
}
for(const [kind,height,aft] of [['rover',1.30,0],['supercar',.94,.15],['heli',1.71,-1.10]]){
  const v=w[kind];Object.assign(v,{x:0,y:30,z:0,yaw:0,pitch:0,roll:0});
  fireAcross(5,30+height,aft,-Math.PI/2);
  assert(Object.keys(v.brokenGlass??{}).length===1,kind+' side window shatters');
  v.x=55;
}
const y=w.yacht,from=yachtPoint(y,7.2,3.8,-5);
fireAcross(from.x,from.y,from.z,y.yaw-Math.PI/2);
assert.equal(Object.keys(y.brokenGlass??{}).length,1,'yacht salon window shatters');
assert.equal(w.doors.glassSounds.length,4);
console.log('PASS replicated pane damage and shatter events on truck, GT, Black Hawk and yacht');
