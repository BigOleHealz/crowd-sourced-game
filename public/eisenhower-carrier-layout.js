// The visible mesh is 275 m long. These narrower waterline sections keep
// boats and swimmers out of the hull without making the overhanging deck solid.
import {seabedHeight} from './reef-channel.js';

// Keep clear water between the carrier's flight-deck overhang and the military
// island. Moving the ship preserves the 72 m bridge and all base placements.
// The waterline leaves roughly 11 m of hull below water and 14 m to the flight deck.
export const eisenhowerCarrier={x:-308,z:-230,length:275,waterlineModelY:45};
const sections=[
  // The hull is asymmetric around the flight-deck centre and widens near the
  // waterline. The old narrow boxes left visible side plating non-solid.
  {z:-110,d:55,x:-308,w:24},
  {z:-55,d:60,x:-306,w:50},
  {z:0,d:60,x:-303,w:58},
  {z:55,d:60,x:-306,w:54},
  {z:110,d:55,x:-306,w:36},
];
// The broad flight deck at the gangway landing is near source Y=98.5.
// Follow that surface instead of suspending walking collision above it.
export const carrierDeckTop=-.14+(98.5-eisenhowerCarrier.waterlineModelY)*eisenhowerCarrier.length/1061.7968+.12;
export const carrierHullSections=sections.map(({z,d,x,w})=>{
  const worldZ=eisenhowerCarrier.z+z,base=seabedHeight(x,worldZ);
  // A constant 21.2 m above the varying seabed put the invisible hull above
  // the flight deck in several bays, blocking a player mid-runway.
  return {x,z:worldZ,w,d,h:carrierDeckTop-2.4-base,carrierHull:true};
});
export const carrierHullContains=(x,z,padding=0)=>carrierHullSections.some(s=>
  Math.abs(x-s.x)<=s.w/2+padding && Math.abs(z-s.z)<=s.d/2+padding);

// The broad, nearly planar source flight deck is at model Y≈100. Keep its
// walking support just above the visible surface, separate from the lower hull
// so small boats still pass beneath the overhang without hitting invisible air.
// Flight-deck x extents sampled every 5 m from the actual GLB upper surface.
// The ship tapers at both ends and has several side extensions; five broad
// rectangles left invisible floor at the tips and omitted walkable deck amidships.
const deckSpans=[
  [-303,-301.5],[-318,-298],[-318.5,-297.5],[-319,-297],[-320,-296.5],
  [-320,-296],[-320.5,-295.5],[-321,-295],[-321.5,-294.5],[-321.5,-294],
  [-322,-294],[-322.5,-291],[-323,-293],[-325,-290],[-328.5,-286],
  [-332,-281.5],[-335.5,-277.5],[-338.5,-275.5],[-340.5,-276],[-340,-276],
  [-340,-276],[-340,-276.5],[-339,-276.5],[-336,-284.5],[-336,-290.5],
  [-336,-290.5],[-336,-290],[-336,-277.5],[-336,-277.5],[-336,-277.5],
  [-336,-282],[-338.5,-290],[-336,-290],[-336,-290],[-335.5,-278],
  [-335.5,-278],[-335.5,-278],[-335.5,-278],[-338,-278],[-335.5,-278],
  [-335.5,-278],[-335.5,-276.5],[-335.5,-278],[-336.5,-290],[-324.5,-290],
  [-324.5,-290],[-324.5,-290],[-324.5,-281.5],[-332.5,-282],[-324,-282],
  [-323.5,-282.5],[-323,-283],[-322.5,-286],[-322,-288.5],[-321.5,-300],
];
export const carrierDeckSections=deckSpans.map(([west,east],i)=>{
  const x=(west+east)/2,z=-365+i*5,base=seabedHeight(x,z);
  return {x,z,w:east-west,d:5,flushEdge:true,
    bottom:carrierDeckTop-1.8-base,h:carrierDeckTop-base};
});

// A gradual shore ramp runs beside the west fence, then a level gangway
// crosses the water gap to the flight deck. Both pieces share this surface.
const gangwayWidth=4.4;
export const carrierRamp={
  shore:{x:-243,y:.8,z:-290},
  // Keep the rising leg aligned with the approach. A diagonal six-metre drift
  // sent players walking straight into its rail before they reached the turn.
  turn:{x:-243,y:carrierDeckTop,z:-235},
  // The crosswise deck begins at the near edge of this level landing. End the
  // incline there so its overlap never creates an invisible step.
  riseEnd:{x:-243,y:carrierDeckTop,z:-235-gangwayWidth/2},
  // Carry the landing beyond the visible flight-deck edge, not just the
  // simplified collision rectangle at the ship's perimeter.
  deck:{x:-296,y:carrierDeckTop,z:-235},
  width:gangwayWidth,
};
export const carrierRampSegments=[
  [carrierRamp.shore,carrierRamp.riseEnd],
  [carrierRamp.riseEnd,carrierRamp.turn],
  [carrierRamp.turn,carrierRamp.deck],
];
export const carrierRampSupportRows=carrierRampSegments.flatMap(([a,b],segment)=>{
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),rows=[];
  for(let distance=8;distance<length-(segment?27:4);distance+=12){
    const t=distance/length;
    const posts=[-.78,.78].map(side=>{
      const x=a.x+dx*t-side*dz/length*carrierRamp.width/2;
      const z=a.z+dz*t+side*dx/length*carrierRamp.width/2;
      return {x,z,top:a.y+(b.y-a.y)*t-.5,base:seabedHeight(x,z)-.45};
    });
    rows.push({segment,distance,posts});
  }
  return rows;
});
export function carrierRampRailSpan(segment,length){
  return {start:segment===2?2/length:0,end:segment===2?1-2/length:1};
}
export const carrierRampRailSides=segment=>segment===1?[-1]:[-1,1];
export const carrierRampTurnGuard={
  west:carrierRamp.turn.x-carrierRamp.width/2,
  east:carrierRamp.turn.x,
  z:carrierRamp.turn.z+carrierRamp.width/2,
};
export function carrierRampRailBlocked(x,y,z,height=1.7,radius=.32){
  if(x>=carrierRampTurnGuard.west-radius && x<=carrierRampTurnGuard.east+radius &&
      Math.abs(z-carrierRampTurnGuard.z)<=radius+.07 &&
      y<carrierDeckTop+1.1 && y+height>carrierDeckTop+.35)return true;
  for(const [segment,[a,b]] of carrierRampSegments.entries()){
    const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    const {start,end}=carrierRampRailSpan(segment,length);
    const sideX=-dz/length*carrierRamp.width/2,sideZ=dx/length*carrierRamp.width/2;
    for(const side of carrierRampRailSides(segment)){
      const ax=a.x+dx*start+side*sideX,az=a.z+dz*start+side*sideZ;
      const bx=a.x+dx*end+side*sideX,bz=a.z+dz*end+side*sideZ;
      const t=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(z-az)*(bz-az))/((bx-ax)**2+(bz-az)**2)));
      if((x-ax-(bx-ax)*t)**2+(z-az-(bz-az)*t)**2>(radius+.07)**2)continue;
      const railY=a.y+(b.y-a.y)*(start+(end-start)*t);
      if(y<railY+1.1 && y+height>railY+.35)return true;
    }
  }
  return false;
}
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
