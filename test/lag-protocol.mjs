import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket from 'ws';
const port=24000+process.pid%10000;
const host=spawn(process.execPath,['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),GOY_THEFT_AUTO_MAP:'outpost'},stdio:['ignore','pipe','pipe']});
let log='';host.stdout.on('data',data=>log+=data);host.stderr.on('data',data=>log+=data);
const wait=async f=>{for(let i=0;i<500;i++){if(f())return;await delay(10);}throw Error('Timed out: '+log);};
const peers=[];
try{
 await wait(()=>log.includes('listening'));
 for(let i=0;i<2;i++){
  const ws=new WebSocket('ws://127.0.0.1:'+port+'/world'),messages=[];
  peers.push({ws,messages});ws.on('message',raw=>messages.push(JSON.parse(raw)));
  await wait(()=>messages.some(m=>m.type==='snapshot'));
 }
 assert(peers.every(p=>!p.messages.some(m=>m.type==='diagnostics')));
 const a=peers[0];a.ws.send(JSON.stringify({type:'diagnostics',enabled:true}));
 a.ws.send(JSON.stringify({type:'input',seq:1,x:0,z:1,yaw:0}));
 a.ws.send(JSON.stringify({type:'diagnosticPing',at:1234}));
 await wait(()=>a.messages.some(m=>m.type==='diagnostics'&&m.ack===1));
 await wait(()=>a.messages.some(m=>m.type==='diagnosticPong'));
 const m=a.messages.findLast(m=>m.type==='diagnostics');
 assert.equal(m.received,1);assert(m.tick>=0&&m.now>0&&m.run);assert(m.collision.calls>=0);
 const pong=a.messages.find(m=>m.type==='diagnosticPong');assert.equal(pong.at,1234);assert.equal(pong.run,m.run);
 assert(!peers[1].messages.some(m=>m.type==='diagnostics'),'telemetry is only sent to opted-in peers');
 a.ws.send(JSON.stringify({type:'diagnostics',enabled:false}));await delay(150);a.messages.length=0;await delay(150);
 assert(!a.messages.some(m=>m.type==='diagnostics'));
 console.log('PASS diagnostics opt in per peer, tick/input correlation, ping echo and opt out');
}finally{
 for(const p of peers)p.ws.terminate();
 const exited=once(host,'exit');host.kill();await exited;
}
