import {floatingBody} from './marine-float.js';
import {brickellMap,bridges,cityGround} from './brickell-map.js';
import {bridgeMiddle} from './drawbridges.js';
import {bridgeDogSplash,bridgeDogWater} from './bridge-shark-water.js';
import {inDivingLane} from './marina-platform.js';
import {sharkDefeatPose} from './shark-defeat.js';

const water=brickellMap.waterY;
const deep=2.05, grace=14, recover=150;
const tau=Math.PI*2;
const round=n=>Math.round(n*1000)/1000;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(n,hi));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// Patrols cover the bay, Harbor Key, Lantern Point and the west channel.
const huntingHomes=[[63,8],[85,-212],[97,-436],[-83,-181],[-83,-405]];
// Ambient sharks feed on wildlife. Only the original five hunt swimmers.
const channelHomes=bridges.flatMap(b=>[[b.west-5,bridgeMiddle(b)-3],[b.east+5,bridgeMiddle(b)+3]]);
const homes=[...huntingHomes,[72,24],[87,-241],[96,-373],[-85,-292],[-83,-199],...channelHomes];
export const sharkSizes=[.88,1.16,1.03,.97,1.29,.92,1.08,.95,.98,.90,...bridges.flatMap(()=>[.94,1.06])];

// Sample at fin height so an overhead bridge leaves the channel navigable,
// while low approaches and shallow shoreline still block the shark.
export const sharkSeabed=(x,z)=>cityGround(x,z,water+.55);

function openWater(x,z,padding,edgePadding=padding){
  if(inDivingLane(x,z))return false;
  if(x-edgePadding<brickellMap.westBound || x+edgePadding>brickellMap.bounds ||
     z-edgePadding<brickellMap.northBound || z+edgePadding>brickellMap.bounds)return false;
  return water-sharkSeabed(x,z)>=deep && water-sharkSeabed(x-padding,z)>=deep &&
    water-sharkSeabed(x+padding,z)>=deep && water-sharkSeabed(x,z-padding)>=deep &&
    water-sharkSeabed(x,z+padding)>=deep;
}
function clearCourse(a,b,bridge){
  const steps=Math.max(1,Math.ceil(distance(a,b)/1.6));
  for(let k=1;k<=steps;k++){
    const t=k/steps;
    const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
    if(!openWater(x,z,1.5,0) && !(bridge && bridgeDogWater(bridge,x,z)))return false;
  }
  return true;
}
export {clearCourse as clearSharkCourse};
const bridgeReturns=new WeakMap();

export function returnToSharkPatrol(shark){
  if(!shark.hp || openWater(shark.x,shark.z,1.5,0))return;
  const bridge=bridgeDogSplash(shark);
  if(bridge)bridgeReturns.set(shark,bridge);
}
const bridgeLane=(bridge,x)=>x<(bridge.east+bridge.west)/2?bridge.west-4:bridge.east+4;

export function bridgeSharkWaypoint(from,to,bridge){
  if(clearCourse(from,to,bridge))return to;
  if(!bridge)return;
  const z=bridgeMiddle(bridge),entry={x:bridgeLane(bridge,from.x),z},exit={x:bridgeLane(bridge,to.x),z};
  // A shark on the opposite side can cross beneath the high center rather
  // than trying to cut straight through the solid bridge approaches.
  if(!clearCourse(exit,to,bridge))return;
  if(clearCourse(from,exit,bridge))return exit;
  if(clearCourse(from,entry,bridge) && clearCourse(entry,exit,bridge))return entry;
}
function atBearing(start,bearing,range){
  return {x:start.x+Math.sin(bearing)*range,z:start.z-Math.cos(bearing)*range};
}

// Plan the turn before leaving the bite. At the world edge the natural
// straight-ahead runout can be dry land or outside the simulation.
function retreatGoal(s){
  for(const offset of [0,.8,-.8,1.6,-1.6,2.4,-2.4,Math.PI]){
    const end=atBearing(s,s.yaw+offset,5.5);
    if(openWater(end.x,end.z,1.5) && clearCourse(s,end))return end;
  }
  return {x:s.x,z:s.z};
}

function initial(i){
  const [x,z]=homes[i],maxHp=Math.round(120*sharkSizes[i]);
  return {...(i>=huntingHomes.length && {scavenger:true}),x,y:water-.9,z,yaw:i,stroke:i,size:sharkSizes[i],hp:maxHp,maxHp,
    target:null,phase:'patrol',deathY:null,hitSeq:0,ageSinceHit:null,deathKind:null};
}

export function damageShark(states,index,amount,kind,point){
  const s=states?.[index];
  if(!s?.hp || !(amount>0) || !Number.isFinite(amount))return false;
  s.hp=Math.max(0,s.hp-Math.round(amount));
  s.hitSeq++;s.ageSinceHit=0;
  s.hitX=point?.x??s.x;s.hitY=point?.y??s.y;s.hitZ=point?.z??s.z;
  if(!s.hp){s.phase='dead';s.deathKind=kind;s.deathY=s.y;s.target=null;}
  return true;
}

