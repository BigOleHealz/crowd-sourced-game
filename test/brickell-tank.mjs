import assert from 'node:assert/strict';
import {startReload,advanceReload,magazineSpecs} from '../public/magazines.js';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
if(!process.env.TANK_MAP_CHECK){
  for(const map of ['brickell','outpost']){
    const r=spawnSync(process.execPath,[fileURLToPath(import.meta.url)],{env:{...process.env,TANK_MAP_CHECK:'1',PINEWATCH_MAP:map},stdio:'inherit'});
    assert.equal(r.status,0);
  }
}else{
  const {newExpedition,fireTank,advanceMissiles,fire,advanceRounds}=await import('../public/expedition.js');
  const {nearTank,stepTank,leaveTank}=await import('../public/tank.js');
  const {tankMuzzle,tankPad}=await import('../public/tank-layout.js');
  const {roadContact}=await import('../public/road-contact.js');
  const {newLife}=await import('../public/rivals.js');
  const w=newExpedition(),t=w.tank;
  if(process.env.PINEWATCH_MAP==='outpost'){assert.equal(t,undefined);console.log('PASS no tank on Outpost');}
  else{
    const p={id:1,life:newLife(0,false),state:{x:t.x-2,y:t.y,z:t.z,grounded:true},score:{kills:0,deaths:0}};
    const other={id:2,life:newLife(0,false),state:{...p.state},score:{kills:0,deaths:0}};
    const players=new Map([[p.id,p],[other.id,other]]);
    assert(nearTank(t,p.state));assert(!roadContact(w,t.x,t.z,0,t.x,t.z,t));
    t.driver=p.id;assert(!nearTank(t,other.state),'the rear roof seat is gone');
    fireTank(w,other,0);assert.equal(w.missiles.length,0);
    for(let n=0;n<15;n++)stepTank(w,{throttle:1,steer:.25,aimYaw:Math.PI/2,aimPitch:.12},1/30);
    assert(t.z<tankPad.z && t.yaw>0 && t.speed<2);assert.equal(t.turretYaw,Math.PI/2);
    fireTank(w,p,1);fireTank(w,p,2);assert.equal(w.missiles.length,1);
    const shot=w.missiles[0],origin=tankMuzzle(t);
    assert(Math.abs(origin.x-shot.x)<1e-8 && shot.source==='tank');
    advanceMissiles(w,players,[],3);assert(shot.x>origin.x && Math.abs(shot.z-origin.z)<1e-8);
    fireTank(w,p,39);assert.equal(w.missiles.length,2);
    p.weapon=1;p.fireReady=0;other.weapon=1;other.fireReady=0;
    other.state={x:t.x,y:t.y,z:t.z+5,grounded:true};
    for(let n=0;n<10;n++){
      fire(w,other,{aimYaw:0,aimPitch:0},100+n,players,[]);
      advanceRounds(w,players,[],100+n);
    }
    assert(t.hp<t.maxHp && p.life.hp===100,'hull protects seated driver');
    const hp=t.hp;
    other.weapon=4;other.fireReady=0;fire(w,other,{aimYaw:0,aimPitch:0},150,players,[]);
    for(let n=0;n<10;n++)advanceMissiles(w,players,[],151+n);
    assert.equal(t.hp,hp-500);
    const ready=160+magazineSpecs[4].reloadTicks;
    startReload(other,160);advanceReload(other,ready,false);
    fire(w,other,{aimYaw:0,aimPitch:0},ready,players,[]);
    for(let n=0;n<10;n++)advanceMissiles(w,players,[],ready+1+n);
    assert(t.wrecked && t.driver==null);
    assert(Math.hypot(p.state.x-t.x,p.state.z-t.z)>1.4);
    for(let n=0;n<280;n++)stepTank(w,null,1/30);
    assert(!t.wrecked && t.hp===750 && t.x===tankPad.x && t.z===tankPad.z);
    t.driver=p.id;assert(leaveTank(w,p) && t.driver==null);
    console.log('PASS Brickell tank seats, tracks, turret-directed cooldown, incoming bullets/launcher, ejection and recovery.');
  }
}
