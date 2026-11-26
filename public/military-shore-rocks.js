import {militaryShore,onMilitaryRockShore,militaryBridge} from './military-island.js';
import {shoreRockPile,rockPileOverlapsBridge} from './shore-rock-piles.js';

const cellSize=4;
const cellKey=(x,z)=>`${x},${z}`;

// Render and walking support use the same deterministic stones. Index their
// footprints once so ordinary movement elsewhere in Brickell stays cheap.
export function makeMilitaryShoreRocks(bedHeight,waterY){
  const rocks=[],cells=new Map();
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
      for(let cx=Math.floor((px-radius)/cellSize);cx<=Math.floor((px+radius)/cellSize);cx++)
        for(let cz=Math.floor((pz-radius)/cellSize);cz<=Math.floor((pz+radius)/cellSize);cz++){
          const key=cellKey(cx,cz);
          if(!cells.has(key))cells.set(key,[]);
          cells.get(key).push(rock);
        }
    }
  }
  return {rocks,cells};
}

export function militaryRockTopAt(field,x,z,bedHeight,maxBottom=Infinity){
  if(maxBottom<=0)return undefined;
  let top;
  for(const rock of field.cells.get(cellKey(Math.floor(x/cellSize),Math.floor(z/cellSize)))??[]){
    const dx=(x-rock.x)/rock.radius,dz=(z-rock.z)/rock.zRadius,distance2=dx*dx+dz*dz;
    if(distance2>=1)continue;
    // A smooth mound meets the bank at its edge and rises to the visible stone
    // surface. Players can walk up its side instead of passing through it.
    const surface=bedHeight(x,z)+rock.height*1.30*(1-distance2);
    if(surface<=maxBottom+.65)top=Math.max(top??-Infinity,surface);
  }
  return top;
}
