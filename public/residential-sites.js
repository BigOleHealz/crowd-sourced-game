import {villaWings} from './casa-luma.js';
import {mareBase,mareUpper,mareLoggiaRoof} from './palazzo-mare.js';
import {harborHouses} from './harbor-key-structures.js';
import {clubSalon} from './lantern-buildings-layout.js';

export const homes=[
  {id:'casa',estate:0,parts:villaWings,siding:0xd4c4a7,roof:0xc9c3af},
  {id:'mare',estate:1,parts:[mareBase,...mareUpper,mareLoggiaRoof],siding:0xe5d6b8,roof:0xb4afa3},
  {id:'club-salon',parts:[clubSalon],siding:0xc5b092,roof:0x5c5551},
  ...harborHouses.map((b,i)=>({id:'harbor-'+i,parts:[{...b,h:b.eave}],siding:b.siding,roof:b.roof})),
];
const byId=new Map(homes.map(h=>[h.id,h]));
export const homeById=id=>byId.get(id);
export function houseAtPoint(x,z,pad=0){
  return homes.find(h=>h.parts.some(p=>Math.abs(x-p.x)<=p.w/2+pad && Math.abs(z-p.z)<=p.d/2+pad));
}
export function ruinedHouseAt(doors,x,z){
  if(!doors?.houseRuins)return;
  const home=houseAtPoint(x,z,1.25);
  return home && doors.houseRuins[home.id] && home;
}
export function houseRubbleHeight(home,x,z,ruin){
  // The track corridor remains clear. Higher fragments gather at its sides.
  const cross=Math.abs((x-ruin.entry.x)*ruin.travel.z-(z-ruin.entry.z)*ruin.travel.x);
  const edge=Math.max(0,...home.parts.map(p=>Math.min(p.w/2-Math.abs(x-p.x),p.d/2-Math.abs(z-p.z))));
  return .80+.28*Math.min(1,edge)*Math.max(0,Math.min(1,(cross-2)/2))*(.65+.35*Math.cos(x*1.7+z*.73));
}
