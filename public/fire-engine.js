import {coastSpeed} from './road-coasting.js';
import {CITY,MAP,groundHeight,buildingTopAt,insideTravelArea} from './world.js';
import {roadway} from './brickell-map.js';
import {roadContact} from './road-contact.js';
import {gapAhead,roadUsers} from './lane-clearance.js';
import {fireSite} from './district-fire.js';
import {newLife} from './rivals.js';

import {waterRange,monitorHeight,engineBay,waterDrop,nozzleLength,jetPassage} from './water-monitor.js';
const jobs=new WeakMap(),trigger=new WeakMap();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const snap=x=>Math.round(x*100)/100;

export function fireEngine(id=0,at=engineBay,yaw=0){
  const key='fire-engine-'+id;
  return {id:key,kind:key,model:'engine',x:at.x,y:groundHeight(at.x,at.z),z:at.z,yaw,
    speed:0,fuel:100,steer:0,lateralSpeed:0,engineLoad:0,driver:null,npcDriver:null,
    hp:450,maxHp:450,flatTires:0,bodyDamage:{front:0,rear:0,left:0,right:0},
    wrecked:false,monitorYaw:yaw,monitorPitch:0};
}

// Server and clients use the same roof pivot; the endpoint on the wire also
// supplies the visible impact, so a stream ends at the same obstruction.
export function waterEnd(world,car,yaw,pitch,maxRange=waterRange){
  const h=Math.cos(pitch),dx=Math.sin(yaw)*h,dy=Math.sin(pitch),dz=-Math.cos(yaw)*h;
  const at=d=>({x:car.x+d*dx,y:car.y+monitorHeight+d*dy-waterDrop(d),z:car.z+d*dz});
  const solid=p=>p.y<=Math.max(MAP.waterY,groundHeight(p.x,p.z,p.y,world.doors)) ||
    buildingTopAt(p.x,p.z,0,p.y,world.doors)>=p.y;
  let previous=nozzleLength;
  for(let d=nozzleLength;d<maxRange+.5;d+=.5){
    let distance=Math.min(d,maxRange),point=at(distance),nx=0,ny=0,nz=0;
    const hit=solid(point);
    if(hit){
      // Refine a boundary so the foam bursts against the visible face.
      let lo=previous,hi=distance;
      for(let i=0;i<4;i++){
        const mid=(lo+hi)*.5;
        if(solid(at(mid)))hi=mid;else lo=mid;
      }
      distance=lo;point=at(distance);
      if(solid({...point,y:point.y-.05}))ny=1;
      else if(solid({...point,x:point.x+Math.sign(dx)*.05}))nx=-Math.sign(dx);
      else nz=-Math.sign(dz);
    }
    if(hit || distance===maxRange)return {x:snap(point.x),y:snap(point.y),z:snap(point.z),d:snap(distance),
      ...(hit && {nx,ny,nz})};
    previous=distance;
  }
}

