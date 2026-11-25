// All base footprints are shared by terrain, aircraft, the chart and scenery.
export const militaryIsland={west:-224,east:-107,north:-309,south:-151};
export const militaryShore=[
  [-212,-309],[-119,-309],[-107,-297],[-107,-163],
  [-119,-151],[-212,-151],[-224,-163],[-224,-297],
];
export const militaryRunway={west:-208,east:-190,north:-297,south:-163};
export const militaryTaxiway={west:-190,east:-161,north:-254,south:-246};
export const militaryHangar={x:-148,z:-250,w:26,d:24};
export const militaryHelipads=[{x:-143,z:-209,r:9},{x:-143,z:-176,r:9}];
export const militaryDock={
  ramp:{west:-107,east:-101,north:-255,south:-249},
  pier:{west:-101,east:-83,north:-255,south:-249},
  fingers:[
    {west:-86,east:-83,north:-271,south:-255},
    {west:-86,east:-83,north:-249,south:-233},
  ],
  height:.56,
};
export const militaryDecks=[militaryDock.ramp,militaryDock.pier,...militaryDock.fingers];
export const militaryBarriers=[
  // The west face is open onto the taxiway so aircraft can enter the hangar.
  {x:militaryHangar.x,z:militaryHangar.z-11.6,w:26,d:.8,h:6.1},
  {x:militaryHangar.x,z:militaryHangar.z+11.6,w:26,d:.8,h:6.1},
  {x:militaryHangar.x+12.6,z:militaryHangar.z,w:.8,d:24,h:6.1},
  {x:militaryHangar.x,z:militaryHangar.z,w:26,d:24,bottom:6.0,h:6.25},
  ...[-268,-236].map(z=>({x:-84.5,z,w:.38,d:.38,bottom:.56,h:1.13})),
];
export const insideMilitary=(x,z)=>{
  const {west,east,north,south}=militaryIsland;
  if(x<west || x>east || z<north || z>south)return false;
  const edge=Math.min(x-west,east-x);
  return z>=north+12-edge && z<=south-12+edge;
};
const inside=(r,x,z)=>x>=r.west&&x<=r.east&&z>=r.north&&z<=r.south;
export function militaryDockHeight(x,z){
  if(inside(militaryDock.ramp,x,z))return .8-(.8-militaryDock.height)*(x-militaryDock.ramp.west)/(militaryDock.ramp.east-militaryDock.ramp.west);
  return militaryDecks.slice(1).some(r=>inside(r,x,z))?militaryDock.height:undefined;
}
