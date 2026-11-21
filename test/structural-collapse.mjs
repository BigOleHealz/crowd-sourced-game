import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {stepStructuralFalls,collapsePlan,piecePose}=await import('../public/structural-collapse.js');
const {MAP,groundHeight,stanceBodyHeight}=await import('../public/world.js');
const {breachTower}=await import('../public/tower-damage.js');
const {breachEstate}=await import('../public/estate-damage.js');
const {damageActor,newLife}=await import('../public/rivals.js');

for(const kind of ['tower','casa','mare']){
  const world=newExpedition(),doors=world.doors;
  if(kind==='tower'){
    const b=MAP.buildings[0];
    for(let i=0;i<16;i++)breachTower([b],doors,{x:b.x+b.w*((i%4+.5)/4-.5),y:2,z:b.z+b.d*((Math.floor(i/4)+.5)/4-.5)});
  }else{
    const [a,b,z]=kind==='casa'?[-38.4,-36.1,-384.34]:[11.5,14,-451];
    for(const x of [a,b])assert(breachEstate(doors,{x,y:2.12,z}));
  }
  const [event]=doors.structureFalls;
  const plan=collapsePlan(event,MAP.buildings);
  const piece=plan.pieces.find(p=>p.type!=='glass' && p.w>1 && p.d>1);
  assert(piece && plan.end>1);
  const actors=new Map();
  function actor(id,x,y,z){const a={id,state:{x,y,z},life:newLife(0,false),score:{deaths:0}};actors.set(id,a);return a;}
  const ground=groundHeight(piece.x,piece.z,piece.low-.5,doors);
  const caught=actor(1,piece.x,ground,piece.z),escape=actor(2,piece.x,ground,piece.z);
  const bystander=actor(3,piece.x+40,ground,piece.z);
  const above=actor(4,piece.x,100,piece.z);
  let died=0;
  for(let t=0;t<Math.ceil((plan.end+1)*30);t++){
    if(t===6)escape.state.x+=35;
    stepStructuralFalls(doors,MAP.buildings,actors,t,damageActor,stanceBodyHeight);
    if(!caught.life.hp && !died){
      died=t;
      const age=event.age/30,feet=caught.state;
      assert(plan.pieces.some(p=>{
        if(age<=p.delay || age>p.land+1/30)return false;
        const pose=piecePose(p,Math.min(p.land,age),{});
        return Math.abs(feet.x-pose.x)<p.w/2+.3 && Math.abs(feet.z-pose.z)<p.d/2+.3 &&
          feet.y+stanceBodyHeight()>=pose.low && feet.y<=piecePose(p,age-1/30,{}).low+p.h;
      }),'crush must coincide with a visible swept section');
      const replay=JSON.parse(JSON.stringify(event)),same=collapsePlan(replay,MAP.buildings);
      assert.deepEqual(same.pieces,plan.pieces,'joined spectators reconstruct the active geometry');
      caught.life=newLife(t,false); // Same session and hazard cannot double-count death after respawn.
    }
  }
  assert(died>6);assert.equal(caught.score.deaths,1);
  for(const survivor of [escape,bystander,above])assert.equal(survivor.life.hp,100);
  assert(!doors.structureFalls);assert(!newExpedition().doors.structureFalls);
  console.log(kind,'PASS',plan.pieces.length,'deterministic falling sections; contact tick',died,'; escaped, bystander, overhead, reset and late join');
}
