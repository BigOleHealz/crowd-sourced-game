import assert from 'node:assert/strict';
import {bridges,brickellMap,cityGround,harbor,parapetTop} from '../public/brickell-map.js';
import {onRockShore} from '../public/beach-layout.js';
import {bridgeMiddle,leafSurface,maxLift} from '../public/drawbridges.js';

for(const bridge of bridges){
  assert.equal(bridge.walkWest,-10.4);
  assert.equal(bridge.walkEast,10.4);
  for(const z of [bridge.north,bridge.north+12,bridgeMiddle(bridge)-8,
    bridgeMiddle(bridge)+8,bridge.south-12,bridge.south]){
    const deck=leafSurface(bridge,z,0)??bridge.height(z,'road');
    for(const x of [-8.2,8.2]){
      assert(Math.abs(cityGround(x,z)-(deck+bridge.sidewalkRise))<1e-6,
        `bridge sidewalk has continuous walking support at ${x}, ${z}`);
    }
  }
  const z=bridgeMiddle(bridge)-8,doors={bridgeLifts:{[bridge.north]:maxLift}};
  const raised=leafSurface(bridge,z,maxLift);
  assert(raised>leafSurface(bridge,z,0));
  assert(Math.abs(cityGround(8.2,z,Infinity,doors)-(raised+bridge.sidewalkRise))<1e-6,
    'sidewalk rises with the moving drawbridge leaf');
  assert(cityGround(8.2,z,brickellMap.waterY-.02,doors)<brickellMap.waterY-.33,
    'boats and swimmers retain water below the raised sidewalk');
  assert.equal(parapetTop(10.3,z,0,Infinity,doors),raised+bridge.sidewalkRise+bridge.parapetHeight);
  assert.equal(parapetTop(8.2,z,0,Infinity,doors),-Infinity,
    'the walking lane stays clear between the two bridge guards');
}
for(const z of [harbor.north-4,harbor.south+4]){
  assert(!onRockShore(10.2,z) && onRockShore(10.5,z),
    'the rock bank meets the outer edge of the bridge sidewalk');
}
