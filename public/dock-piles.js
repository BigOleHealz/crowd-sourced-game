import {coastalBedHeight} from './brickell-map.js';

// Give each pile a small buried toe so it meets the rendered seabed on slopes.
export function dockPileSpan(x,z,top){
  const bottom=Math.min(coastalBedHeight(x,z)-.12,top-.10);
  return {y:(top+bottom)/2,height:top-bottom};
}
