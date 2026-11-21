import {CITY} from './world.js';

export const roadGarages=CITY ? [
  {name:'Bayfront Motor Works',x:32,z:67.2},
  {name:'Lantern Yacht Club Service',x:54,z:-370},
] : [{name:'Depot Motor Pool',x:-13.8,z:20.1}];
export function garageAt(car){
  return roadGarages.find(g=>Math.abs(g.x-car.x)<=2.65 && Math.abs(g.z-car.z)<=2.65);
}
const visits=new WeakMap();
export function needsRoadRepair(car){
  return car.hp<car.maxHp || car.flatTires || car.fittingDamage?.some(Boolean) || Object.keys(car.brokenGlass??{}).length || Object.values(car.bodyDamage??{}).some(v=>v>0);
}

export function serviceRoadCar(car,dt){
  if(!car)return;
  const ready=car.driver!=null && !car.takeover && !car.wrecked && !car.bridgeFlight &&
    Math.abs(car.speed)<.25 && Math.abs(car.lateralSpeed??0)<.25 && garageAt(car) && needsRoadRepair(car);
  if(!ready){visits.delete(car);delete car.repairPercent;return;}
  let visit=visits.get(car);
  if(!visit || visit.driver!==car.driver || visit.hp!==car.hp || visit.tires!==car.flatTires){
    visit={driver:car.driver,hp:car.hp,tires:car.flatTires,time:0};
    visits.set(car,visit);
  }
  visit.time+=dt;
  if(visit.time<3-1e-6){
    car.repairPercent=Math.min(99,Math.floor(visit.time*100/3));return;
  }
  car.hp=car.maxHp;car.flatTires=0;
  car.bodyDamage={front:0,rear:0,left:0,right:0};
  delete car.fittingDamage;delete car.brokenGlass;delete car.contactSound;delete car.repairPercent;
  visits.delete(car);
}
