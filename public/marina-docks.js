// The deck footprint is shared by the chart, the water simulation and the rendered planking.
export const berthDeckY=.56;
export const marinaRamp={west:66.75,east:70,north:-420.45,south:-417.55};
export const marinaSpine={west:70,east:73.2,north:-450,south:-411};
export const marinaFingers=[-446,-433,-419].map((z,i)=>({
  id:['A','B','C'][i],z,west:73.2,east:89,north:z-1.1,south:z+1.1
}));
// The fixed jetty shelters the guest basin from the south. Its two sections
// also define the chart, quay opening, hull contacts and rendered cap.
export const jettyY=.80;
export const jettySections=[
  {west:62,east:84.8,north:-410.1,south:-407.3},
  {west:84.8,east:89.4,north:-410.6,south:-405.8},
].map(r=>({...r,x:(r.west+r.east)/2,z:(r.north+r.south)/2,
  halfWidth:(r.east-r.west)/2,halfLength:(r.south-r.north)/2,yaw:0}));
export function nearJetty(x,z,pad=0){
  const [stem,head]=jettySections;
  return x>=stem.west-pad && x<=head.east+pad && z>=head.north-pad && z<=head.south+pad;
}
export const jettyRail={x:73.5,z:-409.90,w:21,d:.11,h:.93};
export const jettyBeacon={x:88.45,z:-406.61,w:.72,d:.72,h:2.55};
export const jettyBitts=[68.3,74.7,81.1].map(x=>({x,z:-407.6,w:.34,d:.34,h:.32}));
export const marinaDecks=[marinaRamp,marinaSpine,...marinaFingers,...jettySections];
function contains(rect,x,z){return x>=rect.west && x<=rect.east && z>=rect.north && z<=rect.south;}
export function dockHeight(x,z){
  if(z>marinaSpine.south)return nearJetty(x,z) && jettySections.some(r=>contains(r,x,z))?jettyY:undefined;
  if(x<marinaRamp.west || x>89 || z<marinaSpine.north || z>marinaSpine.south)return;
  if(contains(marinaRamp,x,z))return .8+(.56-.8)*(x-marinaRamp.west)/(marinaRamp.east-marinaRamp.west);
  if(contains(marinaSpine,x,z) || marinaFingers.some(r=>contains(r,x,z)))return berthDeckY;
}
export const marinaFittings=[
  jettyRail,jettyBeacon,...jettyBitts,
  ...[[60.3,-424.8],[65.65,-432.7],[65.7,-416.4]].map(([x,z])=>({x,z,w:.65,d:.65,h:.7})),
  ...[[60.4,-425.8],[66.3,-425.8],[66.3,-432],[60.4,-432]].map(([x,z])=>({x,z,w:.08,d:.08,h:2.95})),
  {x:62.8,z:-422.2,w:.34,d:3.9,h:2.13},
  ...[-427.6,-430.5].map(z=>({x:64.1,z,w:2.25,d:.92,h:.82})),
  ...[-448,-440,-428,-414].map(z=>({x:70.24,z,w:.24,d:.24,h:.82})),
];
