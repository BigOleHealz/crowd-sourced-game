import {stepSuspension} from './road-suspension.js';
import {coastSpeed} from './road-coasting.js';
import {enterRoadWater,stepRoadSinking} from './road-water.js';
import {ramHouse} from './residential-falls.js';
import {damageRover} from './rover.js';
import {CITY,MAP,groundHeight,blocked,spawn} from './world.js';
import {roadContact,sweepRoad} from './road-contact.js';
import {vehicleContact} from './vehicle-contact.js';
import {tankPad} from './tank-layout.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function parkedTank(){
  return {...tankPad,kind:'tank',y:groundHeight(tankPad.x,tankPad.z),yaw:0,turretYaw:0,turretPitch:0,
    driver:null,speed:0,fuel:100,turnRate:0,hp:750,maxHp:750,wrecked:false,recoverySeconds:0};
}
export function nearTank(tank,state){
  return !!tank && !tank.wrecked && !tank.sinking && tank.driver==null && state?.grounded &&
    Math.hypot(tank.x-state.x,tank.y-state.y,tank.z-state.z)<3.15;
}
export function leaveTank(world,player){
  const tank=world.tank;
  if(!tank || tank.driver!==player.id)return false;
  tank.driver=null;tank.speed=tank.turnRate=0;
  for(const side of [-1,1])for(const aft of [0,1.3,-1.3,2.8]){
    const x=tank.x+2.05*side*Math.cos(tank.yaw)-aft*Math.sin(tank.yaw);
    const z=tank.z+2.05*side*Math.sin(tank.yaw)+aft*Math.cos(tank.yaw);
    const y=groundHeight(x,z,tank.y+1.3,world.doors);
    if(y<MAP.waterY+.1 || Math.abs(y-tank.y)>1 || blocked(x,y,z,world.hp,world.doors) || vehicleContact(x,y,z,world,CITY).depth)continue;
    player.state={x,y,z,grounded:true,vy:0};return true;
  }
  player.state=world.rules?.spawn(player)??spawn(player.id-1);
  return true;
}
export function damageTank(world,amount,players,owner){
  const tank=world.tank;
  if(!tank || tank.wrecked || tank.sinking || !(amount>0))return;
  tank.hp=Math.max(0,tank.hp-amount);
  if(tank.hp)return;
  world.wanted?.record(owner,'wreck');
  const driver=players?.get(tank.driver);
  if(driver)leaveTank(world,driver);
  tank.driver=null;tank.speed=tank.turnRate=0;tank.wrecked=true;tank.recoverySeconds=9;
}
export function stepTank(world,input,dt,players){
  const t=world.tank;
  if(t.sinking && !stepRoadSinking(world,t,dt))return;
  if(t.wrecked || t.sinking){
    t.recoverySeconds=Math.max(0,t.recoverySeconds-dt);
    if(!t.recoverySeconds && !roadContact(world,tankPad.x,tankPad.z,0,tankPad.x,tankPad.z,t)){delete t.sinking;delete t.wading;Object.assign(t,parkedTank());}
    return;
  }
  if(t.driver==null)return;
  const throttle=input?.throttle??0, steer=input?.steer??0;
  const target=throttle*(throttle<0?2.5:7);
  const accel=throttle && throttle*t.speed>=0?2.9:6;
  const powered=t.fuel!==0;
  if(powered)t.speed+=clamp(target-t.speed,-accel*dt,accel*dt);
  else if(throttle*t.speed<0)t.speed+=clamp(-t.speed,-6*dt,6*dt);
  else t.speed=coastSpeed(t.speed,dt);
  // A tank needs track power to pivot in place. Equalize the tracks on cutoff.
  if(!powered)t.turnRate=0;
  else t.turnRate+=(steer*(1.0-.035*Math.abs(t.speed))-t.turnRate)*(1-Math.exp(-4*dt));
  const yaw=t.yaw+t.turnRate*dt;
  if(!roadContact(world,t.x,t.z,yaw,t.x,t.z,t))t.yaw=Math.atan2(Math.sin(yaw),Math.cos(yaw));
  else t.turnRate=0;
  if(t.speed){
    const dx=Math.sin(t.yaw)*t.speed*dt,dz=-Math.cos(t.yaw)*t.speed*dt;
    let {fraction,hit}=sweepRoad(world,t,dx,dz);
    while(hit){
      if(hit.home && dx*hit.nx+dz*hit.nz<0 &&
          ramHouse(world.doors,hit.home,t.x-hit.nx*2,t.z-hit.nz*2,dx,dz)){
        world.rules?.damageProperty(players?.get(t.driver)?.team,{x:t.x,y:t.y,z:t.z},'house:'+hit.home,'House facade',250_000);
        t.speed*=.74;
        ({fraction,hit}=sweepRoad(world,t,dx,dz));continue;
      }
      const car=hit.object;
      if(!car || (car!==world.rover && car!==world.supercar && !world.traffic?.includes(car)))break;
      // A track can clear an existing wreck too. A fresh crush uses the
      // normal lethal vehicle damage path for ejection, credit and recovery.
      const driver=players?.get(t.driver);
      damageRover(world,car.hp,players,car.kind??'rover',driver?.team,world.wanted?.session(driver));
      car.crushed=true;
      ({fraction,hit}=sweepRoad(world,t,dx,dz));
    }
    t.x+=dx*fraction;t.z+=dz*fraction;t.y=groundHeight(t.x,t.z,t.y+1,world.doors);
    if(hit)t.speed=0;
    if(enterRoadWater(world,t,players,dt) && t.sinking)return;
  }
  stepSuspension(t,dt,(x,z)=>groundHeight(x,z,t.y+1.65,world.doors));
  if(Number.isFinite(input?.aimYaw))t.turretYaw=input.aimYaw;
  if(Number.isFinite(input?.aimPitch))t.turretPitch=clamp(input.aimPitch,-.25,.85);
}
