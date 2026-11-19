// A return loop leaves the existing lookout, crosses the meadow, and climbs
// the granite shoulder. The same centreline clears trees and paints the trail.
export const northTrail=[[-4,-24],[-1,-30],[0,-39],[5,-47],[12,-55],[16,-65],[13,-74],
  [5,-80],[-4,-78],[-13,-69],[-16,-58],[-11,-50],[-4,-44],[0,-39]];
export const ridgeBench={x:3.7,z:-81.8};
export const northRocks=[
  {x:-22,z:-45,radius:1.7,height:2.1},{x:21,z:-50,radius:1.9,height:2.8},
  {x:-26,z:-63,radius:2.55,height:3.3},{x:23,z:-69,radius:2.1,height:3.7},
  {x:19,z:-76,radius:1.5,height:2.2},{x:8.9,z:-83.8,radius:1.75,height:2.1},
  {x:-8.5,z:-82.1,radius:2.3,height:2.8},{x:-12.1,z:-81,radius:1.2,height:1.6},
];
export function routeDistance(path,x,z) {
  let best=Infinity;
  for(let i=1;i<path.length;i++){
    const [ax,az]=path[i-1],[bx,bz]=path[i],dx=bx-ax,dz=bz-az;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));
    best=Math.min(best,(x-ax-t*dx)**2+(z-az-t*dz)**2);
  }
  return Math.sqrt(best);
}
export function northernPines() {
  const trees=[];
  for(let i=0;i<10;i++)for(let j=0;j<8;j++){
    const x=-32+i*7+2.15*Math.sin(i*19+j*4.2),z=-36.8-j*6.6+1.5*Math.cos(i*2.3+j);
    const meadow=Math.hypot((x-1)/16,(z+55)/14);
    if(meadow<1 || routeDistance(northTrail,x,z)<3.5 ||
       northRocks.some(r=>Math.hypot(r.x-x,r.z-z)<r.radius+1))continue;
    const height=6.2+3.8*(.5+.5*Math.cos(i*4+j*3));
    trees.push({x,z,height,radius:height*.035});
  }
  return trees;
}
