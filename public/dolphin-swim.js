import {damageSwimmingAnimal,swimmingAnimalContact} from './aquatic-health.js';
import {floatingBody} from './marine-float.js';
import {brickellMap,cityGround} from './brickell-map.js';
import {hullSize} from './marina-fleet-layout.js';
import {manateeHullClearance} from './manatee-swim.js';

const homes=[[58,13],[62,16],[76,-211],[80,-206],[99,-430],[101,-436],[85,-365],[87,-357]];
export const dolphinSizes=[1,.83,.96,1.06,.88,1.02,.93,1.08];
const tau=Math.PI*2,clamp=(x,min,max)=>Math.min(max,Math.max(min,x));
const round=x=>Math.round(x*1000)/1000;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function open(x,z,size=1.08){
  const m=brickellMap;
  return x>m.westBound+1.7 && x<m.bounds-1.7 && z>m.northBound+1.7 && z<m.bounds-1.7 &&
    cityGround(x,z)<m.waterY-1 && bottom(x,z,size)<m.waterY-.55;
}
function bowPoint(boat,side,large,t,lead){
  const {halfLength,halfWidth}=large?{halfLength:21.6,halfWidth:6.55}:hullSize(boat);
  const forward=halfLength+3.1+lead+Math.sin(t*.8+side)*.58;
  const right=side*(halfWidth*.78+1.3+.28*Math.cos(t*.66));
  const c=Math.cos(boat.yaw),s=Math.sin(boat.yaw);
  return {x:boat.x+s*forward+c*right,z:boat.z-c*forward+s*right};
}
// Bound the depth of the entire animal at banks and when crossing a keel.
function bottom(x,z,size){
  const r=1.7*size;
  return Math.max(cityGround(x,z),cityGround(x-r,z),cityGround(x+r,z),
    cityGround(x,z-r),cityGround(x,z+r))+.36*size;
}
function keel(hull,water,large){
  return (hull.y??water)+(large?-1.25:(hullSize(hull).keel??-.58));
}
const dolphinBody=[[0,0,-.23,.32,.32,.92],[0,-.06,-1.11,.20,.20,.43],
  [0,-.04,.87,.17,.19,.68],[0,.03,1.51,.61,.062,.16],[0,.30,.04,.053,.27,.20]];
