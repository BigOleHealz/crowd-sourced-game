// The visible mesh is 275 m long. These narrower waterline sections keep
// boats and swimmers out of the hull without making the overhanging deck solid.
import {seabedHeight} from './reef-channel.js';

// Keep clear water between the carrier's flight-deck overhang and the military
// island. Moving the ship preserves the 72 m bridge and all base placements.
// The waterline leaves roughly 11 m of hull below water and 14 m to the flight deck.
export const eisenhowerCarrier={x:-308,z:-230,length:275,waterlineModelY:45};
const sections=[
  {z:-110,d:50,w:18},
  {z:-55,d:60,w:42},
  {z:0,d:60,w:48},
  {z:55,d:60,w:42},
  {z:110,d:50,w:18},
];
export const carrierHullSections=sections.map(({z,d,w})=>({
  x:eisenhowerCarrier.x,z:eisenhowerCarrier.z+z,w,d,h:21.2,
}));
export const carrierHullContains=(x,z,padding=0)=>carrierHullSections.some(s=>
  Math.abs(x-s.x)<=s.w/2+padding && Math.abs(z-s.z)<=s.d/2+padding);

// The broad, nearly planar source flight deck is at model Y≈100. Keep its
// walking support just above the visible surface, separate from the lower hull
// so small boats still pass beneath the overhang without hitting invisible air.
export const carrierDeckTop=-.14+(100-eisenhowerCarrier.waterlineModelY)*eisenhowerCarrier.length/1061.7968+.12;
export const carrierDeckSections=sections.map(({z,d},i)=>{
  const x=eisenhowerCarrier.x,worldZ=eisenhowerCarrier.z+z,base=seabedHeight(x,worldZ);
  return {x,z:worldZ,w:[56,72,76,76,60][i],d,
    bottom:carrierDeckTop-1.8-base,h:carrierDeckTop-base};
});

// A gradual shore ramp runs beside the west fence, then a level gangway
// crosses the water gap to the flight deck. Both pieces share this surface.
export const carrierRamp={
  shore:{x:-243,y:.8,z:-290},
  turn:{x:-249,y:carrierDeckTop,z:-235},
  // Carry the landing beyond the visible flight-deck edge, not just the
  // simplified collision rectangle at the ship's perimeter.
  deck:{x:-296,y:carrierDeckTop,z:-235},
  width:3.6,
};
export const carrierRampSegments=[
  [carrierRamp.shore,carrierRamp.turn],
  [carrierRamp.turn,carrierRamp.deck],
];
export function carrierRampHeight(x,z,maxBottom=Infinity){
  let top;
  for(const [a,b] of carrierRampSegments){
    const dx=b.x-a.x,dz=b.z-a.z,length2=dx*dx+dz*dz;
    const t=((x-a.x)*dx+(z-a.z)*dz)/length2;
    if(t<0 || t>1)continue;
    if(Math.abs((x-a.x)*dz-(z-a.z)*dx)>carrierRamp.width/2*Math.sqrt(length2))continue;
    const height=a.y+t*(b.y-a.y);
    if(height<=maxBottom+.65)top=Math.max(top??-Infinity,height);
  }
  return top;
}