function stream(world,car,tick){
  const since=car.water?.since??tick;
  if(tick%3!==0 && car.water)return;
  const reach=Math.min(waterRange,nozzleLength+2.5*(tick-since+1));
  const end=waterEnd(world,car,car.monitorYaw,car.monitorPitch,reach);
  car.water={...end,since};
  for(const [key,f] of Object.entries(world.doors.fires??{})){
    if(f.stage!=='burning')continue;
    // Wet any of the visible flame columns, including the second pump and
    // the spreading face of a house. Water hitting the upper flame counts.
    const site=fireSite(key),spread=f.level;
    const alongX=site.kind==='house' && Math.abs(f.z-site.z)/site.d>Math.abs(f.x-site.x)/site.w;
    function wets(x,y,z){
      const hit=jetPassage(car,end,x,z);
      if(hit && Math.hypot(hit.side,hit.height-y)<=1.27)return true;
      return Math.hypot(end.x-x,end.y-y,end.z-z)<=1.27;
    }
    const base=site.kind==='station'?1:Math.max(.87,f.y-.63);
    const height=.6+spread*(site.kind==='house'?1.1:.9);
    const column=(x,z)=>wets(x,base+.16,z)||wets(x,base+height*.5,z)||wets(x,base+height,z);
    let touched=column(f.x,f.z);
    if(!touched && site.kind==='station' && spread>1)
      touched=column(site.x-3.7,site.z)||column(site.x+3.7,site.z);
    if(!touched && site.kind==='house'){
      const span=spread*(1.45+spread*.48);
      for(const offset of [-.5,-.25,.25,.5]){
        const x=alongX?clamp(f.x+offset*span,site.x-site.w/2,site.x+site.w/2):f.x;
        const z=alongX?f.z:clamp(f.z+offset*span,site.z-site.d/2,site.z+site.d/2);
        if(column(x,z)){touched=true;break;}
      }
    }
    if(!touched)continue;
    // Holding the stream progressively rolls back the arcade fire stages.
    f.start+=7;
    if(f.start>tick+72){
      delete world.doors.fires[key];
      if(key==='pelican-fuel')world.doors.fuelHits=0;
      if(!Object.keys(world.doors.fires).length)delete world.doors.fires;
    }
  }
}
export function driveWater(world,car,input,tick){
  if(input){
    car.monitorYaw=input.aimYaw??car.monitorYaw;car.monitorPitch=clamp(input.aimPitch??car.monitorPitch,-1.18,1.24);
    trigger.set(car,input.fire?tick+4:0);
  }
  if(car.driver!=null && car.fuel!==0 && !car.boarding && !car.takeover && !car.wrecked && !car.sling && tick<(trigger.get(car)??0))stream(world,car,tick);
  else delete car.water;
}

function staging(world,f,actors){
  let best,score=-Infinity;
  const probe=fireEngine(1);
  // An incident gets a short local approach and departure lane on walkable,
  // unoccupied ground. Prefer pavement; rural access and beach sand also work.
  for(const radius of [9,17,25])for(let k=0;k<16;k++){
    const a=k*Math.PI/8,sideX=Math.cos(a),sideZ=Math.sin(a);
    const x=f.x+sideX*radius,z=f.z+sideZ*radius;
    const y=groundHeight(x,z);
    if(y<=MAP.waterY+.32 || !insideTravelArea(x,z,2,2))continue;
    const targetYaw=Math.atan2(f.x-x,z-f.z),pitch=Math.atan2(f.y-y-monitorHeight+waterDrop(radius),radius);
    const end=waterEnd(world,{x,y,z},targetYaw,pitch);
    if(Math.hypot(end.x-x,end.y-y-monitorHeight,end.z-z)+1.45<Math.hypot(radius,f.y-y-monitorHeight))continue;
    for(const offset of [Math.PI/2,-Math.PI/2,Math.PI,0]){
      const dx=Math.cos(a+offset),dz=Math.sin(a+offset),yaw=Math.atan2(dx,-dz);
      const run=CITY?14:8;
      let quality=0,clear=true;
      for(let i=-run;i<=0;i+=2){
        const px=x+i*dx,pz=z+i*dz,py=groundHeight(px,pz);
        Object.assign(probe,{x:px,z:pz,y:py,yaw});
        if(!insideTravelArea(px,pz,2,2) || py<=MAP.waterY+.32 || Math.abs(py-y)>(CITY?3:8) ||
            roadContact(world,px,pz,yaw,px,pz,probe) ||
            (i<= -run+1 && actors.some(b=>Math.hypot(px-b.state.x,pz-b.state.z)<3.5))){
          clear=false;break;
        }
        if(CITY && roadway(px,pz))quality++;
      }
      if(!clear)continue;
      quality-=radius*.10;
      if(quality>score){score=quality;best={x:x-run*dx,z:z-run*dz,dx,dz,yaw,run};}
      if(score>=run/2-1)return best;
    }
  }
  return best;
}

