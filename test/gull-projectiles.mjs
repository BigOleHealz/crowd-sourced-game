import assert from 'node:assert/strict';

process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition,fire,advanceRounds,advanceMissiles,tracePulse}=await import('../public/expedition.js');
const {createGulls}=await import('../public/gull-flight.js');
const {segmentContact,firearmSpecs}=await import('../public/rounds.js');
const {newLife}=await import('../public/rivals.js');
const {berthDeckY,marinaFingers}=await import('../public/marina-docks.js');
const {MAP,stanceMuzzleHeight}=await import('../public/world.js');

const dt=1/30;
function setup(weapon) {
  const world=newExpedition(),flock=createGulls();
  world.gulls=flock.state;
  const pier=marinaFingers[0];
  const state={x:pier.east-.4,y:berthDeckY,z:pier.z,grounded:true};
  const player={id:1,weapon,state,life:newLife(0,false),fireReady:0};
  const peers=new Map([[player.id,player]]);
  const from={...state,y:state.y+stanceMuzzleHeight(state)};
  return {world,flock,player,peers,from};
}

function aim(from,to) {
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
  const length=Math.hypot(dx,dy,dz);
  return {dir:{x:dx/length,y:dy/length,z:dz/length},
    input:{aimYaw:Math.atan2(dx,-dz),aimPitch:Math.atan2(dy,Math.hypot(dx,dz))}};
}

{
  // Aim ahead of a moving gull using its ordinary East Quay route. The
  // carbine round must actually intercept it several simulation ticks later.
  const {world,player,peers,flock,from}=setup(1);
  const forecast=createGulls(),step=firearmSpecs[1].speed*dt;
  let intercept;
  for(let tick=1;tick*step<=firearmSpecs[1].range && !intercept;tick++){
    forecast.step(dt);
    for(const [index,bird] of forecast.state.entries()){
      const dist=Math.hypot(from.x-bird.x,from.y-bird.y,from.z-bird.z);
      if(dist<=(tick-1)*step || dist>tick*step)continue;
      intercept={index,input:aim(from,bird).input,tick};
      break;
    }
  }
  assert(intercept,'At least one flying gull is within range from the public dock');
  fire(world,player,intercept.input,0,peers,[]);
  for(let t=1;t<=intercept.tick+1 && world.bullets.length;t++){
    flock.step(dt);
    advanceRounds(world,peers,[],t);
  }
  const victim=flock.state[intercept.index];
  assert.equal(world.shots.at(-1).hitKind,'gull');
  assert.equal(victim.hp,0);
  assert.equal(victim.deathKind,'shot');
  assert.equal(victim.hitSeq,1);
}

{
  const {world,player,peers,from}=setup(1);
  const bird=world.gulls[0];
  Object.assign(bird,{x:from.x+13,y:from.y+3,z:from.z});
  const view=aim(from,bird);
  assert.equal(tracePulse(world,[],from,view.dir,30,false).target,bird);
  Object.assign(world.heli,{x:from.x+6.5,y:from.y+.5,z:from.z});
  assert.equal(tracePulse(world,[],from,view.dir,30,false).target,world.heli);
  fire(world,player,view.input,0,peers,[]);
  for(let t=1;t<25 && world.bullets.length;t++)advanceRounds(world,peers,[],t);
  assert.equal(world.shots.at(-1).hitKind,'heli');
  assert.equal(bird.hp,bird.maxHp);
}

{
  const {world,player,peers,from}=setup(4);
  const [direct,near,far]=world.gulls;
  Object.assign(direct,{x:from.x+12,y:from.y+3,z:from.z});
  Object.assign(near,{x:direct.x,y:direct.y+1,z:direct.z+1});
  Object.assign(far,{x:direct.x,y:direct.y,z:direct.z+8});
  fire(world,player,aim(from,direct).input,0,peers,[]);
  for(let t=1;t<30 && world.missiles.length;t++)advanceMissiles(world,peers,[],t);
  assert.equal(world.shots.at(-1).hitKind,'gull');
  for(const bird of [direct,near]){
    assert.equal(bird.hp,0);assert.equal(bird.hitSeq,1);assert.equal(bird.deathKind,'blast');
  }
  assert.equal(far.hp,far.maxHp);
}

{
  const {world}=setup(1);
  // A flock overhead doesn't change surface contact for a world without swimmers.
  const from={x:96,z:-431,y:MAP.waterY+.5,weapon:1};
  const hit=segmentContact(world,from,{x:0,y:-1,z:0},[],new Map());
  assert.equal(hit.hitKind,'scenery');assert(Math.abs(hit.t-.5)<.01);
}
console.log('PASS moving gull interception, occlusion, missile feathers and unaltered water surface.');
