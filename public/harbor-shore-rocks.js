import {beachIsland,onRockShore} from './beach-layout.js';
import {shoreRockPile,rockPileOverlapsBridge,indexShoreRocks} from './shore-rock-piles.js';

export function makeHarborShoreRocks(bedHeight,waterY,bridges){
  const positions=[];
  for(let z=beachIsland.north+2;z<beachIsland.south-1;z+=3.4)
    for(const offset of [1.8,5.2,9.1])positions.push([beachIsland.west-offset,z]);
  for(const side of ['north','south']){
    const edge=beachIsland[side],sign=side==='north'?-1:1;
    for(let x=beachIsland.west+2;x<beachIsland.east;x+=3.4)
      for(const offset of [1.7,4.9,8.1])positions.push([x,edge+sign*offset]);
    positions.push([beachIsland.east-1.2,edge+sign*2.2]);
  }
  const rocks=[];
  for(const [x,z] of positions){
    const n=Math.sin(x*127.1+z*311.7)*43758.5453,variation=n-Math.floor(n);
    const px=x+(variation-.5)*.85,pz=z+Math.sin(n*1.37)*.35;
    if(!onRockShore(px,pz))continue;
    const floor=bedHeight(px,pz);
    const {radius,height,centerY}=shoreRockPile(floor,waterY,variation);
    if(bridges.some(bridge=>rockPileOverlapsBridge(px,pz,radius*1.15,bridge)))continue;
    rocks.push({x:px,z:pz,radius,zRadius:radius*(.78+.2*variation),height,centerY,
      floor,rotation:variation,palette:rocks.length%4});
  }
  return indexShoreRocks(rocks);
}
