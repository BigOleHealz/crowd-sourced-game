// Exercise two independent clients through the same path the map menu opens.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket from 'ws';

const server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const sockets=[];
async function until(read,ms=8000){
  const end=Date.now()+ms;
  while(Date.now()<end){const value=read();if(value)return value;await delay(30);}
  throw Error('Timed out: '+read.toString());
}
try{
  let log='';server.stdout.on('data',data=>log+=data);
  const address=await until(()=>log.match(/http:\/\/[^/\s]+/)?.[0]);
  async function join(path){
    const ws=new WebSocket(address.replace('http:','ws:')+path), guest={ws};
    sockets.push(ws);ws.on('message',data=>{
      const m=JSON.parse(data);
      if(m.type==='welcome')guest.id=m.id;
      if(m.type==='snapshot')guest.frame=m;
    });
    await until(()=>guest.frame && guest.id);
    return guest;
  }
  const path='/world?map=brickell&mode=zombies';
  const first=await join(path);
  const origin=first.frame.players[0];
  let seq=0;
  function soloInput() {
    first.ws.send(JSON.stringify({type:'input',seq:++seq,x:1,z:0,yaw:0,jump:true,fire:true,weapon:1}));
  }
  async function exerciseSolo() {
    const before=first.frame.players[0];
    soloInput();
    await until(()=>{
      const p=first.frame.players[0];
      return p.ack===seq && p.x>before.x && p.y>before.y && first.frame.world.shots.some(s=>s.shooter===p.id);
    });
    assert.equal(first.frame.players.length,1);
  }
  await exerciseSolo();
  assert.equal(first.frame.world.survival.phase,'lobby');
  assert.equal(first.frame.world.survival.score,0);
  assert.equal(first.frame.world.npcs.length,0);
  const start=()=>first.ws.send(JSON.stringify({type:'startSurvival'}));
  start();
  await until(()=>first.frame.world.survival.phase==='ready');
  assert.equal(first.frame.players[0].x,origin.x);
  assert.equal(first.frame.world.shots.length,0);
  await until(()=>first.frame.world.survival.phase==='active');
  await exerciseSolo();
  const second=await join(path);
  const regular=await join('/world?map=brickell');
  assert.equal(regular.frame.world.survival,undefined);
  await until(()=>first.frame.players.length===2);
  assert.equal(second.frame.world.survival.phase,'active');
  await until(()=>second.frame.world.npcs.some(z=>z.infected));
  // Shoot from the actual actor position through the normal carbine input path.
  const sequences=new Map([[first,seq],[second,0]]);
  const fire=setInterval(()=>{
    for(const guest of [first,second]){
      const frame=guest.frame, p=frame.players.find(a=>a.id===guest.id);
      if(!p?.hp)continue;
      const nearest=frame.world.npcs.filter(z=>z.hp).sort((a,b)=>
        Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
      if(!nearest)continue;
      const yaw=Math.atan2(nearest.x-p.x,p.z-nearest.z);
      sequences.set(guest,sequences.get(guest)+1);
      guest.ws.send(JSON.stringify({type:'input',seq:sequences.get(guest),x:0,z:0,yaw,aimYaw:yaw,aimPitch:0,weapon:1,fire:true}));
    }
  },35);
  try{
    await until(()=>first.frame.world.survival.wave>=2 && second.frame.world.survival.wave>=2,32000);
  }finally{clearInterval(fire);}
  assert.equal(first.frame.world.survival.score,600);
  assert.equal(second.frame.world.survival.kills,6);
  const late=await join(path);
  assert.equal(late.frame.world.survival.score,600);
  await until(()=>first.frame.world.survival.phase==='finished' && second.frame.world.survival.phase==='finished',36000);
  assert.deepEqual(first.frame.world.survival,second.frame.world.survival);
  assert(first.frame.players.every(p=>p.dead));
  assert.equal(regular.frame.world.survival,undefined);
  start();
  await until(()=>second.frame.world.survival.wave===1 && second.frame.world.survival.score===0);
  assert(second.frame.players.every(p=>p.hp===100));
  console.log('PASS co-op lobby, real shots, increasing waves, shared score, late join, squad wipe, replay and free-roam isolation');
}finally{
  for(const ws of sockets)ws.terminate();
  server.kill();await once(server,'exit');
}

// Isolate the last kill of a wave while one teammate is down.
process.env.PINEWATCH_MAP='brickell';
const {zombieSurvival}=await import('../zombie-survival.js');
const run=zombieSurvival();
const squad=new Map([1,2].map(id=>[id,{id,inputs:[],lastSeq:0}]));
run.start(squad,0);
const down=squad.get(2);
down.life.hp=0;
const actors=[];
for(let tick=0;tick<500 && run.state.wave===1;tick++){
  run.advance(squad,actors,tick,{hp:{}});
  for(const actor of actors)actor.life.hp=0;
}
assert.equal(run.state.wave,2);
assert.equal(down.life.hp,100);
assert.equal(run.state.score,600);

// Cross the old east construction line in both phases and take the horde
// to another island. Use normal movement and the same collision map as the server.
const {groundHeight,stepPlayer}=await import('../public/world.js');
for(const phase of ['lobby','active']){
  const world={hp:{},survival:{phase}};
  let feet={x:-12,z:-205,y:groundHeight(-12,-205),grounded:true,vy:0};
  for(let i=0;i<60;i++)feet=stepPlayer(feet,{x:1,z:0},1/30,world.hp,world);
  assert(feet.x>-10,'Survivor must cross the old east boundary in '+phase);
}
const traveling=zombieSurvival();
const player={id:1,inputs:[],lastSeq:0};
const travelers=new Map([[1,player]]);
traveling.start(travelers,0);
player.state={x:0,z:27,y:groundHeight(0,27),grounded:true,vy:0};
const infected=[], district={hp:{},survival:traveling.state};
for(let tick=0;tick<=90;tick++)traveling.advance(travelers,infected,tick,district);
assert(infected.length>0);
const distance=()=>Math.hypot(infected[0].state.x-player.state.x,infected[0].state.z-player.state.z);
const firstDistance=distance();
assert(firstDistance>=5 && firstDistance<=14,'New arrivals must spawn near the squad on Brickell');
for(let tick=91;tick<140;tick++)traveling.advance(travelers,infected,tick,district);
assert(distance()<firstDistance-1,'The horde must pursue outside Harbor Key');
console.log('PASS former boundary in lobby and active play, remote squad spawning and pursuit');
