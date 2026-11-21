import {CITY,MAP,blocked,groundHeight,stepPlayer} from './world.js';
import {advanceFall} from './falls.js';
import {inBankLobby} from './bank-rules.js';
import {newLife} from './rivals.js';
import {patrolSight,firePatrolShot} from './expedition.js';

const thresholds=[1,3,6,10,15],points={theft:1,defeat:2,wreck:2,officer:3,bank:6};
const stars=heat=>thresholds.reduce((n,start)=>n+(heat>=start),0);
const inactive={enabled:false,stars:0,phase:'off',escapeSeconds:0};
const fresh=player=>({player,heat:0,lastContact:0,nextDispatch:0});
const targetCount=level=>level>=4?3:level>=2?2:1;
let serial=0;

function arrival(world,player,players,number){
  const p=player.state;let fallback;
  // Search a ring for walkable ground; never materialize in a room or the water.
  for(let i=0;i<16;i++){
    const angle=(player.yaw??0)+2.1+number*1.3+i*2.4,range=12+(i%3)*2;
    const x=p.x+Math.sin(angle)*range,z=p.z-Math.cos(angle)*range,y=groundHeight(x,z);
    if(!Number.isFinite(y)||y<MAP.waterY+.25||blocked(x,y,z,world.hp,world.doors))continue;
    const officer={name:CITY?'City police officer':'County deputy',officer:true,targetId:player.id,
      state:{x,y,z,grounded:true,vy:0},yaw:angle+Math.PI,moving:false,weapon:2,life:newLife(0,false),
      nextSense:0,nextShot:0,visible:false};
    fallback??=officer;
    if(patrolSight(world,officer,player,players)){fallback=officer;break;}
  }
  if(fallback){fallback.id='officer-'+(++serial);return fallback;}
}

// The north gallery has one public doorway. Officers approaching the branch
// use the pavement in front of it instead of walking into the tower facade.
const bankDoor={x:-20,z:-40.1};
function bankApproach(officer,destination,world){
  if(officer.atBankDoor)return destination;
  const p=officer.state;
  // Eastbound units unload on the far side of their parked car. Walk around
  // its nose before turning towards the doorway, using the same solid car.
  const car=world.patrolCars?.find(c=>c.officerId===officer.id);
  if(car && Math.abs(car.z+43.15)<1 && p.z<car.z+.95 && p.x<car.x+3.05){
    return {x:car.x+3.55,z:Math.min(p.z,car.z-1.7)};
  }
  if(car && Math.abs(car.z+43.15)<1 && p.z<car.z+.95){
    return {x:car.x+3.6,z:car.z+1.5};
  }
  if(Math.hypot(p.x-bankDoor.x,p.z-bankDoor.z)<1.45){
    officer.atBankDoor=true;return destination;
  }
  return bankDoor;
}

function approachOnFoot(officer,destination,world,entering=false){
  const state=officer.state,dx=destination.x-state.x,dz=destination.z-state.z;
  const distance=Math.hypot(dx,dz),stop=entering ? .35 : officer.visible ? 5.5 : 1.2;
  const gap=Math.max(0,distance-stop);
  // A small dead band keeps someone standing still when the target shifts a little.
  const moving=gap>(officer.moving ? .12 : .6);
  const desired=distance>.20?Math.atan2(dx,-dz):officer.yaw;
  const angle=Math.atan2(Math.sin(desired-officer.yaw),Math.cos(desired-officer.yaw));
  officer.yaw+=Math.max(-.13,Math.min(.13,angle));
  officer.sprint=moving && gap>(officer.sprint?4.5:6);
  // Turn into a change of direction and ease the last two metres into a walk.
  const pace=moving?Math.min(1,gap/2)*(.24+.76*Math.max(0,Math.cos(angle))):0;
  if(pace || state.vx || state.vz || !state.grounded){
    officer.state=stepPlayer(state,{x:Math.sin(officer.yaw)*pace,z:-Math.cos(officer.yaw)*pace,
      sprint:officer.sprint},1/30,world.hp,world);
  }
  officer.moving=Math.hypot(officer.state.vx??0,officer.state.vz??0)>.12;
}

