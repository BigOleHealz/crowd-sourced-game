// Ride input is shared by the authoritative simulation and local prediction.
export function rollingMotion(ride,input,dt,grounded,grade=0){
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
  const yaw=ride.yaw+steer*dt*(grounded?(bike?bikeTurn:boardTurn):.32);
  const pushing=grounded && push>.08;
  if(bike)return {...ride,yaw,speed,steer,pushing,phase:((ride.phase||0)+(pushing?Math.min(10,speed*1.8)*dt:0))%(2*Math.PI)};
  return {...ride,yaw,speed,steer,pushing};
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
