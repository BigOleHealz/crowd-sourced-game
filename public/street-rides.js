// A full half-turn takes 12 ticks, leaving room to steer after takeoff.
const ollieTurnRate=Math.PI*30/12,dropTurnRate=Math.PI*30/14;
const cleanAlignment=Math.cos(Math.PI/6);
export const rideTravelYaw=ride=>ride.yaw+(ride.reverse?Math.PI:0);

// Ride input is shared by the authoritative simulation and local prediction.
export function rollingMotion(ride,input,dt,grounded,grade=0,boardAir=false){
  const push=input.throttle || 0, steer=input.steer || 0;
  const bike=ride.kind==='bike';
  const acceleration=bike?3.7:4.6,braking=bike?12:10,drag=bike ? .43 : .85;
  const drive=push>0?acceleration*push:push<0?braking*push:-drag;
  const force=drive-9.8*Math.sin(Math.atan(grade));
  const speed=Math.min(bike?11.5:8.4,Math.max(0,ride.speed+(grounded?force*dt:0)));
  // Wheelbase determines the bicycle's turning arc. Limit lateral acceleration
  // at speed; the same steering input makes a tighter turn at walking pace.
  const bikeTurn=Math.min(speed*Math.tan(.59)/1.07,7/Math.max(1,speed));
  const boardTurn=Math.min(speed/2.2,1)*1.85;
  const ollie=boardAir && (grounded || ride.ollieTurn!=null);
  const rate=ollie?ollieTurnRate:boardAir?dropTurnRate:grounded?(bike?bikeTurn:boardTurn):.32;
  const delta=steer*dt*rate;
  const started=grounded?0:(ride.ollieTurn??0);
  // Holding a direction through touchdown settles at a half-turn. Steering
  // back toward the takeoff heading still allows midair corrections.
  const angle=ollie?Math.max(-Math.PI,Math.min(Math.PI,started+delta)):null;
  const yaw=ride.yaw+(ollie?angle-started:delta);
  const pushing=grounded && push>.08;
  if(bike)return {...ride,yaw,speed,steer,pushing,phase:((ride.phase||0)+(pushing?Math.min(10,speed*1.8)*dt:0))%(2*Math.PI)};
  const next={...ride,yaw,speed,steer,pushing};
  if(ollie)next.ollieTurn=angle;
  else delete next.ollieTurn;
  return next;
}

export function landBoard(next){
  const {ride,vx,vz}=next,{yaw,speed}=ride;
  if(speed<.05)return;
  const x=Math.sin(yaw),z=-Math.cos(yaw),along=x*vx+z*vz;
  if(Math.abs(along)<speed*cleanAlignment){
    if(speed>=2.6){
      next.skateBail={yaw,damage:Math.round(4+3*Math.abs(z*vx-x*vz))};
      delete next.ride;
      return;
    }
    next.vx=x*along;next.vz=z*along;ride.speed=Math.abs(along);
  }
  if(along<0)ride.reverse=true;
  else delete ride.reverse;
}

export function boardRacks(ground){
  return [[2,16],[-2.6,17]].map(([x,z],i)=>({
    id:'skateboard-'+(i+1),kind:'board',label:'skateboard',x,y:ground(x,z),z,yaw:0,rider:null
  }));
}

export function parkRide(world,player,reset=false){
  const item=world.rides?.find(r=>r.rider===player.id);
  if(!item)return;
  item.rider=null;
  if(reset)Object.assign(item,item.home);
  delete player.state.ride;
}

export function takeRide(item,player){
  if(item.rider!=null || !player.state.grounded || player.state.swimming)return;
  item.rider=player.id;
  player.state={x:item.x,y:item.y,z:item.z,vy:0,grounded:true,
    ride:{id:item.id,kind:item.kind,speed:0,yaw:item.yaw,steer:0}};
  player.yaw=item.yaw;
}
