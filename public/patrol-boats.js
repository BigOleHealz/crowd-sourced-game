import {partySites,cruisePartyYacht,resetCruise} from './party-cruises.js';
import {jettySections,nearJetty} from './marina-docks.js';
import {waterHelm} from './water-helm.js';
import {damageYacht} from './superyacht.js';
import {yachtOverlap} from './yacht-layout.js';
import {supercarLayout} from './supercar-layout.js';
import {CITY,MAP,insideTravelArea,groundHeight,solidTopAt,blocked} from './world.js';
import {vehicleContact} from './vehicle-contact.js';
import {mountPosition} from './mounts.js';
import {hullSize,marinaBerths,marinaModel} from './marina-fleet-layout.js';

const berths=[{id:'bay-rhib',x:46,z:14},{id:'key-rhib',x:67,z:-201,yaw:.12}];
// Hull-local crown of the helm cushion. The ranger's trouser seat is .893 m
// above its rig origin, before the seated scale is applied.
export const helmCushion = {z: -.32, top: 1.018};
export const helmWheel = {y: 1.215, z: -.675, radius: .13, tilt: -.48};
export const seatedScale = .85;
export const helmOffset = [0, helmCushion.top - .893 * seatedScale, helmCushion.z];
const patrolHelm={scale:seatedScale,offset:helmOffset,wheel:helmWheel};
export const boatHelm=boat=>marinaModel(boat)?.helm??patrolHelm;
const waveClock=new WeakMap();
function moored(site) {
  const hp=marinaModel(site)?.maxHp??300;
  return {...site,fuel:100,y:MAP.waterY,yaw:site.yaw??0,pitch:0,roll:0,speed:0,yawRate:0,slip:0,throttle:0,driver:null,gunner:null,
    turretYaw:0,turretPitch:0,hp,maxHp:hp,wrecked:false,recoverySeconds:0};
}
export const patrolFleet=()=>CITY?berths.map(moored):[];
export const partyFleet=()=>CITY?partySites.map(moored):[];
export const marinaFleet=()=>CITY?marinaBerths.map(moored):[];
export const crewBoat=(world,id)=>id==null?null:world?.boats?.find(b=>b.driver===id||b.gunner===id);
// Keep delayed hull motion while local seat changes take effect on their first frame.
export function localBoatFrame(sampled, assigned, id) {
  let found=false;
  const boats=sampled.map(hull=>{
    if(assigned && hull.id===assigned.id) {
      found=true;
      return {...hull,driver:assigned.driver,gunner:assigned.gunner};
    }
    if(id!=null && (hull.driver===id || hull.gunner===id))
      return {...hull,driver:hull.driver===id?null:hull.driver,gunner:hull.gunner===id?null:hull.gunner};
    return hull;
  });
  if(assigned && !found)boats.push(assigned);
  return boats;
}
export function nearBoat(world,feet) {
  if(!feet || (!feet.grounded && !feet.swimming))return null;
  let best=null,range=3.85;
  for(const b of world.boats??[]) {
    if(b.wrecked || b.sling)continue;
    const model=marinaModel(b),dx=feet.x-b.x,dz=feet.z-b.z;
    let d=Math.hypot(dx,feet.y-b.y,dz);
    if(model){
      if(b.driver!=null || Math.abs(b.speed)>2.8)continue;
      const s=Math.sin(b.yaw),c=Math.cos(b.yaw);
      const side=Math.abs(c*dx+s*dz),along=-s*dx+c*dz;
      // At the pier, players step aboard along the cockpit and aft platform.
      // The bow points into the fairway and supplies no boarding prompt.
      const reach=Math.hypot(Math.max(0,side-model.halfWidth),
        Math.max(0,along-model.halfLength,-along-model.halfLength*.46));
      if(reach>1.28 || feet.y>b.y+model.deck+.80 || feet.y<b.y-1.05)continue;
      d=reach+Math.abs(feet.y-b.y)*.20;
    }else if(b.driver!=null && b.gunner!=null)continue;
    if(d<range){best=b;range=d;}
  }
  return best;
}
function disembark(world,b,player) {
  const c=Math.cos(b.yaw),s=Math.sin(b.yaw);
  const model=marinaModel(b);
  const exits=model?[
    [-model.halfWidth-.62,0],[model.halfWidth+.62,0],
    [-model.halfWidth-.62,model.halfLength*.50],[model.halfWidth+.62,model.halfLength*.50],
    [0,model.halfLength+.68],[0,-model.halfLength-.68],
    [-model.halfWidth-1.4,0],[model.halfWidth+1.4,0],
  ]:[[-2,0],[2,0],[-2.1,1.3],[2.1,1.3],[0,3.4],[0,-3.4],[-3.5,0],[3.5,0]];
  let waterExit=null;
  for(const [right,along] of exits) {
    const x=b.x+c*right-s*along,z=b.z+s*right+c*along;
    if(!insideTravelArea(x,z))continue;
    const ground=groundHeight(x,z,b.y+1.35,world.doors), swimming=ground<MAP.waterY-.72-.03;
    const y=swimming?MAP.waterY-.72:ground;
    if(y>b.y+1.35 || blocked(x,y,z,world.hp,world.doors) || vehicleContact(x,y,z,world,CITY).depth)continue;
    const exit={x,y,z,vx:0,vy:0,vz:0,grounded:!swimming,...(swimming?{swimming:true}:{})};
    if(ground>=MAP.waterY){player.state=exit;return true;}
    waterExit??=exit;
  }
  if(waterExit)player.state=waterExit;
  return !!waterExit;
}
export function interactBoat(world,b,player) {
  if(!b||b.wrecked)return;
  if(b.driver===player.id || b.gunner===player.id){
    if(!disembark(world,b,player))return;
    if(b.driver===player.id){b.driver=null;b.throttle=0;}else b.gunner=null;
  }else if(nearBoat(world,player.state)===b){
    if(b.driver==null){
      b.driver=player.id;
      if(b.partyYacht)b.cruising=false;
      if(marinaModel(b))world.wanted?.record(world.wanted.session(player),'theft');
    }else if(!marinaModel(b) && b.gunner==null){b.gunner=player.id;b.turretYaw=b.yaw;b.turretPitch=0;}
  }
}
export function damageBoat(world,b,amount,players,owner) {
  if(b.wrecked||!Number.isFinite(amount)||amount<=0)return;
  b.hp=Math.max(0,b.hp-amount);if(b.hp)return;
  world.wanted?.record(owner,'wreck');
  for(const id of [b.driver,b.gunner]){
    const actor=players?.get(id);
    if(actor && !disembark(world,b,actor)){
      actor.state={x:b.x,y:MAP.waterY-.72,z:b.z,vx:0,vy:0,vz:0,grounded:false,swimming:true};
    }
  }
  Object.assign(b,{driver:null,gunner:null,speed:0,yawRate:0,slip:0,throttle:0,wrecked:true,recoverySeconds:6});
}
// Hull footprints are oriented rectangles; test the four separating axes.
const patrolFootprint={halfWidth:1.04,halfLength:2.65};
const footprint=boat=>marinaModel(boat)??patrolFootprint;
function overlaps(x,z,yaw,own,other,halfWidth,halfLength){
  const dx=other.x-x,dz=other.z-z;
  if(Math.hypot(dx,dz)>Math.hypot(own.halfWidth,own.halfLength)+Math.hypot(halfWidth,halfLength))return false;
  const a=Math.cos(yaw),b=Math.sin(yaw),c=Math.cos(other.yaw),d=Math.sin(other.yaw);
  for(const [nx,nz] of [[a,b],[-b,a],[c,d],[-d,c]]){
    const span=own.halfWidth*Math.abs(nx*a+nz*b)+own.halfLength*Math.abs(-nx*b+nz*a)
      +halfWidth*Math.abs(nx*c+nz*d)+halfLength*Math.abs(-nx*d+nz*c);
    if(Math.abs(dx*nx+dz*nz)>=span)return false;
  }
  return true;
}
export function nearbyHull(boats,vehicle,x,z,yaw,halfWidth,halfLength){
  return boats?.find(b=>b!==vehicle && !b.wrecked && overlaps(b.x,b.z,b.yaw,footprint(b),{x,z,yaw},halfWidth,halfLength));
}
function insideChart(b,x,z,yaw) {
  const c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));
  const {halfWidth,halfLength}=hullSize(b);
  const halfX=halfWidth*c+halfLength*s,halfZ=halfWidth*s+halfLength*c;
  return insideTravelArea(x,z,halfX,halfZ);
}
function canFloat(world,b,x,z,yaw) {
  const model=marinaModel(b),hull=hullSize(b),{halfWidth,halfLength}=hull,own=footprint(b);
  if(!insideChart(b,x,z,yaw) || yachtOverlap(world.yacht,x,z,yaw,halfWidth,halfLength))return false;
  if(nearJetty(x,z,halfLength+halfWidth) &&
    jettySections.some(r=>overlaps(x,z,yaw,hull,r,r.halfWidth,r.halfLength)))return false;
  const c=Math.cos(yaw),s=Math.sin(yaw);
  // Enclose the collar, outboard, crew and stern aerial through pitch and roll.
  const clearance=b.y+Math.max(2.5,(model?.roof??0)+.15);
  const draft=model?-model.keel+.035:.24;
  const stations=model?[-halfLength,-halfLength*.51,0,halfLength*.53,halfLength]:[-halfLength,0,halfLength];
  for(const dz of stations)for(const dx of [-halfWidth,0,halfWidth]){
    const px=x+c*dx-s*dz,pz=z+s*dx+c*dz;
    if(solidTopAt(px,pz,world.hp,0,clearance,world.doors)>MAP.waterY-draft)return false;
  }
  if(nearbyHull(world.boats,b,x,z,yaw,own.halfWidth,own.halfLength))return false;
  return !(world.heli.y<MAP.waterY+1.5 && overlaps(x,z,yaw,own,world.heli,1.28,3.6))
    && !(world.rover.y<MAP.waterY+.75 && overlaps(x,z,yaw,own,world.rover,.86,1.75))
    && !(world.supercar?.y<MAP.waterY+.75 && overlaps(x,z,yaw,own,world.supercar,supercarLayout.halfWidth,supercarLayout.halfLength));
}
export function stepBoat(world,b,input,dt,players){
  if((b.sling || b.beached) && !b.wrecked)return;
  if(b.wrecked){
    delete b.beached;
    b.recoverySeconds=Math.max(0,b.recoverySeconds-dt);
    if(b.recoverySeconds<.0001){
      const site=berths.find(p=>p.id===b.id)??marinaBerths.find(p=>p.id===b.id)??partySites.find(p=>p.id===b.id);
      // Hold recovery if another hull is occupying the berth.
      if(site && canFloat(world,b,site.x,site.z,site.yaw??0)){Object.assign(b,moored(site));if(b.partyYacht)resetCruise(b);}
    }
    return;
  }
  if(cruisePartyYacht(world,b,dt,canFloat))return;
  const t=(waveClock.get(b)??0)+dt;waveClock.set(b,t);
  const model=marinaModel(b),own=footprint(b);
  const turn=waterHelm(b,input,dt);
  const proposed=b.yaw+turn;
  if(turn && canFloat(world,b,b.x,b.z,proposed))b.yaw=Math.atan2(Math.sin(proposed),Math.cos(proposed));
  else if(turn)b.yawRate=b.slip=0;
  if(b.speed){
    const x=b.x+Math.sin(b.yaw+b.slip)*b.speed*dt,z=b.z-Math.cos(b.yaw+b.slip)*b.speed*dt;
    if(canFloat(world,b,x,z,b.yaw)){b.x=x;b.z=z;}
    else {
      const amount=Math.round((Math.abs(b.speed)-5)*4);
      if(amount>0 && insideChart(b,x,z,b.yaw)){
        const owner=world.wanted?.session(players?.get(b.driver));
        const other=nearbyHull(world.boats,b,x,z,b.yaw,own.halfWidth,own.halfLength);
        if(other)damageBoat(world,other,amount,players,owner);
        const {halfWidth,halfLength}=hullSize(b);
        if(yachtOverlap(world.yacht,x,z,b.yaw,halfWidth,halfLength))damageYacht(world,amount,undefined,owner);
        damageBoat(world,b,amount,players,owner);
      }
      b.speed=b.yawRate=b.slip=0;
    }
  }
  if(b.wrecked)return;
  const wave=Math.sin(t*1.65+b.z*.18+b.x*.08);
  b.y=MAP.waterY+(model?.wave.rise??.034)*wave;
  const trim=(model?.wave.trim??.035)*Math.max(0,b.speed)/(model?.hydrodynamics.ahead??12.5);
  b.pitch+=((.013*wave+trim)-b.pitch)*Math.min(1,dt*6);
  const roll=.018*Math.sin(t*1.22+b.x*.17)-b.yawRate*Math.abs(b.speed)*.012+(b.wakeRoll??0);
  b.roll+=(roll*(model?.wave.roll??1)-b.roll)*Math.min(1,dt*5);
}
export function helmFeet(b){return mountPosition(b,boatHelm(b).offset);}
