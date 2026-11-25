// The visible mesh is 275 m long. These narrower waterline sections keep
// boats and swimmers out of the hull without making the overhanging deck solid.
import {seabedHeight} from './reef-channel.js';

// A 37 m channel separates the flight deck from the military island's west shore.
// The waterline leaves roughly 11 m of hull below water and 14 m to the flight deck.
export const eisenhowerCarrier={x:-325,z:-230,length:275,waterlineModelY:45};
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