export function createWanted(world,players,{stepCruisers}={}){
  const sessions=new Map(),officers=[],projectiles=new WeakMap();
  let actors,now=0;
  function removeOfficer(i){
    const officer=officers[i],index=actors?.indexOf(officer)??-1;
    if(index>=0)actors.splice(index,1);
    officers.splice(i,1);
  }
  function recall(id){
    for(let i=officers.length-1;i>=0;i--)if(officers[i].targetId===id)removeOfficer(i);
    if(world.patrolCars){
      if(!officers.length){
        stepCruisers?.(world,[],players,now);
        delete world.patrolCars;
      }else{
        const remaining=world.patrolCars.filter(c=>c.targetId!==id);
        if(remaining.length)world.patrolCars=remaining;else delete world.patrolCars;
      }
    }
  }
  function session(p){return p && sessions.get(p);}
  function set(p,enabled){
    if(enabled){if(!session(p))sessions.set(p,fresh(p));}
    else if(sessions.delete(p))recall(p.id);
  }
  function reset(p){
    if(!session(p))return;
    sessions.set(p,fresh(p));recall(p.id);
  }
  function record(owner,kind,tick=now){
    if(!owner || session(owner.player)!==owner || !owner.player.life.hp || !Object.hasOwn(points,kind))return;
    owner.heat=Math.min(thresholds.at(-1),owner.heat+points[kind]);
    owner.lastContact=tick;owner.lastKnown={x:owner.player.state.x,y:owner.player.state.y,z:owner.player.state.z};
  }
  function holdBankResponse(owner,tick){
    // A confirmed, ongoing branch alarm keeps its reported location active.
    // Once the handoff or alarm ends, ordinary sight and escape rules take over.
    if(!owner || session(owner.player)!==owner)return;
    owner.lastContact=tick;
    owner.branch=true;
  }
  function view(p,tick){
    const s=session(p);
    if(!s)return inactive;
    const level=stars(s.heat),age=tick-s.lastContact;
    return {enabled:true,stars:level,phase:!level?'clear':age<45?'pursuit':'search',
      escapeSeconds:level?Math.max(0,Math.ceil((300-age)/30)):0};
  }
  function step(npcs,tick){
    actors=npcs;now=tick;
    if(!sessions.size)return;
    for(let i=officers.length-1;i>=0;i--){
      const o=officers[i];
      if(!o.life.hp){advanceFall(o,tick,1/30,world.hp,world);if(tick>=o.life.returnAt)removeOfficer(i);}
    }
    for(const [p,s] of sessions){
      if(!p.life.hp){if(!s.dead){reset(p);session(p).dead=true;}continue;}
      if(s.dead)delete s.dead;
      let level=stars(s.heat);
      if(!level)continue;
      const crew=officers.filter(o=>o.targetId===p.id && o.life.hp);
      for(const o of crew){
        const dx=p.state.x-o.state.x,dz=p.state.z-o.state.z,dist=Math.hypot(dx,dz);
        if(advanceFall(o,tick,1/30,world.hp,world))continue;
        if(tick>=o.nextSense){
          o.nextSense=tick+9;
          o.visible=dist<28 && !!patrolSight(world,o,p,players);
          if(o.visible){s.lastContact=tick;s.lastKnown={x:p.state.x,y:p.state.y,z:p.state.z};}
        }
        o.lastKnown=s.lastKnown;
        if(!o.cruiserId){
          const approach=s.branch && inBankLobby(s.lastKnown) ? bankApproach(o,s.lastKnown,world) : s.lastKnown;
          approachOnFoot(o,approach,world,approach!==s.lastKnown);
        }
        if(!o.cruiserId && o.visible && dist<=18 && tick>=o.nextShot){
          o.nextShot=tick+Math.max(35,90-10*level);
          const sight=patrolSight(world,o,p,players);
          if(sight)firePatrolShot(world,o,p,sight,tick,2+level);
          if(!p.life.hp){reset(p);break;}
        }
      }
      if(!p.life.hp)continue;
      if(tick-s.lastContact>=300){
        s.heat=level>1?thresholds[level-2]:0;level=stars(s.heat);
        s.lastContact=tick-150;
        if(!level){recall(p.id);continue;}
        while(crew.length>targetCount(level)){const o=crew.pop();removeOfficer(officers.indexOf(o));}
      }
      if(crew.length<targetCount(level)&&officers.length<8&&tick>=s.nextDispatch&&tick-s.lastContact<45){
        s.nextDispatch=tick+60;
        const o=arrival(world,p,players,crew.length);
        if(o){o.nextShot=tick+65;officers.push(o);npcs.push(o);}
      }
    }
    if(officers.length || world.patrolCars)stepCruisers?.(world,officers,players,tick,npcs);
  }
  return {set,session,view,reset,record,holdBankResponse,step,tag(round,p){const s=session(p);if(s)projectiles.set(round,s);},
    owner(round){const s=projectiles.get(round);return s&&session(s.player)===s?s:undefined;}};
}
