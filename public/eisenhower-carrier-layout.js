// The visible mesh is 275 m long. These narrower waterline sections keep
// boats and swimmers out of the hull without making the overhanging deck solid.
export const eisenhowerCarrier={x:-120,z:-450,length:275};
const sections=[
  {z:-110,d:50,w:18},
  {z:-55,d:60,w:42},
  {z:0,d:60,w:48},
  {z:55,d:60,w:42},
  {z:110,d:50,w:18},
];
export const carrierHullSections=sections.map(({z,d,w})=>({
  x:eisenhowerCarrier.x,z:eisenhowerCarrier.z+z,w,d,h:23.5,
}));
export const carrierHullContains=(x,z,padding=0)=>carrierHullSections.some(s=>
  Math.abs(x-s.x)<=s.w/2+padding && Math.abs(z-s.z)<=s.d/2+padding);