const sizeOf=(i,s)=>s.size;
export const dolphinContact=(states,start,end)=>swimmingAnimalContact(states,start,end,dolphinBody,sizeOf);
export function damageDolphin(states,index,amount,kind,point){
  if(!damageSwimmingAnimal(states,index,amount,kind,point))return false;
  const animal=states[index];
  if(!animal.hp){animal.bowId=null;animal.callKind=null;}
  return true;
}
export function createDolphins(world,water){
  let time=0;
  const state=homes.map(([x,z],i)=>({x,z,y:water-.85,yaw:0,pitch:0,roll:0,stroke:i,size:dolphinSizes[i],
    hp:Math.round(120*dolphinSizes[i]),maxHp:Math.round(120*dolphinSizes[i]),hitSeq:0,ageSinceHit:null,deathKind:null,
    bowId:null,air:-1,callSeq:0,callKind:null}));
  const minds=state.map((s,i)=>({x:s.x,z:s.z,y:s.y,yaw:s.yaw,stroke:i,speed:1,side:i%2?1:-1,
    nextCall:6+i*2,lastBow:null,release:0}));
  let nextChoice=0;
  function step(dt){
    time+=dt;
    const all=[...(world.boats??[]),...(world.yacht?[world.yacht]:[])].filter(b=>!b.wrecked && !b.sling);
    const underway=all.filter(b=>b.speed>1.2);
    if(time>=nextChoice){
      nextChoice=time+.45;
      const slots=new Map();
      for(const [i,s] of state.entries()){
        const boat=underway.find(b=>b.id===s.bowId);
        if(!boat || distance(boat,s)>64 || !openPoint(boat,minds[i].side)){
          if(s.bowId){minds[i].lastBow=s.bowId;minds[i].release=time+2;}
          s.bowId=null;continue;
        }
        slots.set(boat.id,[...(slots.get(boat.id)??[]),minds[i].side]);
      }
      // A staffed cruise can attract a pod while the harbor is quiet. When a
      // player takes a boat alongside, let the pair switch bows together.
      const cruises=new Set(underway.filter(b=>b.cruising && b.driver==null).map(b=>b.id));
      for(const boat of [...underway].sort((a,b)=>Number(b.driver!=null)-Number(a.driver!=null))){
        const taken=slots.get(boat.id)??[];
        const nearest=state.map((s,i)=>({s,i,d:distance(s,boat)}))
          .filter(({s,i,d})=>{
            const available=!s.bowId || (boat.driver!=null && cruises.has(s.bowId) && d<30);
            return s.hp>0 && available && d<40 && !(minds[i].lastBow===boat.id && time<minds[i].release);
          }).sort((a,b)=>a.d-b.d);
        for(const side of [-1,1]){
          if(taken.includes(side)||!nearest.length||!openPoint(boat,side))continue;
          const {s,i}=nearest.shift();s.bowId=boat.id;minds[i].side=side;
        }
      }
    }
    function openPoint(b,side){const p=bowPoint(b,side,b===world.yacht,time,0);return open(p.x,p.z);}
    for(const [i,s] of state.entries()){
      const m=minds[i];
      if(s.ageSinceHit!=null)s.ageSinceHit=Math.min(150,s.ageSinceHit+dt);
      if(!s.hp){
        if(s.ageSinceHit<150){
          const floating=floatingBody(s.deathY,water,s.size,s.ageSinceHit);
          s.y=round(floating.y);s.roll=round(floating.roll);continue;
        }
        const [x,z]=homes[i];
        Object.assign(m,{x,z,y:water-.85,yaw:0,speed:1,lastBow:null,release:time+2,nextCall:time+6+i});
        Object.assign(s,{x,z,y:m.y,yaw:0,pitch:0,roll:0,hp:s.maxHp,ageSinceHit:null,deathY:null,deathKind:null,hitX:null,hitY:null,hitZ:null});
      }
      const boat=underway.find(b=>b.id===s.bowId);
      const a=time*.155+i,home=homes[i];
      const goal=boat?bowPoint(boat,m.side,boat===world.yacht,time,boat.speed*.37):
        {x:home[0]+2.8*Math.sin(a),z:home[1]+5.2*Math.cos(a)};
      const dx=goal.x-m.x,dz=goal.z-m.z,d=Math.hypot(dx,dz);
      const heading=Math.atan2(dx,-dz);
      const turn=Math.atan2(Math.sin(heading-m.yaw),Math.cos(heading-m.yaw));
      m.yaw+=clamp(turn,-2.8*dt,2.8*dt);
      const desired=boat?Math.min(19,Math.max(.55,boat.speed*.55+d*1.6)):Math.min(4.1,.75+d*.55);
      m.speed+=(desired-m.speed)*Math.min(1,dt*2.4);
      const stride=Math.min(d,m.speed*dt);
      const x=m.x+Math.sin(m.yaw)*stride,z=m.z-Math.cos(m.yaw)*stride;
      if(open(x,z,s.size)){m.x=x;m.z=z;}
      else if(open(m.x,z,s.size))m.z=z;
      else if(open(x,m.z,s.size))m.x=x;
      else if(boat){s.bowId=null;m.lastBow=boat.id;m.release=time+3;}
      const cycle=boat?4.5+i%3*.42:7.2+i%3*.57,phase=(time+i*1.77)%cycle;
      const surfacing=phase<2.1?Math.sin(Math.PI*phase/2.1)**2:0;
      let floor=bottom(m.x,m.z,s.size),cover=0;
      for(const hull of all){
        if(distance(hull,m)>42)continue;
        const large=hull===world.yacht,r=1.85*s.size;
        const side=manateeHullClearance(hull,m.x,m.z,large);
        const forecast=manateeHullClearance(hull,m.x+Math.sin(m.yaw)*m.speed*.65,
          m.z-Math.cos(m.yaw)*m.speed*.65,large,.65);
        const ceiling=keel(hull,water,large)-.76*s.size;
        const danger=Math.min(side.distance,forecast.distance);
        const margin=boat===hull ? .7 : 2.5;
        if(danger>r+margin)continue;
        if(floor>ceiling && side.distance<r){
          // Too shallow to pass underneath. Move to the closest clear side
          // of the hull and then resume the ordinary course from there.
          const step=r+.05-side.distance;
          const sx=m.x+side.x*step,sz=m.z+side.z*step;
          if(open(sx,sz,s.size)){
            m.x=sx;m.z=sz;floor=bottom(sx,sz,s.size);
            continue;
          }
        }
        const evasion=clamp((r+margin-danger)/margin,0,1);
        cover=Math.max(cover,(water-ceiling)*evasion);
        if(side.distance<r)m.y=Math.min(m.y,ceiling);
      }
      const prev=m.y;
      const swimDepth=.9-surfacing*(boat?1.38:1.10);
      const target=water-(cover?Math.max(cover,swimDepth):swimDepth);
      m.y=Math.max(floor,m.y+(target-m.y)*Math.min(1,dt*7));
      m.stroke=(m.stroke+dt*(2.5+.36*m.speed))%tau;
      const air=surfacing>.65 && m.y>water-.18 && !cover?phase-.62:-1;
      Object.assign(s,{x:round(m.x),z:round(m.z),y:round(m.y),yaw:round(Math.atan2(Math.sin(m.yaw),Math.cos(m.yaw))),
        pitch:round(clamp(Math.atan2(m.y-prev,Math.max(.02,stride)),-.52,.48)),
        roll:round(clamp(-turn*.15,-.29,.29)),stroke:round(m.stroke),air:round(air)});
      if(time>=m.nextCall){
        m.nextCall=time+(boat?8:20)+(i*2.1+s.callSeq*1.7)%7;
        s.callSeq++;s.callKind=s.callSeq%3===1?'whistle':'clicks';
      }
    }
  }
  return {state,step};
}
