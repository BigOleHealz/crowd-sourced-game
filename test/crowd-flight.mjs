import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newRivals,updateRival,rivalView,newLife}=await import('../public/rivals.js');
const {newExpedition,fire}=await import('../public/expedition.js');
const {localWorldReactions}=await import('../public/pedestrian-reactions.js');
const {groundHeight}=await import('../public/world.js');
const w=newExpedition(),res=newRivals(),shooter={id:1,weapon:1,fireReady:0,life:newLife(0,false),state:{x:0,y:groundHeight(0,8),z:8}},
  people=new Map([[1,shooter]]);
const observer=res[0],route=observer.route,position={...observer.state};
const remote=res.find(p=>p.state.z< -200);
const officer={...observer,id:'test-officer',officer:true};
const driver={...observer,id:'test-driver'};w.traffic=[{id:'parked-car',x:59,z:60,y:1,yaw:0,npcDriver:driver.id}];
res.push(driver,officer);
fire(w,shooter,{aimYaw:0,aimPitch:.65},50,people,res);
localWorldReactions(w,res,50);
assert.equal(observer.reaction.type,'gunfire');assert(!officer.reaction && !driver.reaction && !remote.reaction);
let sprint=false,cry=false,maxTravel=0;
for(let tick=51;tick<375;tick++){
  if(tick===89)fire(w,shooter,{aimYaw:0,aimPitch:.65},tick,people,res);
  localWorldReactions(w,res,tick);updateRival(observer,tick,1/30,w.hp,w);
  const view=rivalView(observer,tick);
  sprint||=view.sprint===true;cry||=view.panicCry>0;
  maxTravel=Math.max(maxTravel,Math.hypot(observer.state.x-position.x,observer.state.z-position.z));
}
assert(sprint && cry && maxTravel>5);assert(!observer.reaction);assert.equal(observer.route,route);
assert(!w.panicCues.length);
const shot={id:1000,hit:true,hitKind:'npc',from:position,to:{...remote.state},tick:400};
w.shots=[shot];localWorldReactions(w,res,400);
assert.equal(remote.reaction.type,'gunfire','Bystanders near the victim react even when the shooter is distant');
console.log('Bystanders heard player fire, ran',maxTravel.toFixed(1),'metres, cried out and calmed; a remote witness responded to the impact.');
