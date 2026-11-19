// Ground-supported scenery shared by the renderer and authoritative collision map.
export const depotPoint = {x:-3,z:23};
export const landingPoint = city => city ? {x:30,z:-42} : {x:12,z:-15};
export function stationCorners(point) {
  // Leave the depot's northeast loading approach open for the turn to the pad.
  return point===depotPoint ? [[-1,-1],[-1,1],[1,1]] : [[-1,-1],[1,-1],[-1,1],[1,1]];
}
export function supplySupports(point, radius) {
  const posts=[];
  for (const [dx,dz] of stationCorners(point))
    posts.push({x:point.x+dx*radius*.8,z:point.z+dz*radius*.8,w:.18,d:.18,h:.68});
  for (const dx of [-.61,.61])
    posts.push({x:point.x-radius+dx,z:point.z-.03,w:.07,d:.07,h:1.59});
  return posts;
}
export const trailMarkers = [
  {x:2.24,z:8.1,heading:-.35,text:'CREEK TRAIL',h:1.65},
  {x:-5.65,z:-24.80,heading:.2,text:'LOOKOUT',h:2.4},
];
export const harborSigns = [[8.3,-40,'↑  HARBOR KEY'],[8.3,-157,'HARBOR KEY']];
export const beachSigns = [[8,-198,0,'BEACH ACCESS  →'],[33,-198,-Math.PI/2,'HARBOR KEY BEACH  ↑']];
export const signalPost = (x,z) => ({x:x-6.2,z:z-5.8,w:.16,d:.16,h:4.45});
