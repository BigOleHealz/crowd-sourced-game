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
      if(m.type==='welcome')guest.me=m.state;
      if(m.type==='snapshot')guest.frame=m;
      if(m.type==='full')guest.full=true;
    });
    await until(()=>guest.full || (guest.me && guest.frame));
    return guest;
  }
  const room='/world?map=brickell&mode=total-loss',group=[];
  for(let i=0;i<9;i++)group.push(await join(room));
  const watch=group[0];
  assert.equal(watch.frame.world.match.phase,'waiting');
  group.push(await join(room));
  await until(()=>watch.frame.world.match.phase==='active');
  assert.deepEqual(watch.frame.world.match.counts,{brickell:5,lantern:5});
  for(const g of group){
    g.ws.send(JSON.stringify({type:'input',seq:1,x:.6,z:0,yaw:0,team:'fake',score:5000000}));
  }
  await until(()=>watch.frame.players.every(p=>p.ack===1));
  assert.equal(watch.frame.world.match.winner,null);
  group.pop().ws.close();await until(()=>watch.frame.world.match.phase==='paused');
  for(let i=group.length;i<16;i++)group.push(await join(room));
  await until(()=>watch.frame.players.length===16);
  assert.deepEqual(watch.frame.world.match.counts,{brickell:8,lantern:8});
  assert.equal((await join(room)).full,true);
  for(const key of ['repo-wars','moving-day']){
    const other=await join('/world?map=brickell&mode='+key);
    assert.equal(other.frame.world.match.mode,key);assert.equal(other.frame.world.match.phase,'waiting');
    assert.equal(other.frame.players.length,1);
  }
  assert.equal((await join('/world?map=brickell')).frame.world.match,undefined);
  assert.equal((await join('/world')).frame.world.match,undefined);
  console.log('PASS ten concurrent players acknowledged input, lobbies isolated, pause and refill to 8v8, seventeenth refused, both sandboxes available.');
}finally{
  for(const ws of sockets)ws.terminate();
  server.kill();await once(server,'exit');
}
