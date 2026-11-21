import {fuelStop} from './fire-sites.js';
import {homeById} from './residential-sites.js';
import {ramHouse} from './residential-falls.js';
import {stations} from './beach-layout.js';
import {beachSigns,trailMarkers} from './scenery-layout.js';

const sites=new Map([[fuelStop.id,{...fuelStop,kind:'station',duration:450}]]);
for(const id of ['harbor-0','harbor-2','harbor-3']){
  const b=homeById(id).parts[0];
  sites.set(id,{id,kind:'house',x:b.x,z:b.z,w:b.w,d:b.d,duration:330});
}
for(const {number:id,x,z} of stations)sites.set(id,{id,x,z,kind:'wood',duration:180});
for(const [i,[x,z]] of beachSigns.entries()){
  const id='sign-'+i;
  sites.set(id,{id,x,z,kind:'wood',duration:135});
}
for(const {x,z,postId:id} of trailMarkers)sites.set(id,{id,x,z,kind:'sign',duration:135});
export const fireSite=id=>sites.get(id);

export function burnableContact(hit,at){
  const tagged=hit.target?.fireSite??hit.target?.woodId??hit.target?.postId;
  if(sites.has(tagged))return tagged;
  // The wood-clad face begins above the house's stone foundation.
  if(hit.hitKind==='scenery' && at.y>1.18)return hit.target?.fireHome;
}
export function hitFireSite(doors,id,at,tick,projector,team){
  const site=sites.get(id);
  if(!site || doors.houseRuins?.[id] || doors.beachWood?.[id]!=null || doors.posts?.[id]===0 || doors.fires?.[id])return false;
  if(site.kind==='station'){
    doors.fuelHits=Math.min(4,(doors.fuelHits??0)+1);
    if(doors.fuelHits<4)return false;
  }else if(!projector)return false;
  (doors.fires??={})[id]={stage:'burning',team,start:tick,level:1,x:+at.x.toFixed(2),y:+at.y.toFixed(2),z:+at.z.toFixed(2)};
  return true;
}

export function stepDistrictFires(doors,tick,rules){
  if(!doors.fires)return;
  for(const [id,f] of Object.entries(doors.fires)){
    if(f.stage!=='burning')continue;
    const s=sites.get(id),age=tick-f.start;
    if(age<s.duration && !doors.houseRuins?.[id] && doors.beachWood?.[id]==null && doors.posts?.[id]!==0){
      f.level=Math.max(1,Math.min(3,1+Math.floor(age*3/s.duration)));
      continue;
    }
    if(s.kind==='house' && ramHouse(doors,id,f.x,f.z,s.x-f.x,s.z-f.z))
      rules?.damageProperty(f.team,f,'house:'+id,'House facade',250_000);
    if(s.kind==='sign')(doors.posts??={})[id]=0;
    if(s.kind==='wood')(doors.beachWood??={})[id]??=1571;
    doors.fires[id]={stage:'burned'};
  }
}
