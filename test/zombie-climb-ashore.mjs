import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {zombieSurvival}=await import('../zombie-survival.js');
const {newExpedition}=await import('../public/expedition.js');
const {groundHeight,MAP}=await import('../public/world.js');
const {rivalView}=await import('../public/rivals.js');

for(const [x,z,dx] of [[43.45,32,-1],[67.45,-378,-1],[-68.45,-442,1]]){
  const world=newExpedition(),run=zombieSurvival(),infected=[];
  const survivor={id:1,inputs:[],lastSeq:0},players=new Map([[1,survivor]]);
  run.start(players,0);
  run.advance(players,infected,90,world);
  const zombie=infected[0],targetX=x+dx*2;
  Object.assign(survivor.state,{x:targetX,z,y:groundHeight(targetX,z,2)});
  zombie.state={x,y:MAP.waterY-.72,z,vy:0,grounded:false,swimming:true};
  let grabbed=false,landed=false;
  for(let tick=91;tick<160;tick++){
    run.advance(players,infected,tick,world);
    grabbed ||= Boolean(rivalView(zombie,tick).climb);
    landed ||= grabbed && zombie.state.grounded && zombie.state.y>MAP.waterY;
  }
  assert.ok(grabbed && landed,'infected climbs out at '+[x,z]);
}
