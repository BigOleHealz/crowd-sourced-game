// Keep the outer row visible above the tidal surface while its base remains
// embedded in the surveyed bank. Both natural islands share this profile.
export function shoreRockPile(floor,waterY,variation) {
  const radius=.95+variation*.78;
  const height=.68+variation*.42+Math.max(0,waterY+.10-floor)*.52;
  return {radius,height,centerY:floor+height*.42};
}

// A pile's center can be on the shore while its visible stone crosses a
// bridge's outer pedestrian wall. Check the full horizontal footprint.
export function rockPileOverlapsBridge(x,z,radius,bridge) {
  const west=bridge.walkWest??bridge.west,east=bridge.walkEast??bridge.east;
  const nearestX=Math.max(west,Math.min(east,x));
  const nearestZ=Math.max(bridge.north,Math.min(bridge.south,z));
  return Math.hypot(x-nearestX,z-nearestZ)<radius;
}

const cellSize=4;
const cellKey=(x,z)=>`${x},${z}`;

// The rendered stones and walking support use the same indexed footprints.
export function indexShoreRocks(rocks){
  const cells=new Map();
  for(const rock of rocks)
    for(let cx=Math.floor((rock.x-rock.radius)/cellSize);cx<=Math.floor((rock.x+rock.radius)/cellSize);cx++)
      for(let cz=Math.floor((rock.z-rock.radius)/cellSize);cz<=Math.floor((rock.z+rock.radius)/cellSize);cz++){
        const key=cellKey(cx,cz);
        if(!cells.has(key))cells.set(key,[]);
        cells.get(key).push(rock);
      }
  return {rocks,cells};
}

export function shoreRockTopAt(field,x,z,bedHeight,maxBottom=Infinity){
  if(maxBottom<=0)return undefined;
  let top;
  for(const rock of field.cells.get(cellKey(Math.floor(x/cellSize),Math.floor(z/cellSize)))??[]){
    const dx=(x-rock.x)/rock.radius,dz=(z-rock.z)/rock.zRadius,distance2=dx*dx+dz*dz;
    if(distance2>=1)continue;
    const surface=bedHeight(x,z)+rock.height*1.30*(1-distance2);
    if(surface<=maxBottom+.65)top=Math.max(top??-Infinity,surface);
  }
  return top;
}
