import {civilianProfiles} from './civilian-fleet.js';
import {drivenRoad,nearestVehicle} from './rover.js';
import {nearestTraffic} from './city-traffic.js';
import {nearTank} from './tank.js';
import {nearJet} from './jet.js';
import {nearBoat,crewBoat} from './patrol-boats.js';
import {yachtPrompt} from './yacht-layout.js';
import {basketballUse} from './basketball-layout.js';

const names={rover:'Humvee',rover2:'Humvee',rover3:'Humvee',supercar:'Cheetah',sedan:'sedan',hatchback:'hatchback',van:'delivery van',engine:'fire engine'};
const action=(target,role,label)=>({target,role,label});
export function nextUse(world,feet,id,wanted){
  if(!world || !feet || feet.climb || id==null)return null;
  if(feet.ride){
    const item=world.rides?.find(r=>r.id===feet.ride.id && r.rider===id);
    if(item)return feet.grounded?action(item.id,'exit','Get off '+item.label):null;
  }
  const road=drivenRoad(world,id),boat=crewBoat(world,id);
  if(road?.takeover)return null;
  const gunnerRover=['rover','rover2','rover3'].map(kind=>world[kind]).find(car=>car?.gunner===id);
  if(road || gunnerRover){
    const car=road??gunnerRover,kind=car.kind??'rover';
    return action(kind,'exit','Exit '+(civilianProfiles[car.model]?.name??names[car.model??kind]));
  }
  if(world.tank?.driver===id || world.tank?.gunner===id)return action('tank','exit','Exit tank');
  if(world.jet?.pilot===id)return action('jet','exit',world.jet.grounded?'Exit jet':'Bail out of jet');
  if(world.heli.pilot===id || world.heli.gunner===id)return action('heli','exit',world.heli.grounded?'Exit helicopter':'Bail out of helicopter');
  if(world.heli2?.pilot===id || world.heli2?.gunner===id)return action('heli2','exit',world.heli2.grounded?'Exit helicopter':'Bail out of helicopter');
  if(boat)return action(boat.id,'exit',boat.boatModel?'Disembark '+boat.name:'Disembark patrol boat');
  const yacht=yachtPrompt(world,feet,id);
  if(yacht && ['leave','leaveGun','helm','gun'].includes(yacht)){
    const label={leave:'Leave yacht helm',leaveGun:'Leave bow gun',helm:'Take yacht helm',gun:'Use yacht bow gun'};
    return action('superyacht',yacht,label[yacht]);
  }
  const basketball=basketballUse(world,feet,id);
  if(basketball && (!wanted || basketball.target===wanted))return basketball;
  if(basketball?.role==='leave')return null;
  let pick=null,best=Infinity;
  function offer(v,target,role,label){
    if(wanted && target!==wanted)return;
    const d=(v.x-feet.x)**2+(v.y-feet.y)**2+(v.z-feet.z)**2;
    if(d<best){pick=action(target,role,label);best=d;}
  }
  for(const r of world.match ? [] : world.rides || []){
    if(r.rider==null && feet.grounded && !feet.swimming && Math.hypot(r.x-feet.x,r.z-feet.z)<=1.9 && Math.abs(r.y-feet.y)<.9)offer(r,r.id,'mount','Ride '+r.label);
  }
  const nearby=nearestVehicle(world,feet);
  if(nearby){
    const v=world[nearby],heli=nearby==='heli'||nearby==='heli2',gunner=(heli?v.pilot:v.driver)!=null;
    const name=heli?'helicopter':names[nearby];
    offer(v,nearby,gunner?'gunner':'drive',gunner?'Join '+name+' turret':(heli?'Pilot ':'Drive ')+name);
  }
  const car=nearestTraffic(world,feet);
  if(car)offer(car,car.id,'drive',(car.npcDriver?'Take the wheel of the ':'Drive ')+(car.patrol?'patrol cruiser':(civilianProfiles[car.model]?.name??names[car.model])));
  if(nearTank(world.tank,feet)){
    offer(world.tank,'tank','drive','Drive tracked tank');
  }
  if(nearJet(world.jet,feet))offer(world.jet,'jet','drive','Pilot strike jet');
  const near=nearBoat(world,feet);
  if(near)offer(near,near.id,near.driver==null?'drive':'gunner',near.boatModel?'Take helm of '+near.name:
    near.driver==null?'Take patrol boat helm':'Board patrol boat turret');
  return pick;
}
