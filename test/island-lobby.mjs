// Use a private instance so the test can fill a room and verify the capacity limit.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket from 'ws';

const server=spawn(process.execPath,[new URL('../server.js',import.meta.url).pathname],{
  env:{...process.env,PORT:'0',HOST:'127.0.0.1'},stdio:['ignore','pipe','inherit'],
});
const sockets=[];
async function until(check){
  for(let i=0;i<250;i++){if(check())return;await delay(20);}
  throw Error('timed out waiting for lobby state');
}
try{
  let output='';server.stdout.on('data',buf=>output+=buf);
  await until(()=>output.includes('http://'));
  const host=output.match(/http:\/\/[^/]+/)[0].replace('http:','ws:');
  async function join(path){
    const ws=new WebSocket(host+path),guest={ws};
    sockets.push(ws);ws.on('message',raw=>{
      const m=JSON.parse(raw);
      if(m.type==='welcome'){guest.me=m.state;guest.initialWorld=m.world;}
      if(m.type==='snapshot')guest.frame=m;
      if(m.type==='full')guest.full=true;
    });
    await until(()=>guest.full || (guest.me && guest.frame));
    return guest;
  }
  const room='/world?map=brickell&mode=total-loss',group=[];
  group.push(await join(room));
  const watch=group[0];
  async function exerciseSolo(seq){
    await until(()=>watch.frame.world.match.phase==='practice');
    const before=watch.frame.players[0];
    watch.ws.send(JSON.stringify({type:'input',seq,x:1,z:0,yaw:0,weapon:1,fire:true}));
    await until(()=>watch.frame.players[0].ack===seq && watch.frame.world.shots.some(e=>e.shooter===before.id));
    assert(watch.frame.players[0].x>before.x);
    assert.deepEqual(watch.frame.world.match.scores,{brickell:0,lantern:0});
  }
  await exerciseSolo(1);
  group.push(await join(room));
  await until(()=>watch.frame.world.match.phase==='active');
  assert.deepEqual(watch.frame.world.match.counts,{brickell:1,lantern:1});
  const competitive=watch.frame.players.find(p=>p.id===watch.me.id);
  assert.equal(competitive.x,watch.me.x);
  assert.equal(competitive.weapon,4);
  group.pop().ws.close();await exerciseSolo(2);
  group.push(await join(room));await until(()=>watch.frame.world.match.phase==='active');
  assert.equal(watch.frame.players.find(p=>p.id===watch.me.id).x,competitive.x);
  for(let i=group.length;i<10;i++)group.push(await join(room));
  for(const g of group){
    g.ws.send(JSON.stringify({type:'input',seq:3,x:.6,z:0,yaw:0,team:'fake',score:5000000}));
  }
  await until(()=>watch.frame.players.every(p=>p.ack===3));
  assert.equal(watch.frame.world.match.winner,null);
  group.pop().ws.close();await until(()=>watch.frame.players.length===9);
  assert.equal(watch.frame.world.match.phase,'active');
  for(let i=group.length;i<16;i++)group.push(await join(room));
  await until(()=>watch.frame.players.length===16);
  assert.deepEqual(watch.frame.world.match.counts,{brickell:8,lantern:8});
  assert.equal((await join(room)).full,true);
  for(const key of ['repo-wars','moving-day']){
    const other=await join('/world?map=brickell&mode='+key);
    assert.equal(other.frame.world.match.mode,key);assert.equal(other.frame.world.match.phase,'waiting');
    assert.equal(other.frame.players.length,1);
  }
  const district='/world?map=brickell',first=await join(district);
  assert.equal(first.frame.world.match,undefined);
  const initialPod=first.initialWorld.dolphins;
  await until(()=>first.frame.world.dolphins[0].yaw!==initialPod[0].yaw);
  const closed=once(first.ws,'close');first.ws.close();await closed;
  await delay(450);
  const rejoined=await join(district);
  assert.deepEqual(rejoined.initialWorld.dolphins,initialPod,'Reset wildlife waits for the next guest');
  await until(()=>rejoined.frame.world.dolphins[0].yaw!==initialPod[0].yaw);
  assert.equal((await join('/world')).frame.world.match,undefined);
  console.log('PASS Total Loss starts at 1v1, pauses on an empty team, resumes, accepts ten concurrent inputs, fills to 8v8, seventeenth refused, both sandboxes available.');
}finally{
  for(const ws of sockets)ws.terminate();
  server.kill();await once(server,'exit');
}
