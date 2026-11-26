import {militaryShore,onMilitaryRockShore,militaryBridge} from './military-island.js';
import {shoreRockPile,rockPileOverlapsBridge,indexShoreRocks,shoreRockTopAt} from './shore-rock-piles.js';

// Render and walking support use the same deterministic stones. Index their
// footprints once so ordinary movement elsewhere in Brickell stays cheap.
export function makeMilitaryShoreRocks(bedHeight,waterY){
  const rocks=[];
  for(let i=0;i<militaryShore.length;i++){
    const [ax,az]=militaryShore[i],[bx,bz]=militaryShore[(i+1)%militaryShore.length];
    const dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz),nx=dz/length,nz=-dx/length;
    for(let along=2;along<length-1;along+=3.4)for(const offset of [1.8,5.2,8.2]){
      const x=ax+dx*along/length+nx*offset,z=az+dz*along/length+nz*offset;
      const n=Math.sin(x*127.1+z*311.7)*43758.5453,variation=n-Math.floor(n);
      const px=x+(variation-.5)*.75,pz=z+Math.sin(n*1.37)*.3;
      if(!onMilitaryRockShore(px,pz))continue;
      const floor=bedHeight(px,pz);
      const {radius,height,centerY}=shoreRockPile(floor,waterY,variation);
      if(rockPileOverlapsBridge(px,pz,radius*1.15,militaryBridge))continue;
      const rock={x:px,z:pz,radius,zRadius:radius*(.78+.2*variation),height,centerY,
        floor,rotation:variation,palette:rocks.length%4};
      rocks.push(rock);
    }
  }
  return indexShoreRocks(rocks);
}

export const militaryRockTopAt=shoreRockTopAt;
