import assert from 'node:assert/strict';
import {beach,sandHeight} from '../public/beach-layout.js';
import {coastalBedHeight} from '../public/brickell-map.js';

// Beach and reef meshes meet on the same two-metre vertex grid.
for(let z=beach.north;z<=beach.south;z+=8){
  for(let x=beach.west;x<=beach.east;x+=2){
    assert(Math.abs(coastalBedHeight(x,z)-sandHeight(x,z))<1e-6,
      `beach and seabed separate at ${x}, ${z}`);
  }
  let previous=coastalBedHeight(beach.east,z);
  for(let x=beach.east+2;x<=beach.east+12;x+=2){
    const next=coastalBedHeight(x,z);
    assert(Math.abs(next-previous)<1.6,`shore drops abruptly at ${x}, ${z}`);
    previous=next;
  }
}
