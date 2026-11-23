// Exercise the same seat prompts that keyboard and touch clients submit.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket from 'ws';

const server=spawn(process.execPath,['server.js'],{
  cwd:new URL('..',import.meta.url),env:{...process.env,HOST:'127.0.0.1',PORT:'0'},
  stdio:['ignore','pipe','inherit']
});
const sockets=[];
let log='';
server.stdout.on('data',chunk=>log+=chunk);
async function until(label,check) {
  const end=Date.now()+8000;
  while(Date.now()<end){const value=check();if(value)return value;await delay(25);}
  throw Error('Timed out waiting for '+label);
}
try {
  const address=await until('server',()=>log.match(/http:\/\/[^/\s]+/)?.[0]);
  async function join(){
    const ws=new WebSocket(address.replace('http:','ws:')+'/world?map=brickell&mode=zombies');
    sockets.push(ws);
    const client={ws,seq:0};
    ws.on('message',raw=>{
      const m=JSON.parse(raw);
      if(m.type==='welcome')client.id=m.id;
      if(m.type==='snapshot')client.frame=m;
    });
    await until('player spawn',()=>client.frame && client.id);
    return client;
  }
  const car=c=>c.frame.world.traffic.find(v=>v.id==='squad-sedan');
  const self=c=>c.frame.players.find(p=>p.id===c.id);
  function input(c,action){
    c.ws.send(JSON.stringify({type:'input',seq:++c.seq,x:0,z:0,yaw:0,...action}));
  }
  async function approach(c){
    const end=Date.now()+5000;
    while(Date.now()<end){
      const p=self(c),v=car(c);
      if(p.use?.target===v.id && p.use.role==='drive')return;
      const dx=v.x-p.x,dz=v.z-p.z,d=Math.max(1,Math.hypot(dx,dz));
      input(c,{x:dx/d,z:dz/d});await delay(34);
    }
    throw Error('Driver door never offered entry');
  }
  function interact(c){
    const use=self(c).use;
    input(c,{interact:true,useTarget:use.target,useRole:use.role});
  }
  async function drive(c,observer){
    await until('boarding animation to finish',()=>car(c).driver===c.id && !car(c).boarding);
    const {x,z}=car(c);
    for(let i=0;i<36;i++){input(c,{throttle:1});await delay(34);}
    await until('replicated driving',()=>car(observer).driver===c.id && Math.hypot(car(observer).x-x,car(observer).z-z)>2);
    const health=car(c).hp;
    input(c,{fire:true,sidearm:true,aimYaw:Math.PI/2,aimPitch:.3,throttle:1});
    await until('window pistol shot seen by observer',()=>observer.frame.world.shots.some(s=>
      s.weapon==='muzzle' && s.firedWeapon===2 && s.source===car(c).id && s.shooter===c.id));
    assert.equal(self(c).magazine.weapon,2);
    assert.equal(self(c).magazine.rounds,11);
    assert.equal(car(c).hp,health);
    input(c,{reload:true,sidearm:true});
    await until('driver reload',()=>self(c).magazine.rounds===12);
    assert.equal(self(c).use.role,'exit');
    interact(c);
    await until('exit seen by observer',()=>car(observer).driver==null);
  }
  const solo=await join();
  await approach(solo);interact(solo);
  await drive(solo,solo);
  solo.ws.send(JSON.stringify({type:'startSurvival'}));
  await until('wave one',()=>solo.frame.world.survival.phase==='active');
  const friend=await join();
  await Promise.all([approach(solo),approach(friend)]);
  interact(solo);interact(friend);
  await until('one shared driver',()=>car(solo).driver!=null && car(solo).driver===car(friend).driver);
  const [driver,observer]=car(solo).driver===solo.id?[solo,friend]:[friend,solo];
  await drive(driver,observer);
  assert.equal(observer.frame.world.survival.phase,'active');
  console.log('PASS solo lobby and active co-op driving, exclusive seats, boarding, movement and exit');
} finally {
  for(const ws of sockets)ws.terminate();
  server.kill();
  await once(server,'exit');
}
