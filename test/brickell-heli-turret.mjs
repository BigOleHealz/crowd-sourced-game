import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,fireTurret,advanceRounds}=await import('../public/expedition.js');

const world=newExpedition(),heli=world.heli;
const gunner={id:1,state:{x:0,y:160,z:0},life:{hp:100}};
const players=new Map([[1,gunner]]);
Object.assign(heli,{...gunner.state,gunner:1,pilot:2,turretPitch:.15});
let peakRounds=0,peakTracers=0;
for(let tick=0;tick<300;tick++){
  fireTurret(world,'heli',{id:2,life:{hp:100}},tick);
  fireTurret(world,'heli',gunner,tick);
  fireTurret(world,'heli',gunner,tick); // A repeated command does not advance simulation time.
  advanceRounds(world,players,[],tick);
  peakRounds=Math.max(peakRounds,world.bullets.length);
  peakTracers=Math.max(peakTracers,world.bullets.filter(r=>!r.hidden).length);
  if((tick+1)%30===0)assert.equal(heli.chainRounds,(tick+1)*5/3);
}
assert.equal(world.shots.filter(s=>s.weapon==='muzzle').length,100);
assert(peakRounds>=128 && peakRounds<=130);
assert(peakTracers<=26);
fireTurret(world,'heli',gunner,9000);
assert.equal(heli.chainRounds,502,'resume only schedules the current tick');
heli.wrecked=true;
fireTurret(world,'heli',gunner,9001);
heli.wrecked=false;gunner.life.hp=0;
fireTurret(world,'heli',gunner,9002);
assert.equal(heli.chainRounds,502);
console.log('PASS Brickell helicopter 500 rounds in 10s, sub-tick cadence, bounded tracers, role/life gating and idle restart.');
