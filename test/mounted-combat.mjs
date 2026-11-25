import assert from 'node:assert/strict';
import {newExpedition, fire, firePilotGuns, fireTurret, advanceRounds, launchMissile, advanceMissiles, tracePulse} from '../public/expedition.js';
import {mountPosition,mounts,gunnerFeet} from '../public/mounts.js';
import {roadSeat,roadCabin} from '../public/road-cabin.js';
import {humveePassengerSeat} from '../public/humvee-layout.js';
import {CITY} from '../public/world.js';
import {newLife} from '../public/rivals.js';

{
  const rover=newExpedition().rover;
  Object.assign(rover,{x:4,y:0,z:8,yaw:0,gunner:2,turretYaw:Math.PI/2});
  assert.deepEqual(roadSeat(rover,2),humveePassengerSeat);
  assert.deepEqual(gunnerFeet(rover,'rover'),mountPosition(rover,humveePassengerSeat));
  assert.notDeepEqual(roadSeat(rover,1),humveePassengerSeat,'the driver keeps the driving seat');
  assert.ok(humveePassengerSeat[1]+1.525*roadCabin(rover).scale<2.02,'the passenger head stays below the Humvee roof');
  assert.notDeepEqual(gunnerFeet(rover,'rover'),mountPosition(rover,mounts.rover.turret),'the passenger does not stand at the gun');
}

