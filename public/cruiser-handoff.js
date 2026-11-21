// Transfer the actual vehicle from dispatch to the ordinary road fleet. Its ID,
// damage and position stay the same for observers and driver prediction.
export function releaseCruiser(world,car){
  if(car.released)return;
  car.released=true;car.kind=car.id;car.active=false;car.npcDriver=null;
  car.driver=null;car.speed=0;car.lateralSpeed=0;car.engineLoad=0;car.flatTires??=0;
  car.bodyDamage??={front:0,rear:0,left:0,right:0};
  delete car.boarding;
  const index=world.patrolCars?.indexOf(car)??-1;
  if(index>=0)world.patrolCars.splice(index,1);
  (world.traffic??=[]).push(car);
}
