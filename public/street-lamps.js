// Standalone sidewalk lights share their base, shaft and head between the scene and hit tests.
export const lampHP=60;
export const streetLamps=[
  [6.7,-26],[-6.7,-2],[6.7,44],[-31.35,42],[25.35,4],[38.65,-25]
].map(([x,z],lamp)=>({x,z,lamp,w:.24,d:.24,h:4.45,side:x===25.35||x===-6.7?-1:1}));
export const lampDown=(doors,p)=>p.lamp!=null && doors?.lamps?.[p.lamp]===0;
export function damageLamp(doors,id,damage){
  if(doors && id!=null)(doors.lamps??={})[id]=Math.max(0,(doors.lamps[id]??lampHP)-damage);
}
