import {blocked, groundHeight, insideTravelArea, stepPlayer, waterSurfaceAt} from './public/world.js';
import {damageActor, newLife} from './public/rivals.js';
import {advanceFall, startFall} from './public/falls.js';

export function squadSpawn(id) {
  const x = -20 + ((id-1)%4), z = -210 + Math.floor((id-1)/4);
  return {x, z, y:groundHeight(x,z), vy:0, grounded:true};
}

function restore(player, tick) {
  player.state = squadSpawn(player.id);
  player.life = newLife(tick);
  player.team = 'survivors';
  player.score = {kills:0, deaths:0, team:player.team};
  player.weapon = 1;
  player.holstered = player.moving = player.sprint = false;
  player.yaw = player.fireReady = 0;
  player.inputs.length = 0;
  player.ack = player.lastSeq;
  delete player.meleeSwing;
  player.launcherLock = null;
}

export function zombieSurvival() {
  const state = {phase:'lobby', wave:0, kills:0, score:0, waveKills:0, goal:0, readyIn:0};
  let spawned = 0, nextSpawn = 0, nextId = 0, startsAt = 0;

  function nextWave(tick) {
    state.wave++;
    state.waveKills = spawned = 0;
    state.goal = 4 + 2*state.wave;
    state.phase = 'ready';
    startsAt = tick + 90;
    state.readyIn = 3;
    nextSpawn = startsAt;
  }

  // Look for clear approaches around the next survivor, rotating the first
  // direction each spawn so a squad on the move gets attacked from different sides.
  function approach(living, seed, world) {
    const target=living[(seed-1)%living.length].state;
    for (let i=0; i<16; i++) {
      const angle=seed*2.4 + i*Math.PI/4;
      const r=i<8 ? 13 : 7;
      const x=target.x+Math.sin(angle)*r, z=target.z+Math.cos(angle)*r;
      if (!insideTravelArea(x,z) || living.some(p=>Math.hypot(p.state.x-x,p.state.z-z)<5)) continue;
      const floor=groundHeight(x,z,target.y+1.8,world.doors);
      const water=waterSurfaceAt(x,z,target.y);
      const swimming=floor<water-.75;
      const y=swimming ? water-.72 : floor;
      if ((swimming && !target.swimming) || Math.abs(y-target.y)>3 || blocked(x,y,z,world.hp,world.doors)) continue;
      return {x,y,z,grounded:!swimming,vy:0,...(swimming && {swimming:true})};
    }
    return null;
  }

  function spawnZombie(position, tick) {
    const id = ++nextId;
    const maxHp = 65 + 10*(state.wave-1);
    return {id:'infected-'+id, name:'Infected', infected:id, yaw:0, moving:false, weapon:0,
      life:{...newLife(tick,false), hp:maxHp}, maxHp, nextBite:tick+18,
      state:position, lastAdvance:tick, progressX:position.x, progressZ:position.z};
  }

  function advance(players, npcs, tick, world) {
    if (state.phase==='lobby' || state.phase==='finished') return;
    const living = [...players.values()].filter(p=>p.life.hp>0);
    // Resolve each death once, even if several players hit it on the same tick.
    for (let i=npcs.length-1; i>=0; i--) {
      const z = npcs[i];
      if (z.life.hp) continue;
      if (z.downAt===undefined) {
        z.downAt = tick;
        state.kills++;
        state.waveKills++;
        state.score += 100*state.wave;
      }
      if (tick-z.downAt>=24) npcs.splice(i,1);
      else advanceFall(z,tick,1/30,world.hp,world);
    }
    if (!living.length) {state.phase='finished'; return;}
    if (state.phase==='ready') {
      state.readyIn = Math.max(0,Math.ceil((startsAt-tick)/30));
      if (tick<startsAt) return;
      state.phase='active';
    }
    if (state.waveKills>=state.goal) {
      for (const player of players.values()) {
        if (!player.life.hp) {
          const score = player.score;
          restore(player,tick);
          player.score = score;
        }
      }
      nextWave(tick);
      return;
    }
    const cap = Math.min(14,2+living.length+state.wave);
    if (spawned<state.goal && tick>=nextSpawn && npcs.length<cap) {
      const position=approach(living,nextId+1+Math.floor(tick/30),world);
      if(position){
        npcs.push(spawnZombie(position,tick));
        spawned++;
      }
      nextSpawn = tick + Math.max(5,30-2*state.wave);
    }
    for (const z of npcs) {
      if (!z.life.hp) continue;
      if (!z.crawling && (z.life.lostParts?.leftLeg || z.life.lostParts?.rightLeg)) {
        z.crawling=true;
        if (!z.life.fall) startFall(z,tick,{x:0,y:0,z:0},'lostLeg');
      }
      const falling=advanceFall(z,tick,1/30,world.hp,world);
      if (z.crawling && z.state.grounded) z.state.stance='prone';
      if (falling) continue;
      let target, range = Infinity;
      for (const player of living) {
        if (!player.life.hp) continue;
        const d = Math.hypot(player.state.x-z.state.x, player.state.z-z.state.z);
        if (d<range) {range=d; target=player;}
      }
      if (!target) break;
      const dx=target.state.x-z.state.x, dz=target.state.z-z.state.z;
      z.yaw = Math.atan2(dx,-dz);
      z.moving = range>1.05;
      if (z.moving) {
        // Use the same terrain and wall collisions as the squad, including on bridges.
        // Prone movement uses the same 1.05 m/s cap as a crawling survivor.
        const speed = z.crawling ? .80 : (1.75+Math.min(2.8,(state.wave-1)*.27))/4.6;
        let x=dx/range, zMove=dz/range;
        for (const other of npcs) {
          if (other===z || !other.life.hp) continue;
          const sx=z.state.x-other.state.x, sz=z.state.z-other.state.z;
          const gap=Math.hypot(sx,sz);
          if (gap>0 && gap<.62) {
            const push=(.62-gap)/gap;
            x+=sx*push;
            zMove+=sz*push;
          }
        }
        z.state=stepPlayer(z.state,{x:x*speed,z:zMove*speed},1/30,world.hp,world);
        if(Math.hypot(z.state.x-z.progressX,z.state.z-z.progressZ)>1){
          z.lastAdvance=tick;
          z.progressX=z.state.x;
          z.progressZ=z.state.z;
        }else if(tick-z.lastAdvance>300 && range>3){
          // An impassable route must not strand the last enemy of a wave.
          const position=approach(living,z.infected+Math.floor(tick/30),world);
          if(position)z.state=z.crawling && position.grounded ? {...position,stance:'prone'} : position;
          z.lastAdvance=tick;
        }
      }else{
        z.lastAdvance=tick;
      }
      if (range<=1.4 && Math.abs(target.state.y-z.state.y)<1.8 && tick>=z.nextBite) {
        const hpBefore = target.life.hp;
        damageActor(target,9+2*state.wave,tick);
        if (target.life.hp < hpBefore) target.life.lastBiteTick = tick;
        z.nextBite = tick+26;
      }
    }
    if (living.every(p=>!p.life.hp)) state.phase='finished';
  }
  return {state, advance, join:restore, start(players,tick) {
    if (state.phase!=='lobby' || !players.size) return false;
    for (const p of players.values()) restore(p,tick);
    nextWave(tick);
    return true;
  }};
}