export function stepFireEngines(world,players,npcs,tick,dt){
  let dispatch=jobs.get(world);
  if(!dispatch){dispatch={units:new Map(),called:new WeakSet(),retry:0};jobs.set(world,dispatch);}
  const {units}=dispatch,active=world.doors.fires;
  if(!units.size && (!active || tick<dispatch.retry))return;
  const {actors,vehicles}=roadUsers(world,players,npcs);
  if(active && tick>=dispatch.retry){
    dispatch.retry=tick+15;
    const fire=Object.entries(active).find(([id,f])=>f.stage==='burning' && tick-f.start>=Math.min(120,fireSite(id).duration*.25) && !dispatch.called.has(f));
    const slot=[1,2].find(i=>!world.traffic.some(c=>c.id==='fire-engine-'+i));
    if(fire && slot){
      const [site,f]=fire,lane=staging(world,f,actors);
      if(lane){
        const car=fireEngine(slot,lane,lane.yaw),npcId='responder-'+slot;
        const npc=npcs.find(n=>n.id===npcId)??{id:npcId,name:'Fire crew',weapon:1};
        Object.assign(npc,{state:{x:car.x,y:car.y,z:car.z,grounded:true},life:newLife(tick,false),yaw:lane.yaw,
          next:0,moving:false,pauseUntil:0,route:{points:[[lane.x,lane.z],[lane.x+1,lane.z]]}});
        if(!npcs.includes(npc))npcs.push(npc);
        car.npcDriver=npcId;car.response='arriving';car.speed=6;
        world.traffic.push(car);dispatch.called.add(f);units.set(slot,{car,npc,lane,site,distance:0});
      }
    }
  }
  for(const [slot,u] of units){
    const {car,lane,npc}=u;
    // The ordinary traffic handoff now owns the car and the responder on foot.
    if(!car.npcDriver || car.driver!=null || car.takeover || car.wrecked || !npc.life.hp){
      delete car.response;delete car.water;units.delete(slot);continue;
    }
    if(car.sling){delete car.water;continue;}
    const f=active?.[u.site],burning=f?.stage==='burning' && world.doors.fires?.[u.site]===f;
    const powered=car.fuel!==0;
    if(!burning){car.response='departing';delete car.water;}
    // Retrace the surveyed approach when leaving. This also works in short
    // rural clearings where an engine cannot continue through the hillside.
    const reverse=powered?!burning:car.speed<0,limit=reverse?0:lane.run;
    const gap=gapAhead(reverse?{...car,yaw:car.yaw+Math.PI}:car,actors,
      reverse?vehicles.filter(v=>v!==car):vehicles,world.jet);
    const target=Math.min(8.5,Math.sqrt(12*Math.max(0,Math.min(Math.abs(limit-u.distance),gap))));
    const pace=powered?Math.abs(car.speed)+clamp(target-Math.abs(car.speed),-7*dt,3.6*dt):
      Math.min(Math.abs(coastSpeed(car.speed,dt)),target);
    const step=Math.max(0,Math.min(pace*dt,Math.abs(limit-u.distance),gap));
    car.speed=reverse?-pace:pace;u.distance+=(reverse?-1:1)*step;car.x=lane.x+lane.dx*u.distance;car.z=lane.z+lane.dz*u.distance;
    car.y=groundHeight(car.x,car.z);car.engineLoad=powered && step>0?.65:0;
    if(!powered){delete car.water;continue;}
    // A returning pumper and a civilian waiting behind it can yield to each
    // other indefinitely on a one-lane approach. Release an offscreen crew
    // once stopped; a player in sight of the apparatus always sees it stay.
    const blocked=reverse && step<.001 && gap<.10;
    u.stopped=blocked?(u.stopped??0)+dt:0;
    const unseenQueue=u.stopped>3 && ![...players.values()].some(({state})=>
      Math.hypot(state.x-car.x,state.z-car.z)<195);
    if(Math.abs(u.distance-limit)<.008 || (burning && gap<.1) || unseenQueue){
      car.speed=0;
      if(burning){
        car.response='spraying';car.monitorYaw=Math.atan2(f.x-car.x,car.z-f.z);
        const distance=Math.hypot(f.x-car.x,f.z-car.z);
        car.monitorPitch=Math.atan2(f.y-car.y-monitorHeight+waterDrop(distance),distance);
        stream(world,car,tick);
      }else{
        world.traffic.splice(world.traffic.indexOf(car),1);npcs.splice(npcs.indexOf(npc),1);units.delete(slot);
      }
    }else delete car.water;
  }
}
