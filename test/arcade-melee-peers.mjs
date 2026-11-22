import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import WebSocket from 'ws';
import {sampleRanger,J} from '../public/ragdoll.js';
import {stanceMuzzleHeight} from '../public/world.js';
import {meleeItems} from '../public/arcade-melee.js';

async function waitFor(read,label){
  for(let i=0;i<320;i++){
    const value=read();
    if(value)return value;
    await delay(20);
  }
  throw Error('Timed out waiting for '+label);
}
for(const map of ['outpost','brickell']){
  const server=spawn(process.execPath,['server.js'],{cwd:fileURLToPath(new URL('..',import.meta.url)),
    env:{...process.env,HOST:'127.0.0.1',PORT:'0',PINEWATCH_MAP:map,PINEWATCH_MODE:''},stdio:['ignore','pipe','inherit']});
  const closed=once(server,'close'),guests=[];
  try{
    let log='';
    server.stdout.on('data',chunk=>log+=chunk);
    const address=await waitFor(()=>log.match(/http:\/\/127\.0\.0\.1:(\d+)/),'isolated server');
    async function join(){
      const ws=new WebSocket('ws://127.0.0.1:'+address[1]+'/world'),guest={ws,seq:0};
      guests.push(guest);
      ws.on('message',raw=>{
        const msg=JSON.parse(raw);
        if(msg.type==='welcome')guest.id=msg.id;
        if(msg.type==='snapshot')guest.snapshot=msg;
      });
      await waitFor(()=>guest.snapshot,'guest snapshot');
      return guest;
    }
    const a=await join(),b=await join();
    const actor=(g,id)=>g.snapshot.players.find(p=>p.id===id);
    await waitFor(()=>actor(a,b.id) && !actor(b,b.id).protected,'spawn protection to expire');
    const send=(slot,fire,aim={})=>a.ws.send(JSON.stringify({type:'input',seq:++a.seq,weapon:slot,fire,yaw:Math.PI/2,aimYaw:Math.PI/2,x:0,z:0,...aim}));
    let health=100;
    for(const [number,item] of Object.entries(meleeItems)){
      const slot=Number(number);
      send(slot,false);
      await waitFor(()=>actor(b,a.id).weapon===slot,'remote equip');
      send(slot,true);
      await waitFor(()=>actor(a,a.id).meleeSwing?.weapon===slot && actor(b,a.id).meleeSwing?.weapon===slot,'both views of the swing');
      health-=item.damage;
      await waitFor(()=>actor(a,b.id).hp===health && actor(b,b.id).hp===health,'authoritative damage');
      const swing=actor(b,a.id).meleeSwing;
      assert(swing.hit && swing.contact && swing.hitTick===swing.tick+item.windup);
      assert.deepEqual(actor(a,a.id).meleeSwing,swing);
      assert(!b.snapshot.world.bullets.length && !b.snapshot.world.missiles.length);
      await waitFor(()=>b.snapshot.simTick>swing.endTick,'completed recovery');
      assert.equal(actor(b,b.id).hp,health);
      console.log(map,item.name,'both guests saw swing',swing.seq,'and HP',health);
    }
    const attacker=actor(a,a.id),victim=actor(a,b.id);
    const model={...victim,state:victim,life:{hp:victim.hp}};
    sampleRanger(model,1/30,a.snapshot.world);
    const point=model.hitPose.joints[J.kneeL];
    const dx=point.x-attacker.x,dy=point.y-attacker.y-stanceMuzzleHeight(attacker),dz=point.z-attacker.z;
    send(8,true,{aimYaw:Math.atan2(dx,-dz),aimPitch:Math.atan2(dy,Math.hypot(dx,dz))});
    await waitFor(()=>actor(b,a.id).meleeSwing?.severed && actor(a,a.id).meleeSwing?.severed,'sword joint feedback');
    const struck=actor(b,a.id).meleeSwing;
    assert.equal(struck.hitPart,'leftLeg');
    for(const viewer of guests){
      assert.deepEqual(actor(viewer,a.id).meleeSwing,struck);
      assert.equal(actor(viewer,b.id).lostParts.leftLeg.tick,struck.hitTick);
    }
    console.log(map,'both guests confirmed',struck.hitPart,'at tick',struck.hitTick);
    send(235,false);
    await waitFor(()=>actor(b,a.id).ack===a.seq,'invalid selection acknowledged');
    assert.equal(actor(b,a.id).weapon,Number(Object.keys(meleeItems).at(-1)));

    const both=predicate=>guests.every(g=>predicate(actor(g,a.id)));
    for(let slot=1;slot<=8;slot++){
      send(slot,false);
      await waitFor(()=>both(p=>p.weapon===slot && p.ack===a.seq),'both loadouts');
      send(slot,true,{holster:true,tracking:true});
      await waitFor(()=>both(p=>p.holstered && !p.meleeSwing && !p.launcherLock),'both holsters');
      send(slot%8+1,true,{tracking:true});
      await waitFor(()=>both(p=>p.ack===a.seq && p.holstered && p.weapon===slot),'preserved selection');
      send(slot,true,{holster:false,tracking:true});
      await waitFor(()=>both(p=>p.ack===a.seq && !p.holstered && !p.meleeSwing && !p.launcherLock),'draw with trigger held');
      send(slot,true);
      await waitFor(()=>both(p=>p.ack===a.seq && !p.meleeSwing),'held trigger stays gated');
      assert(!b.snapshot.world.shots.some(s=>s.shooter===a.id));
      assert(!b.snapshot.world.bullets.some(s=>s.shooter===a.id));
      assert(!b.snapshot.world.missiles.some(s=>s.shooter===a.id));
      assert(!b.snapshot.world.throwables?.some(s=>s.shooter===a.id));
      send(slot,false);
      await waitFor(()=>both(p=>p.ack===a.seq),'trigger release');
    }
    send(8,true,{aimYaw:-Math.PI/2});
    await waitFor(()=>both(p=>p.meleeSwing?.weapon===8),'fresh swing after release');
    assert.equal(actor(b,b.id).hp,8);
    console.log(map,'two clients confirmed put away/draw for slots 1–8, blocked held fire and resumed after release');
  }finally{
    for(const guest of guests)guest.ws.terminate();
    server.kill();await closed;
  }
}
