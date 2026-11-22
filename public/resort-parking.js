// A two-deck waterfront garage on the west side of the casino. The ramp is a
// cutout in P2; drivers can leave the lower aisle clear all the way to the lobby.
export const garageQuay={west:-91,east:-71.49,north:30,south:65};
export const garageBase=.80,garageUpper=4.75;
export const garageRamp={west:-90.6,east:-84.6,north:38,south:55};
export const garageDrive={x:-87.5,z:61};
export const garagePortal={x:-72,z:46.5};
const inQuay=(x,z)=>x>=garageQuay.west && x<=garageQuay.east && z>=garageQuay.north && z<=garageQuay.south;
export const garageArea=(x,z,pad=0)=>x>=garageQuay.west-pad && x<=garageQuay.east+pad && z>=garageQuay.north-pad && z<=garageQuay.south+pad;
export function garageSurface(x,z,probe){
  if(!inQuay(x,z))return;
  if(z>56)return .70;
  const r=garageRamp;
  if(x<=r.east && z>=r.north){
    const t=Math.max(0,Math.min(1,(r.south-z)/(r.south-r.north)));
    return garageBase+(garageUpper-garageBase)*t;
  }
  return probe>=garageUpper-.30?garageUpper:garageBase;
}
export const garageRails=[];
function rail(x,z,w,d,floor,height=.83){
  garageRails.push({garageRail:true,x,z,w,d,bottom:floor-garageBase,h:floor-garageBase+height});
}
for(const floor of [garageBase,garageUpper]){
  rail(-90.86,43,.25,26,floor);rail(-81.53,30.15,18.7,.28,floor);
  rail(-72.28,37.4,.22,14.8,floor);rail(-72.28,51.86,.22,7.28,floor);
}
rail(-78.53,55.87,12.16,.26,garageUpper);
rail(-84.55,46.96,.17,17.9,garageUpper);
export const garageColumns=[[-83.2,32],[-73.2,32],[-83.2,54.8],[-73.2,54.8],[-73,43.1],[-73,50.1]];
for(const [x,z] of garageColumns)rail(x,z,.38,.38,garageBase,garageUpper-garageBase);
// Keep the elevated slab solid overhead while preserving headroom downstairs.
export const garageSlabs=[
  {x:-78.30,z:43,w:12.60,d:26},{x:-87.80,z:34,w:6.4,d:8}
].map(p=>({...p,garageDeck:true,bottom:garageUpper-garageBase-.28,h:garageUpper-garageBase,flushEdge:true}));
