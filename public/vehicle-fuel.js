import {CITY,groundHeight,MAP} from './world.js';
import {fuelStop} from './fire-sites.js';
import {roadGarages} from './road-garages.js';

const depot=roadGarages[0];
export const fuelSites=CITY ? [
  {kind:'road',name:fuelStop.name,x:fuelStop.x,z:fuelStop.z,radius:6.4},
  {kind:'air',name:'Pelican Fuel apron',x:fuelStop.x,z:fuelStop.roadZ,radius:7},
  {kind:'marine',name:'Pelican Fuel dock',x:fuelStop.x,z:-280,radius:12},
] : [{kind:'depot',name:depot.name,x:depot.x,z:depot.z,radius:4.5}];

export function fuelVehicle(world,id){
  if(!world || id==null)return null;
  if(world.heli?.pilot===id)return world.heli;
  if(world.jet?.pilot===id)return world.jet;
  if(world.tank?.driver===id)return world.tank;
  if(world.rover?.driver===id)return world.rover;
  if(world.supercar?.driver===id)return world.supercar;
  if(world.yacht?.driver===id)return world.yacht;
  return world.traffic?.find(v=>v.driver===id)??world.boats?.find(v=>v.driver===id)??null;
}

export function fuelSiteFor(world,v){
  if(!v || v.wrecked || v.sinking || v.sling || v.bridgeFlight || v.boarding || v.takeover ||
     Math.hypot(v.speed??0,v.slip??v.lateralSpeed??0)>.45 || Math.abs(v.turnRate??v.yawRate??0)>.18)return null;
  const kind='pilot' in v?'air':(v.id==='superyacht' || world.boats?.some(b=>b.id===v.id))?'marine':'road';
  if(kind==='air' && (!v.grounded || v.onYacht))return null;
  return fuelSites.find(site=>{
    if(site.kind!==kind && site.kind!=='depot')return false;
    if(Math.hypot(v.x-site.x,v.z-site.z)>site.radius)return false;
    const y=kind==='marine'?MAP.waterY:groundHeight(site.x,site.z);
    return Math.abs(v.y-y)<1.2 && world.doors?.fires?.[fuelStop.id]?.stage!=='burning';
  })??null;
}

// Fractional consumption stays server-side. Replicate only tenths of a percent
// so a long-running engine doesn't send a changing high-precision float every tick.
const remainder=new WeakMap();
export function refuelVehicle(world,driverId){
  const v=fuelVehicle(world,driverId);
  if(!v || (v.fuel??100)>=100 || !fuelSiteFor(world,v))return false;
  v.fuel=100;remainder.delete(v);
  return true;
}

function useFuel(v,dt,rate,load,running){
  if(!v || !running || v.fuel===0 || v.wrecked || v.sinking || v.sling)return;
  const used=(remainder.get(v)??0)+dt*rate*(.14+.86*Math.min(1,load))*10;
  const tenths=Math.floor(used+1e-9);
  remainder.set(v,used-tenths);
  if(tenths)v.fuel=Math.max(0,Math.round((v.fuel??100)*10-tenths)/10);
}

function roadFuel(v,dt){
  if(!v)return;
  const running=v.driver!=null || v.npcDriver!=null;
  const demand=Math.max(Math.abs(v.speed??0)/12,v.engineLoad??0,Math.abs(v.turnRate??0),v.water ? .75 : 0);
  useFuel(v,dt,v.kind==='tank' ? .23 : .16,demand,running);
}

export function stepVehicleFuel(world,dt){
  roadFuel(world.rover,dt);
  roadFuel(world.supercar,dt);
  roadFuel(world.tank,dt);
  for(const car of world.traffic??[])roadFuel(car,dt);
  for(const car of world.patrolCars??[])roadFuel(car,dt);
  for(const h of [world.heli,world.jet]){
    if(!h)continue;
    const demand=h.grounded?Math.abs(h.speed??0)/9:h.burner?1:.8;
    useFuel(h,dt,h===world.jet ? .26 : .20,demand,h.pilot!=null);
  }
  for(const b of world.boats??[])useFuel(b,dt,.13,Math.max(Math.abs(b.throttle??0),Math.abs(b.speed??0)/8),b.driver!=null || b.cruising);
  const y=world.yacht;
  if(y)useFuel(y,dt,.15,Math.max(Math.abs(y.throttle),Math.abs(y.speed)/5),y.driver!=null);
}
