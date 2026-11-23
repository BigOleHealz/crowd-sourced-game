import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';
import { magazineSpecs, magazineView, spendRound, startReload, advanceReload } from '../public/magazines.js';

for (const [id, spec] of Object.entries(magazineSpecs)) {
  const p = { weapon: Number(id), life: {} };
  for (let i=0; i<spec.capacity; i++) assert(spendRound(p));
  assert.equal(spendRound(p), false);
  startReload(p, 100);
  startReload(p, 101);
  advanceReload(p, 100 + spec.reloadTicks - 1, false);
  assert.equal(spendRound(p), false);
  assert.equal(magazineView(p, 100 + spec.reloadTicks - 1).reloadTicks, 1);
  advanceReload(p, 100 + spec.reloadTicks, false);
  assert.equal(magazineView(p, 100 + spec.reloadTicks).rounds, spec.capacity);
}
const server=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0'},stdio:['ignore','pipe','inherit']});
const clients=[];
async function until(read, description) {
  const deadline=Date.now()+10000;
  while(Date.now()<deadline) { if(read())return; await delay(20); }
  throw Error('Timed out waiting for '+description);
}
try {
  let output='';
  server.stdout.on('data',s=>output+=s);
  await until(()=>output.includes('http://'),'server');
  const address=output.match(/http:\/\/[^\s/]+/)[0].replace('http:','ws:')+'/world?map=brickell&mode=zombies';
  async function join() {
    const ws=new WebSocket(address),client={ws,seq:0};
    clients.push(client);
    ws.on('message',data=>{
      const m=JSON.parse(data);
      if(m.type==='welcome')client.id=m.id;
      if(m.type==='snapshot')client.frame=m;
    });
    await until(()=>client.frame && client.id,'connection');
    return client;
  }
  const a=await join(), b=await join();
  const state=(watch=a, id=a.id)=>watch.frame.players.find(p=>p.id===id);
  const input=(weapon,extra={})=>a.ws.send(JSON.stringify({type:'input',seq:++a.seq,x:0,z:0,yaw:0,weapon,...extra}));
  const m=()=>state().magazine;
  const capacity=magazineSpecs[3].capacity;
  const held=setInterval(()=>input(3,{fire:true,aimPitch:1}),40);
  try{
    await until(()=>m().weapon===3 && m().rounds===0,'empty scoped rifle');
    const emptyAt=a.frame.simTick;
    await until(()=>a.frame.simTick>emptyAt+45,'held trigger past cooldown');
    assert.equal(m().rounds,0);
    assert(!a.frame.world.shots.some(s=>s.shooter===a.id && s.tick>emptyAt),'an empty gun cannot fire');
  }finally{clearInterval(held);}
  input(3,{reload:true,fire:true});
  await until(()=>m().reloadTicks>0,'reload begins');
  input(2);
  await until(()=>m().weapon===2,'switch away');
  input(3);
  await until(()=>m().weapon===3,'switch back');
  assert.equal(m().rounds,0);
  assert.equal(m().reloadTicks,undefined);
  assert.equal(state(b,b.id).magazine.rounds,magazineSpecs[1].capacity);
  input(3,{reload:true});
  await until(()=>state(b)?.magazine.reloadTicks>0,'peer sees reload');
  await until(()=>state(b)?.magazine.rounds===capacity,'peer sees full magazine');
  input(3,{fire:true});
  await until(()=>m().rounds===capacity-1,'first shot after reload');
  a.ws.send(JSON.stringify({type:'startSurvival'}));
  await until(()=>a.frame.world.survival.phase==='ready','new run');
  assert.equal(m().rounds,magazineSpecs[1].capacity);
  input(3);
  await until(()=>m().weapon===3,'reselect scoped rifle in new run');
  assert.equal(m().rounds,capacity);
  console.log('PASS all capacities, last round, held trigger, timed reload, switch cancellation, independent player magazines and fresh run');
} finally {
  for(const c of clients)c.ws.terminate();
  server.kill();await once(server,'exit');
}