// Local-space ellipsoids follow the animal's tapered body and exposed dorsal fin.
function ellipse(a,b,c,r){
  const x=(a.x-c[0])/r[0],y=(a.y-c[1])/r[1],z=(a.z-c[2])/r[2];
  const vx=(b.x-a.x)/r[0],vy=(b.y-a.y)/r[1],vz=(b.z-a.z)/r[2];
  const offset=x*x+y*y+z*z-1;
  if(offset<=0)return 0;
  const length=vx*vx+vy*vy+vz*vz,along=x*vx+y*vy+z*vz;
  const disc=along*along-length*offset;
  if(disc<0 || !length)return Infinity;
  const t=(-along-Math.sqrt(disc))/length;
  return t>=0 && t<=1?t:Infinity;
}
const volumes=[
  [[0,0,-.21],[.37,.35,1.45]],[[0,.40,-.08],[.065,.38,.26]],
  [[0,.035,1.19],[.15,.17,.61]],[[0,.19,1.72],[.085,.49,.18]],
];
export function sharkContact(states,start,end){
  let nearest=null;
  if(!states)return nearest;
  for(let i=0;i<states.length;i++){
    const s=states[i];
    if(!s.hp)continue;
    const r=2.15*s.size;
    if(s.x<Math.min(start.x,end.x)-r || s.x>Math.max(start.x,end.x)+r ||
       s.z<Math.min(start.z,end.z)-r || s.z>Math.max(start.z,end.z)+r ||
       s.y<Math.min(start.y,end.y)-r || s.y>Math.max(start.y,end.y)+r)continue;
    const co=Math.cos(s.yaw),si=Math.sin(s.yaw);
    const local=p=>({x:((p.x-s.x)*co+(p.z-s.z)*si)/s.size,y:(p.y-s.y)/s.size,
      z:((p.z-s.z)*co-(p.x-s.x)*si)/s.size});
    const a=local(start),b=local(end);
    for(const [c,radii] of volumes){
      const t=ellipse(a,b,c,radii);
      if(t<(nearest?.t??Infinity))nearest={index:i,t};
    }
  }
  return nearest;
}

