import assert from 'node:assert/strict';
import {dockPileSpan} from '../public/dock-piles.js';
import {coastalBedHeight} from '../public/brickell-map.js';
import {berthDeckY,marinaFingers} from '../public/marina-docks.js';
import {marinaPlatform as platform} from '../public/marina-platform.js';
import {marketPiers,pierDeck} from '../public/lantern-point.js';

function checkPile(x,z,top){
  const {y,height}=dockPileSpan(x,z,top);
  assert(height>0,`pile at ${x},${z} must have positive height`);
  assert(Math.abs(y+height/2-top)<1e-9,`pile at ${x},${z} must meet its deck`);
  assert(y-height/2<=coastalBedHeight(x,z)-.12+1e-9,`pile at ${x},${z} must enter seabed`);
}
for(const finger of marinaFingers)for(const x of [74.4,87.95])checkPile(x,finger.z,.345);
for(const side of [-1,1]){
  const x=platform.x+side*.77;
  checkPile(x,platform.near-.33,platform.deck);
  for(const z of [platform.startZ,-457,platform.near+.22])checkPile(x,z,berthDeckY);
  const exitX=platform.exitX+side*(platform.exitWidth/2-.06);
  for(const z of [platform.exitZ+1,-461,-451])checkPile(exitX,z,.565);
}
for(const pier of marketPiers){
  const centerZ=(pier.north+pier.south)/2;
  for(let x=pier.west+.6;x<pier.east;x+=3.7)
    for(const side of [-1,1])checkPile(x,centerZ+side*.74,pierDeck-.155);
}
