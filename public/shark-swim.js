import {brickellMap,cityGround} from './brickell-map.js';

const water=brickellMap.waterY;
const deep=2.05, grace=14, recover=150;
const tau=Math.PI*2;
const round=n=>Math.round(n*1000)/1000;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(n,hi));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// Patrols cover the bay, Harbor Key, Lantern Point and the west channel.
const homes=[[63,8],[85,-212],[97,-436],[-83,-181],[-83,-405]];
export const sharkSizes=[.88,1.16,1.03,.97,1.29];
export const swimWeapon=weapon=>Number.isInteger(weapon) && weapon>=1 && weapon<=4;

function openWater(x,z,padding){
  if(x-padding<brickellMap.westBound || x+padding>brickellMap.bounds ||
     z-padding<brickellMap.northBound || z+padding>brickellMap.bounds)return false;
  return water-cityGround(x,z)>=deep && water-cityGround(x-padding,z)>=deep &&
    water-cityGround(x+padding,z)>=deep && water-cityGround(x,z-padding)>=deep &&
    water-cityGround(x,z+padding)>=deep;
}
function clearCourse(a,b){
  const steps=Math.ceil(distance(a,b)/1.6);
  for(let k=1;k<=steps;k++){
    const t=k/steps;
    if(!openWater(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,1.5))return false;
  }
  return true;
}
function atBearing(start,bearing,range){
  return {x:start.x+Math.sin(bearing)*range,z:start.z-Math.cos(bearing)*range};
}

function initial(i){
  const [x,z]=homes[i],maxHp=Math.round(120*sharkSizes[i]);
  return {x,y:water-.9,z,yaw:i,stroke:i,size:sharkSizes[i],hp:maxHp,maxHp,
    target:null,phase:'patrol',hitSeq:0,ageSinceHit:null,deathKind:null};
}

export function damageShark(states,index,amount,kind,point){
  const s=states?.[index];
  if(!s?.hp || !(amount>0) || !Number.isFinite(amount))return false;
  s.hp=Math.max(0,s.hp-Math.round(amount));
  s.hitSeq++;s.ageSinceHit=0;
  s.hitX=point?.x??s.x;s.hitY=point?.y??s.y;s.hitZ=point?.z??s.z;
  if(!s.hp){s.phase='dead';s.deathKind=kind;s.target=null;}
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
  const state=homes.map((_,i)=>initial(i));
  const minds=homes.map(([x,z])=>({home:{x,z},pass:0,down:0}));
  const exposure=new WeakMap();
  let time=0,nextSearch=0;
  function assign(swimmers,observers){
    const free=state.map((s,i)=>({s,i})).filter(({s})=>s.hp>0 && s.target==null);
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

  function step(dt,players,tick,hurt){
    time+=dt;
    const swimmers=new Map(),observers=[...players.values()];
    for(const p of observers){
      const {x,z}=p.state;
      if(!p.life.hp || p.life.fall || !p.state.swimming || !openWater(x,z,5)){
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
        if(mind.down>=recover){
          Object.assign(s,initial(i),{hitSeq:s.hitSeq});
          mind.down=0;mind.home={x:s.x,z:s.z};
        }
        continue;
      }
      const prey=swimmers.get(s.target);
      const ang=time*.115+i*1.23;
      let goal={x:mind.home.x+4.2*Math.sin(ang),z:mind.home.z+6.5*Math.cos(ang)};
      let speed=1.18,depth=.85+.23*Math.sin(ang*.81);
      if(prey){
        depth=.41+.04*Math.sin(time*2);
        if(s.phase==='retreat' && time>=mind.pass)s.phase='approach';
        if(s.phase==='retreat'){
          goal=atBearing(s,s.yaw,5);speed=2.60;
        }else{
          goal=prey.state;speed=3.85;
          const nose=atBearing(s,s.yaw,1.48*s.size);
          if(time>=mind.pass && distance(nose,goal)<.84 && clearCourse(s,goal)){
            hurt(prey,Math.round(19*s.size),tick,{x:Math.sin(s.yaw),z:-Math.cos(s.yaw)});
            s.phase='retreat';mind.pass=time+3.4;
          }
        }
      }
      const desired=Math.atan2(goal.x-s.x,s.z-goal.z);
      const diff=Math.atan2(Math.sin(desired-s.yaw),Math.cos(desired-s.yaw));
      const yaw=s.yaw+clamp(diff,-dt*1.7,dt*1.7);
      const next=atBearing(s,yaw,speed*dt);
      if(openWater(next.x,next.z,1.5)){
        s.x=round(next.x);s.z=round(next.z);s.yaw=round(Math.atan2(Math.sin(yaw),Math.cos(yaw)));
      }else{
        // Turn back out to sea before the body can clip a shoal or dock.
        s.yaw+=dt*2.2;
        if(prey){s.target=null;s.phase='patrol';}
      }
      s.y=round(s.y+(water-depth-s.y)*Math.min(1,dt*2.6));
      s.stroke=round((s.stroke+dt*(2.1+speed*.9))%tau);
    }
  }
  return {state,step};
}
