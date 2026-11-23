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
  const fire=setInterval(()=>{
    const frame=first.frame, p=frame.players.find(a=>a.id===first.id);
    const z=frame.world.npcs.find(a=>a.hp);
    if(!z || !p.hp)return;
    const yaw=Math.atan2(z.x-p.x,p.z-z.z);
    first.ws.send(JSON.stringify({type:'input',seq:++seq,x:0,z:0,yaw,aimYaw:yaw,aimPitch:0,weapon:1,fire:true}));
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
