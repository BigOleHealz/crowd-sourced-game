import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {homes,ruinedHouseAt}=await import('../public/residential-sites.js');
const {stepTank}=await import('../public/tank.js');
const {groundHeight,blocked,solidTopAt,MAP,stanceBodyHeight}=await import('../public/world.js');
const {collapsePlan,stepStructuralFalls,piecePose}=await import('../public/structural-collapse.js');
const {roadContact}=await import('../public/road-contact.js');
const {firstPaneHit}=await import('../public/rounds.js');
for(const h of homes)for(const dir of [-1,1]){
  const world=newExpedition(),tank=world.tank,base=h.parts[0],x=base.x-dir*(base.w/2+4.5),z=base.z;
  const driver={id:1,team:1,state:{x,y:.8,z},life:{hp:100,immuneUntil:0}};
  const outside={id:2,state:{x:base.x,y:.8,z:base.z+base.d+15},life:{hp:100,immuneUntil:0}};
  const players=new Map([[1,driver],[2,outside]]);
  let billed=0;world.rules={damageProperty:()=>billed++};
  Object.assign(tank,{x,z,y:groundHeight(x,z,1),yaw:dir*Math.PI/2,driver:1});
  assert(!roadContact(world,x,z,tank.yaw,x,z,tank),'Start outside '+h.id);
  let event,inside=false;
  for(let tick=0;tick<380;tick++){
    stepTank(world,{throttle:1},1/30,players);
    Object.assign(driver.state,{x:tank.x,z:tank.z,y:tank.y});
    if(!event && world.doors.structureFalls){
      event=world.doors.structureFalls[0];
      assert.equal(event.home,h.id);assert.equal(event.direction.x,dir);
      const plan=collapsePlan(event,MAP.buildings),copy=collapsePlan(structuredClone(event),MAP.buildings);
      assert.deepEqual(plan,copy);
      const walls=plan.pieces.filter(p=>p.type==='house-wall').sort((a,b)=>(a.x-b.x)*dir);
      assert(walls[0].delay+.12<walls.at(-1).delay,'Near facade moves before the far facade');
      const roof=plan.pieces.find(p=>p.type==='house-roof');
      const pose=piecePose(roof,roof.land,{});assert((pose.x-roof.x)*dir>.6);
    }
    if(Math.abs(tank.x-base.x)<1)inside=true;
    stepStructuralFalls(world.doors,MAP.buildings,players,tick,a=>{a.life.hp=0;return true;},stanceBodyHeight,tank.driver);
    if(inside && (tank.x-base.x)*dir>base.w/2+2.5 && !world.doors.structureFalls)break;
  }
  assert(event && inside && (tank.x-base.x)*dir>base.w/2+2.5,h.id+' tank enters and clears the far side');
  assert.equal(billed,1);assert.equal(tank.hp,750);assert.equal(driver.life.hp,100);assert.equal(outside.life.hp,100);
  assert(!world.doors.structureFalls);
  const doors=structuredClone(world.doors);
  assert.equal(ruinedHouseAt(doors,base.x,base.z).id,h.id);
  assert(groundHeight(base.x,base.z,Infinity,doors)<1);assert(solidTopAt(base.x,base.z,world.hp,0,Infinity,doors)<1);
  assert(!blocked(base.x,.84,base.z,world.hp,doors));
  assert(!firstPaneHit(world,{x:base.x-base.w/2-1,y:2.1,z:base.z},{x:base.w+2,y:0,z:0}).target);
}
console.log('PASS tanks traverse Casa Luma, Palazzo Mare and four Harbor Key homes from both sides; roof, collision, occupants, credit and late ruins agree');
