import {damageDirection} from './collapse-direction.js';
import {estateCondition} from './estate-damage.js';
import {homeById} from './residential-sites.js';

export function ramHouse(doors,id,x,z,dx,dz){
  const home=homeById(id);
  if(!home || doors.houseRuins?.[id])return false;
  const travel=damageDirection([{x:dx,z:dz}]),entry={x:+x.toFixed(2),z:+z.toFixed(2)};
  const samples=[{x:2*travel.x,z:2*travel.z}];
  const floor=home.parts[0];
  if(home.estate!=null)for(const cut of estateCondition(doors).cuts){
    if(cut.index!==home.estate || cut.collapse)continue;
    const cx=(cut.left+cut.right)/2-floor.x,cz=(cut.north+cut.south)/2-floor.z,len=Math.hypot(cx,cz);
    if(len>.1)samples.push({x:.48*cx/len,z:.48*cz/len});
  }
  const direction=damageDirection(samples),ruin={direction,entry,travel};
  (doors.houseRuins??={})[id]=ruin;
  // A whole-house event supersedes any still-falling local bays at the site.
  if(home.estate!=null && doors.structureFalls)doors.structureFalls=doors.structureFalls.filter(f=>f.index!==home.estate);
  (doors.structureFalls??=[]).push({key:'house-'+id,home:id,age:0,...ruin});
  return true;
}

export function housePieces(event,add){
  const home=homeById(event.home),base=.80;
  if(!home)return;
  const {entry,travel}=event;
  function delay(x,z){
    const depth=(x-entry.x)*travel.x+(z-entry.z)*travel.z;
    return .07+Math.max(0,Math.min(.92,depth*.043));
  }
  for(const p of home.parts){
    const bottom=p.bottom??0,wallHeight=p.h-bottom,roofY=base+p.h;
    if(wallHeight>.65){
      for(const alongX of [false,true]){
        const span=alongX?p.w:p.d,segments=Math.ceil(span/3.5);
        for(const sign of [-1,1])for(let i=0;i<segments;i++){
          const across=span*((i+.5)/segments-.5),length=span/segments-.035;
          const x=p.x+(alongX?across:sign*p.w/2),z=p.z+(alongX?sign*p.d/2:across);
          const t=delay(x,z),cut=Math.min(wallHeight,.64);
          // The wall sill and upper panel share the initial movement.
          add(x,z,base+bottom,cut,alongX?length:.16,alongX?.16:length,base,t,'stone',home.siding);
          const upper=wallHeight-cut-.16;
          if(upper>.2){
            add(x,z,base+bottom+cut,upper,alongX?length:.14,alongX?.14:length,base,t+.045,'house-wall',home.siding);

          }
        }
      }
    }
    const run=p.d/2,rise=p.rise??0,pitch=Math.atan2(rise,run);
    for(const side of [-1,1])for(let i=0;i<3;i++){
      const x=p.x+p.w*((i+.5)/3-.5),z=p.z+side*run/2;
      add(x,z,roofY+rise*.50-.16,.20,(p.w+.32)/3,run/Math.cos(pitch)+.16,base,
        delay(x,z)+.31,'house-roof',home.roof,side*pitch);
    }
  }
}
