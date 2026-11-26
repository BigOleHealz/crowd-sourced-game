import {shoreRockPile,rockPileOverlapsBridge,indexShoreRocks} from './shore-rock-piles.js';

// Walk the exposed edges of Brickell and Lantern Point's land rectangles.
// Neighboring land, bridges and docks are excluded using the full stone
// footprint so rocks never appear in a road or a berth.
export function makeUrbanShoreRocks(bedHeight,waterY,plots,occupied){
  const rocks=[];
  for(const plot of plots)for(const side of ['west','east','north','south']){
    const vertical=side==='west'||side==='east';
    const fixed=plot[side],sign=side==='west'||side==='north'?-1:1;
    const low=plot[vertical?'north':'west'],high=plot[vertical?'south':'east'];
    for(let along=low+2;along<high-1;along+=3.4)
      for(const offset of [1.8,5.2,8.2]){
        const x=vertical?fixed+sign*offset:along;
        const z=vertical?along:fixed+sign*offset;
        const n=Math.sin(x*127.1+z*311.7)*43758.5453,variation=n-Math.floor(n);
        const px=x+(variation-.5)*.75,pz=z+Math.sin(n*1.37)*.3;
        const floor=bedHeight(px,pz);
        const {radius,height,centerY}=shoreRockPile(floor,waterY,variation);
        // Keep urban stones seated in the seawall bank rather than leaving
        // isolated boulders with their bases below the open-water surface.
        if(floor<waterY+.05 || occupied.some(rect=>
          rockPileOverlapsBridge(px,pz,radius*1.15,rect)))continue;
        rocks.push({x:px,z:pz,radius,zRadius:radius*(.78+.2*variation),height,centerY,
          floor,rotation:variation,palette:rocks.length%4});
      }
  }
  return indexShoreRocks(rocks);
}
