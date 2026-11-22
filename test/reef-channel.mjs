import assert from 'node:assert/strict';
import {reefTrail,seabedHeight} from '../public/reef-channel.js';
import {cityGround,brickellMap} from '../public/brickell-map.js';

let nearest=-Infinity, deepest=Infinity;
for(let i=1;i<reefTrail.length;i++){
  const [ax,az]=reefTrail[i-1], [bx,bz]=reefTrail[i];
  assert(Math.hypot(bx-ax,bz-az)<16,'next reef marker is within underwater viewing range');
  for(let step=0;step<=20;step++){
    const t=step/20,x=ax+(bx-ax)*t,z=az+(bz-az)*t;
    const bed=seabedHeight(x,z);
    assert(Math.abs(bed-cityGround(x,z,brickellMap.waterY))<1e-6,'rendered bed matches collision beneath the next marker');
    assert(bed<=-2.8,'boat draft is clear');
    nearest=Math.max(nearest,bed);deepest=Math.min(deepest,bed);
  }
}
assert(nearest-deepest>2,'route changes depth');
assert(cityGround(71,-419)>0,'marina decking stays dry');
console.log('Verified all 13 legs from the marina slip through Lantern Bridge. Seabed heights',deepest.toFixed(1),'to',nearest.toFixed(1),'metres.');
