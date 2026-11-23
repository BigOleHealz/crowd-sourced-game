import {arena, confineToArena} from './public/zombie-arena.js';
import {groundHeight} from './public/world.js';
import {damageActor, newLife} from './public/rivals.js';
import {advanceFall} from './public/falls.js';

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

  function spawnZombie(living, tick) {
    const id = ++nextId;
    const lane = (id*.61803398875)%1;
    const across = arena.west+1+lane*(arena.east-arena.west-2);
    const along = arena.north+1+lane*(arena.south-arena.north-2);
    const gates = [[across,arena.north],[arena.east,along],[across,arena.south],[arena.west,along]];
    const ordered = gates.slice((id-1)%4).concat(gates.slice(0,(id-1)%4));
    const [x,z] = ordered.find(([x,z])=>living.every(p=>Math.hypot(p.state.x-x,p.state.z-z)>5)) ?? ordered[0];
    const maxHp = 65 + 10*(state.wave-1);
    return {id:'infected-'+id, name:'Infected', infected:id, yaw:0, moving:false, weapon:0,
      life:{...newLife(tick,false), hp:maxHp}, maxHp, nextBite:tick+18,
      state:{x,z,y:groundHeight(x,z), grounded:true, vy:0}};
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
      npcs.push(spawnZombie(living,tick));
      spawned++;
      nextSpawn = tick + Math.max(5,30-2*state.wave);
    }
    for (const z of npcs) {
      if (!z.life.hp || advanceFall(z,tick,1/30,world.hp,world)) continue;
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
        const travel = Math.min(range-1.05, (1.75+Math.min(2.9,(state.wave-1)*.27))/30);
        z.state.x += dx/range*travel;
        z.state.z += dz/range*travel;
        // Close neighbors spread across the approach instead of stacking in one silhouette.
        for (const other of npcs) {
          if (other===z || !other.life.hp) continue;
          const sx=z.state.x-other.state.x, sz=z.state.z-other.state.z;
          const gap=Math.hypot(sx,sz);
          if (gap>0 && gap<.62) {
            const push=(.62-gap)*.16/gap;
            z.state.x+=sx*push;
            z.state.z+=sz*push;
          }
        }
        confineToArena(z.state);
        z.state.y = groundHeight(z.state.x,z.state.z);
      }
      if (range<=1.4 && Math.abs(target.state.y-z.state.y)<1.8 && tick>=z.nextBite) {
        damageActor(target,9+2*state.wave,tick);
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
