// Only authored district objects participate. The station forecourt opens onto the north road.
export const flameProjector={name:'Ember projector',range:8,cooldown:6};
export const fuelStop={id:'pelican-fuel',name:'Pelican Fuel',x:-28,z:-273,roadZ:-262};
const {x,z,id}=fuelStop;
export const pumpIslands=[x-3.7,x+3.7];
export const stationBarriers=[
  ...pumpIslands.flatMap(cx=>[
    {x:cx,z,w:1.18,d:2.65,h:.18},
    {x:cx,z,w:.78,d:1.15,h:1.98},
    {x:cx,z:z-1.04,w:.22,d:.26,h:4.08},
  ]),
  {x,z,w:13.8,d:7.2,bottom:4.03,h:4.47},
  {x:x-8.8,z:z+4.65,w:.25,d:.26,h:3.95},
  {x:x-8.8,z:z+4.65,w:2.62,d:.22,bottom:2.68,h:4.2},
].map(p=>({...p,fireSite:id}));

export function stationContact(at){
  return stationBarriers.some(p=>Math.abs(at.x-p.x)<=p.w/2 && Math.abs(at.z-p.z)<=p.d/2 &&
    at.y>=.80+(p.bottom??0) && at.y<=.80+p.h);
}
