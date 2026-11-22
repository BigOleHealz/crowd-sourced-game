import assert from 'node:assert/strict';
import {salonFurniture,salonTables,salonSeats,salonBanquettes,salonChandeliers,salonBar} from '../public/waterfront-salon-layout.js';

// Test route envelopes with a player's footprint already included, on each occupied level.
const groundPaths=[
  [-80.35,46.9,1.22,27.8],[-76.9,46.5,8.65,1.4],[-81.23,52.30,17.9,1.22],[-76.85,58.75,9.43,1.3],
  [-84.4,46.62,3.72,9.52],
];
const galleryPaths=[[-80.3,36.4,1.18,10.6],[-82.15,40.9,5.48,1.4]];
for(const f of salonFurniture){
  assert.ok(f.x-f.w/2>-90.65 && f.x+f.w/2< -72);
  assert.ok(f.z-f.d/2>30.4 && f.z+f.d/2<(f.bottom>0?42:61));
  for(const [x,z,w,d] of f.bottom>0?galleryPaths:groundPaths){
    assert.ok(Math.abs(f.x-x)>=(f.w+w)/2 || Math.abs(f.z-z)>=(f.d+d)/2,
      'Furniture blocks a salon route at '+[f.x,f.z,x,z]);
  }
}
assert.equal(salonTables.length,5);assert.equal(salonSeats.length,15);
assert.ok(salonBanquettes.some(b=>b.y===salonBar.y));
for(const c of salonChandeliers){
  const ceiling=c.z<42?4.75:9.05;
  assert.ok(c.top<ceiling && c.top-c.drop>.8+2.4,'look and walk under the pendants');
}
console.log('PASS Aurora Salon gaming furniture, mezzanine lounge, chandelier clearance, all four entrance and stair routes.');