export function createSharks(){
  const state=homes.map((_,i)=>initial(i)),defeats=[];
  let nextDefeatId=1;
  const minds=homes.map(([x,z])=>({home:{x,z},pass:0,down:0}));
  const exposure=new WeakMap();
  let time=0,nextSearch=0;
  function assign(swimmers,observers){
    const free=state.map((s,i)=>({s,i})).filter(({s})=>s.hp>0 && !s.scavenger && s.phase==='patrol');
    for(const p of swimmers.values()){
      if(state.some(s=>s.target===p.id) || !free.length)continue;
      free.sort((a,b)=>distance(a.s,p.state)-distance(b.s,p.state));
      let slot=free.findIndex(({s})=>distance(s,p.state)<60 && clearCourse(s,p.state));
      if(slot<0){
        // Bring an unseen patrol into the swimmer's channel. Surface beyond the
        // swimmer, with time to see the fin before the first pass.
        slot=free.findIndex(({s})=>observers.every(o=>distance(s,o.state)>56));
        if(slot<0)continue;
        let entry;
        for(let j=0;j<12 && !entry;j++){
          const next=atBearing(p.state,(p.yaw??0)+j*tau/12,24);
          if(openWater(next.x,next.z,2) && clearCourse(next,p.state) &&
            observers.every(o=>distance(next,o.state)>18))entry=next;
        }
        if(!entry)continue;
        const {s,i}=free[slot];
        Object.assign(s,entry,{y:water-1.7,yaw:Math.atan2(p.state.x-entry.x,entry.z-p.state.z)});
        minds[i].home=entry;
      }
      const [{s,i}]=free.splice(slot,1);
      s.target=p.id;s.phase='approach';minds[i].pass=time+2.35;
    }
  }

  // Free nearby sharks can reach the existing event only by turning and
  // swimming there. Predict the moving contact point for the remaining pass.
  function inviteNearby(event){
    let visitors=0;
    for(const [i,other] of state.entries()){
      if(visitors>=2 || i===event.sharkIndex || other.scavenger || !other.hp || other.phase!=='patrol')continue;
      if(distance(other,event)>11)continue;
      for(const horizon of [.45,.9,1.4,1.85]){
        const intercept=sharkDefeatPose(event,horizon);
        const heading=Math.atan2(intercept.x-other.x,other.z-intercept.z);
        const turn=Math.abs(Math.atan2(Math.sin(heading-other.yaw),Math.cos(heading-other.yaw)));
        const travel=Math.max(0,distance(other,intercept)-1.45*other.size-.40)/4.4;
        if(travel+turn/2.4>horizon || !clearCourse(other,intercept))continue;
        minds[i].feeding=event;minds[i].biteYaw=heading;
        other.phase='joining';other.target=null;visitors++;
        break;
      }
    }
  }

  // All clients pose the swimmer at this same impact-relative position.
  // Once contact occurs the shark's nose remains at the pelvis during the tow.
  function stepFeeding(s,i,dt,tick,players){
    const mind=minds[i],event=mind.feeding;
    const age=(tick-event.tick)/30,turnEnd=2.65;
    if(age>=turnEnd || !defeats.includes(event)){
      s.phase='patrol';mind.feeding=null;return false;
    }
    const contact=sharkDefeatPose(event,age);
    const side=i%2?1:-1;
    const joined=s.phase==='feeding',releaseAt=2.47;
    let desiredYaw,motion,depth;
    if(!joined){
      const lookAhead=sharkDefeatPose(event,Math.min(1.95,age+.16));
      desiredYaw=Math.atan2(lookAhead.x-s.x,s.z-lookAhead.z);
      motion=4.4;depth=contact.y+.72;
    }else{
      desiredYaw=mind.biteYaw+side*(age<releaseAt ? .12*Math.sin(age*5) : .12+(age-releaseAt)*2.05);
      motion=age<releaseAt?0:2.55;
      depth=contact.y+.72-Math.max(0,age-releaseAt)*.28;
    }
    const turn=Math.atan2(Math.sin(desiredYaw-s.yaw),Math.cos(desiredYaw-s.yaw));
    const yaw=s.yaw+clamp(turn,-dt*2.4,dt*2.4);
    const next=atBearing(s,yaw,motion*dt);
    if(joined && age<releaseAt){
      const grip=atBearing(contact,yaw,-1.45*s.size);
      const d=distance(s,grip),k=Math.min(1-Math.exp(-18*dt),5.5*dt/Math.max(.001,d));
      next.x=s.x+(grip.x-s.x)*k;next.z=s.z+(grip.z-s.z)*k;
    }
    if(openWater(next.x,next.z,1.5,0)){s.x=round(next.x);s.z=round(next.z);}
    s.yaw=round(Math.atan2(Math.sin(yaw),Math.cos(yaw)));
    s.y=round(s.y+(depth-s.y)*(1-Math.exp(-9*dt)));
    s.stroke=round((s.stroke+dt*(joined?4.3:6.1))%tau);
    if(!joined){
      const jaw=atBearing(s,s.yaw,1.45*s.size);
      if(age<=2.1 && distance(jaw,contact)<.66 && Math.abs(s.y-contact.y-.72)<.42){
        s.phase='feeding';mind.biteYaw=s.yaw;
        const victim=players.get(event.playerId),parts=victim.life.lostParts??={};
        const part=['leftLeg','rightArm','rightLeg','leftArm'].find(key=>!parts[key]);
        if(part)parts[part]={tick,x:contact.x,y:contact.y+.66,z:contact.z,dx:Math.sin(yaw),dz:-Math.cos(yaw),yaw,water:true};
        event.arrivals.push({sharkIndex:i,tick});
      }else if(age>2.1){s.phase='patrol';mind.feeding=null;}
    }
    return true;
  }

  function step(dt,players,tick,hurt){
    time+=dt;
    for(let i=defeats.length-1;i>=0;i--){
      const event=defeats[i],victim=players.get(event.playerId);
      if(tick-event.tick>=90 || !victim || victim.life.hp>0 || victim.life.fall?.started!==event.tick){
        defeats.splice(i,1);
      }
    }
    const swimmers=new Map(),observers=[...players.values()];
    for(const p of observers){
      const {x,z}=p.state;
      if(!p.life.hp || p.life.fall || !p.state.swimming || !openWater(x,z,2.2,0)){
        exposure.delete(p);continue;
      }
      const began=exposure.get(p)??time;
      exposure.set(p,began);
      if(time-began>=grace)swimmers.set(p.id,p);
    }
    for(const s of state)if(s.target!=null && !swimmers.has(s.target)){
      s.target=null;s.phase='patrol';
    }
    if(time>=nextSearch){assign(swimmers,observers);nextSearch=time+.65;}
    for(const [i,s] of state.entries()){
      const mind=minds[i];
      if(s.ageSinceHit!=null)s.ageSinceHit=round(Math.min(60,s.ageSinceHit+dt));
      if(!s.hp){
        mind.down+=dt;
        s.y=round(floatingBody(s.deathY,water,s.size,mind.down).y);
        if(mind.down>=recover){
          Object.assign(s,initial(i),{hitSeq:s.hitSeq});
          mind.down=0;mind.feeding=null;mind.home={x:s.x,z:s.z};
        }
        continue;
      }
      if(s.dogEncounter || s.scavenge)continue;
      if(mind.feeding && stepFeeding(s,i,dt,tick,players))continue;
      const prey=swimmers.get(s.target);
      let returnBridge=bridgeReturns.get(s);
      if(returnBridge && openWater(s.x,s.z,1.5,0)){bridgeReturns.delete(s);returnBridge=null;}
      const ang=time*.115+i*1.23;
      let goal={x:mind.home.x+4.2*Math.sin(ang),z:mind.home.z+6.5*Math.cos(ang)};
      let speed=1.18,depth=.85+.23*Math.sin(ang*.81);
      if(returnBridge){
        const exit={x:bridgeLane(returnBridge,s.x),z:clamp(s.z,returnBridge.north+2,returnBridge.south-2)};
        goal=bridgeSharkWaypoint(s,exit,returnBridge)??goal;speed=3.4;depth=.64;
      }
      if(prey){
        depth=.41+.04*Math.sin(time*2);
        if(s.phase==='retreat' && time>=mind.pass)s.phase='approach';
        if(s.phase==='retreat'){
          goal=mind.runout;speed=Math.min(3.7,distance(s,goal)*2);
        }else{
          goal=prey.state;speed=6.6;
          const nose=atBearing(s,s.yaw,1.48*s.size);
          const withinBiteHeight=Math.abs(s.y-(goal.y+.72))<.68*s.size;
          if(time>=mind.pass && withinBiteHeight && distance(nose,goal)<.84 && clearCourse(s,goal)){
            const {x,y,z}=prey.state;
            const previousHp=prey.life.hp;
            if(hurt(prey,34,tick,{x:Math.sin(s.yaw),z:-Math.cos(s.yaw)})){
              const event={id:nextDefeatId++,playerId:prey.id,sharkIndex:i,tick,
                x:round(x),y:round(y),z:round(z),yaw:s.yaw,size:s.size,arrivals:[]};
              const end=atBearing(event,event.yaw,3.6);
              if(!openWater(end.x,end.z,1.5) || !clearCourse(event,end)){
                const exit=retreatGoal(event);
                event.towYaw=Math.atan2(exit.x-event.x,event.z-exit.z);
              }
              prey.life.lastBiteTick=tick;
              if(defeats.length>=12)defeats.shift();
              defeats.push(event);
              mind.feeding=event;mind.biteYaw=s.yaw;s.target=null;s.phase='feeding';
              inviteNearby(event);stepFeeding(s,i,dt,tick,players);continue;
            }else{
              if(prey.life.hp<previousHp)prey.life.lastBiteTick=tick;
              s.phase='retreat';mind.runout=retreatGoal(s);mind.pass=time+2.65;
            }
          }else if(time>=mind.pass && distance(s,goal)<1.7*s.size &&
              Math.cos(Math.atan2(goal.x-s.x,s.z-goal.z)-s.yaw)<.38){
            // A near miss leaves too little room for the snout to turn. Circle
            // out for a fresh pass instead of orbiting a stationary swimmer.
            s.phase='retreat';mind.runout=retreatGoal(s);mind.pass=time+1.5;
          }
        }
      }
      const desired=Math.atan2(goal.x-s.x,s.z-goal.z);
      const diff=Math.atan2(Math.sin(desired-s.yaw),Math.cos(desired-s.yaw));
      // Ease off when the swimmer crosses inside the turning circle: a shark
      // must be able to line up another pass instead of orbiting forever.
      if(s.phase==='approach')speed*=clamp(.38+.62*Math.cos(diff),.38,1);
      if(returnBridge)speed*=clamp(Math.cos(diff),.12,1);
      const yaw=s.yaw+clamp(diff,-dt*1.7,dt*1.7);
      const next=atBearing(s,yaw,speed*dt);
      next.x=round(next.x);next.z=round(next.z);
      if(openWater(next.x,next.z,1.5,0) || returnBridge && bridgeDogWater(returnBridge,next.x,next.z)){
        s.x=next.x;s.z=next.z;s.yaw=round(Math.atan2(Math.sin(yaw),Math.cos(yaw)));
      }else if(returnBridge || prey && (s.phase==='retreat' || clearCourse(s,prey.state))){
        // Keep steering even when the next step would leave the water.
        s.yaw=yaw;
      }else{
        // Turn back out to sea before the body can clip a shoal or dock.
        s.yaw+=dt*2.2;
        if(s.target!=null){s.target=null;s.phase='patrol';}
      }
      s.y=round(s.y+(water-depth-s.y)*Math.min(1,dt*2.6));
      s.stroke=round((s.stroke+dt*(2.1+speed*.9))%tau);
    }
  }
  return {state,defeats,step};
}
