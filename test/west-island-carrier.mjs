import assert from 'node:assert/strict';
import {westernWaterfronts} from '../public/brickell-horizon.js';
import {coastProfile} from '../public/offshore-keys.js';
import {eisenhowerCarrier} from '../public/eisenhower-carrier-layout.js';

const carrierScale=eisenhowerCarrier.length/1061.7968;
const westDeckEdge=eisenhowerCarrier.x-293.8955*carrierScale/2;
assert.equal(westernWaterfronts.length,3,'the complete western skyline moves together');
for(const [x,,ix,iz,length,depth,,seed] of westernWaterfronts){
  assert.equal(ix,-1);
  assert.equal(iz,0);
  // Shore, streets, and buildings are generated from the same district origin.
  // The outer shore is its easternmost geometry; buildings sit farther inland.
  const shoreEast=x-Math.min(...coastProfile(length,depth,seed,false).slices
    .flatMap(section=>section.map(([, ,inland])=>inland)));
  assert(westDeckEdge-shoreEast>40,
    `western landmass must leave open water beside the carrier (${westDeckEdge-shoreEast} m)`);
}
console.log('PASS western skyline shore and buildings clear the carrier by open water');
