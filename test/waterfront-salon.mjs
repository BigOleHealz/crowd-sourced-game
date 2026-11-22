import assert from 'node:assert/strict';
import {resortLevels,suiteDoors,grandStoryY,penthousePool,resortSupport} from '../public/grand-resort-layout.js';
for(const floor of resortLevels.slice(5,21)){
  assert.equal(suiteDoors(floor.n).length,2);
  for(const kind of ['wardrobe','bath','sofa','bed','dining'])
    assert.equal(floor.parts.filter(p=>p.kind===kind).length,2,kind+' in both suites');
  assert.equal(resortSupport(-75.4,49.5,floor.y+.02),floor.y);
}
assert.equal(resortLevels.length,24);assert.equal(grandStoryY(24),100.8);
assert.equal(resortLevels[2].parts.filter(p=>p.kind==='poker').length,4);
assert.equal(resortLevels[23].parts.filter(p=>p.kind==='poolBed').length,14);
assert(penthousePool.x-penthousePool.w/2>-74,'pool basin is entirely outside the bedroom footprint');
assert.equal(resortSupport(-65.5,30.65,96.5),96.4,'north overlook reaches the parapet');
assert.equal(resortSupport(penthousePool.x,34.6,92.2),undefined,'bedroom volume is clear of the basin');
console.log('PASS all suite floors, future poker layout and stepped rooftop pool.');