for(const kind of ['rover','heli']){
  const world=newExpedition(),v=world[kind],operator=kind==='heli'?'pilot':'driver';
  Object.assign(v,{x:0,y:15,z:0,yaw:Math.PI/2,[operator]:1,gunner:2,turretYaw:Math.PI,turretPitch:0});
  const pivot=mountPosition(v,mounts[kind].turret);
  const crew={id:2,life:newLife(0,false),state:{...pivot}};
  const target={id:'rival-test',life:newLife(0,false),state:{x:pivot.x,y:pivot.y-1.25,z:pivot.z+5}};
  const players=new Map([[2,crew]]);
  fireTurret(world,kind,crew,0,players,[target]);
  assert.equal(target.life.hp,100);
  for(let tick=0;tick<4;tick++)advanceRounds(world,players,[target],tick);
  const chain=CITY && kind==='heli';
  assert.equal(target.life.hp,chain ? 32 : 66,'each traveling turret round deals 34 damage');
  target.state.y=pivot.y-1.69;target.life={...newLife(0,false),hp:150};
  for(let tick=4;tick<60;tick++) {
    fireTurret(world,kind,crew,tick,players,[target]);
    advanceRounds(world,players,[target],tick);
    if(tick===(CITY ? 6 : 11))assert.equal(target.life.hp,chain ? 0 : 48);
  }
  assert.equal(target.life.hp,0);
  assert.ok(world.shots.some(s=>s.weapon==='turret' && s.headshot));
  const schedule=chain ? [0,...Array.from({length:19},(_,i)=>5+i*3)] : CITY && kind==='rover'
    ? [0,...Array.from({length:19},(_,i)=>4+i*3)]
    : [0,8,15,23,30,38,45,53];
  assert.deepEqual(world.shots.filter(s=>s.weapon==='muzzle').map(s=>s.tick),schedule);
  assert.ok(world.shots.filter(s=>s.weapon==='muzzle').every(s=>s.firedWeapon==='turret'));
  assert.equal(v.hp,v.maxHp);
  launchMissile(world,kind,{id:2},60);assert.equal(world.missiles.length,0);
  if(kind==='rover'){
    launchMissile(world,kind,{id:1},60);
    assert.equal(world.missiles.length,0,'Humvee has no rockets');
    continue;
  }
  launchMissile(world,kind,{id:1},60);
  const m=world.missiles[0],start={...m};v.yaw=0;
  assert.deepEqual(world.shots.filter(s=>s.weapon==='launch').map(s=>s.id),[m.id]);
  advanceMissiles(world,players,[],61);assert.equal(m.x,start.x+1);assert.ok(Math.abs(m.z-start.z)<1e-9);
  target.state={x:m.x+2,y:m.y-1.3,z:m.z};target.life={...newLife(0,false),hp:250,maxHp:250};
  advanceMissiles(world,players,[target],62);advanceMissiles(world,players,[target],63);
  assert.equal(target.life.hp,100,kind+' missile deals exactly 150 body damage');assert.equal(world.missiles.length,0);
}
{
  const world=newExpedition(),heli=world.heli;
  Object.assign(heli,{x:0,y:15,z:0,yaw:Math.PI/2,pitch:.12,roll:.08,pilot:1,gunner:2,turretYaw:0,turretPitch:0});
  const pilot={id:1,life:newLife(0,false),state:{x:0,y:15,z:0}},gunner={id:2,life:newLife(0,false),state:{x:0,y:15,z:0}};
  assert.equal(firePilotGuns(world,gunner,0),false,'the passenger cannot fire pilot guns');
  assert.equal(firePilotGuns(world,pilot,0),true);
  const first=world.bullets[0],point=mountPosition(heli,mounts.heli.pilotGun);
  assert.deepEqual([first.x,first.y,first.z],[point.x,point.y,point.z]);
  assert.equal(first.weapon,'pilotGun');assert.equal(first.source,'heli');
  assert.ok(first.vx>79 && first.vy>0 && Math.abs(first.vz)<1e-8,'pilot guns follow the airframe, not the turret');
  assert.equal(firePilotGuns(world,pilot,1),false,'pilot guns have their own cooldown');
  assert.equal(firePilotGuns(world,pilot,2),true);
  assert.ok(world.bullets[1].z<first.z,'successive rounds alternate the two fixed muzzles');
  fireTurret(world,'heli',gunner,2,new Map(),[]);
  assert.ok(world.bullets.some(r=>r.weapon==='turret' && r.vz<0),'the passenger turret still aims independently');
  const target={id:'pilot-gun-target',life:newLife(0,false),state:{x:first.x+8,y:first.y+.96-1,z:first.z}};
  for(let tick=0;tick<7;tick++)advanceRounds(world,new Map([[1,pilot],[2,gunner]]),[target],tick);
  assert.ok(target.life.hp<100,'forward rounds damage targets through the normal bullet simulation');
  heli.pilot=null;
  assert.equal(firePilotGuns(world,pilot,8),false,'leaving the pilot seat disables its guns');
}
// Unrelated missile IDs and rejected attempts cannot change which helicopter pod fires next.
{
  const a=newExpedition(), b=newExpedition(), pilot={id:1};
  for(const w of [a,b]) Object.assign(w.heli,{pilot:1,x:3,y:12,z:-5,yaw:.7,pitch:.2,roll:-.1});
  a.rover.driver=2;
  launchMissile(a,'heli',pilot,10);
  launchMissile(a,'heli',pilot,12);
  launchMissile(a,'rover',{id:2},15);
  assert.equal(a.missiles.filter(m=>m.source==='rover').length,0);
  launchMissile(a,'heli',pilot,40);
  launchMissile(b,'heli',pilot,40);
  launchMissile(a,'heli',pilot,70);
  const shots=a.missiles.filter(m=>m.source==='heli');
  assert.deepEqual(shots.map(m=>m.side),[1,-1,1]);
  assert.equal(b.missiles[0].side,1);
  for(const shot of shots){
    const pos=mountPosition(a.heli,[1.44*shot.side,.64,-1.49]);
    assert.deepEqual({x:shot.x,y:shot.y,z:shot.z},pos);
  }
}
const world=newExpedition(), shooter={id:1,weapon:1,state:{x:0,y:15,z:0},life:newLife(0,false),fireReady:0};
const target={id:2,state:{x:0,y:15,z:-8},life:newLife(0,false)};
const players=new Map([[1,shooter],[2,target]]);
const pitch=Math.atan2(.39,8);
fire(world,shooter,{aimYaw:0,aimPitch:pitch},0,players,[]);
assert.equal(target.life.hp,100);
for(let tick=0;tick<8;tick++)advanceRounds(world,players,[],tick);
assert.equal(target.life.hp,25);
const nearMiss=tracePulse(world,[target],{x:.19,y:16.69,z:0},{x:0,y:0,z:-1},12,true);
assert.equal(nearMiss.target,target);assert.equal(nearMiss.headshot,false);
target.life=newLife(0,false);shooter.weapon=2;
const nearby={id:3,state:{x:1.3,y:15,z:-8},life:newLife(0,false)};players.set(3,nearby);
fire(world,shooter,{aimYaw:0,aimPitch:pitch},30,players,[]);
for(let tick=30;tick<40;tick++)advanceRounds(world,players,[],tick);
assert.equal(target.life.hp,0);assert.equal(nearby.life.hp,100,'sidearm never damages a bystander');
assert.deepEqual(world.shots.filter(s=>s.weapon==='muzzle').map(s=>s.firedWeapon),[1,2]);

// The round and actor can cross during a tick even when the actor's final
// position is clear of the bullet. A larger respawn jump should not sweep.
for(const [z,hp] of [[1.3,75],[2.6,100]]){
  const world=newExpedition(),actor={id:2,state:{x:.8,y:19,z:-1},life:newLife(0,false)};
  const players=new Map([[actor.id,actor]]);
  advanceRounds(world,players,[],0);
  actor.state.z=z;
  world.bullets.push({x:0,y:20,z:0,vx:56,vy:0,vz:0,left:144,age:0,weapon:1,shooter:1});
  advanceRounds(world,players,[],1);
  assert.equal(actor.life.hp,hp);
}
console.log('PASS: forward pilot guns, alternating muzzles, independent passenger turret, missiles, and mounted impacts.');
