// The deck footprint is shared by the chart, the water simulation and the rendered planking.
export const berthDeckY=.56;
export const marinaRamp={west:66.75,east:70,north:-420.45,south:-417.55};
export const marinaSpine={west:70,east:73.2,north:-450,south:-411};
export const marinaFingers=[-446,-433,-419].map((z,i)=>({
  id:['A','B','C'][i],z,west:73.2,east:89,north:z-1.1,south:z+1.1
}));
export const marinaDecks=[marinaRamp,marinaSpine,...marinaFingers];
function contains(rect,x,z){return x>=rect.west && x<=rect.east && z>=rect.north && z<=rect.south;}
export function dockHeight(x,z){
  if(x<marinaRamp.west || x>89 || z<marinaSpine.north || z>marinaSpine.south)return;
  if(contains(marinaRamp,x,z))return .8+(.56-.8)*(x-marinaRamp.west)/(marinaRamp.east-marinaRamp.west);
  if(contains(marinaSpine,x,z) || marinaFingers.some(r=>contains(r,x,z)))return berthDeckY;
}
export const marinaFittings=[
  {x:62.8,z:-422.2,w:.34,d:3.9,h:2.13},
  ...[-427.6,-430.5].map(z=>({x:64.1,z,w:2.25,d:.92,h:.82})),
  ...[-448,-440,-428,-414].map(z=>({x:70.24,z,w:.24,d:.24,h:.82})),
];
