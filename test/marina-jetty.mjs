import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {dockHeight,jettyY,jettySections,jettyBeacon,jettyBitts,jettyRail}=await import('../public/marina-docks.js');
const {waterfront}=await import('../public/brickell-map.js');
const {groundHeight,solidTopAt,stepPlayer}=await import('../public/world.js');
const {addMarinaJetty}=await import('../public/marina-dock-view.js');
const {landmarkGuide}=await import('../public/landmark-navigation.js');
const {newExpedition}=await import('../public/expedition.js');
const {stepBoat}=await import('../public/patrol-boats.js');
const {stepYacht}=await import('../public/superyacht.js');
const {yachtOverlap}=await import('../public/yacht-layout.js');
const {hullSize}=await import('../public/marina-fleet-layout.js');
const {quaySegments}=await import('../public/quay-masonry.js');
const [stem,head]=jettySections,dt=1/30;
const boxes=[],posts=[];
addMarinaJetty((color,x,y,z,w,h,d)=>boxes.push({x,y,z,w,h,d}),
  (color,x,y,z,w,h)=>posts.push({x,y,z,w,h}),[1,2,3,4,5]);
const cap=boxes.filter(r=>Math.abs(r.y+r.h/2-jettyY)<.00001);
for(const section of jettySections){
  const inside=cap.filter(r=>r.x>=section.west && r.x<=section.east);
  for(const [axis,size,lo,hi] of [['x','w','west','east'],['z','d','north','south']]){
    assert(Math.abs(Math.min(...inside.map(r=>r[axis]-r[size]/2))-section[lo])<.00001);
    assert(Math.abs(Math.max(...inside.map(r=>r[axis]+r[size]/2))-section[hi])<.00001);
  }
  for(const x of [section.west+.04,section.x,section.east-.04])
    for(const z of [section.north+.04,section.z,section.south-.04]){
      assert.equal(dockHeight(x,z),jettyY);assert.equal(groundHeight(x,z),jettyY);assert(!waterfront(x,z));
    }
}
for(const f of [jettyBeacon,jettyRail,...jettyBitts])assert.equal(solidTopAt(f.x,f.z,{},0,2),jettyY+f.h);
assert(!quaySegments().some(s=>!s.alongX && s.cross===stem.west && s.start<stem.z && s.end>stem.z),'no old quay wall across the entrance');
assert.equal(landmarkGuide('East Quay Jetty')(87,-408.7,0).cue,'Arrived');
let player={x:49,y:groundHeight(49,-419),z:-419,grounded:true};
function walk(x,z){
  for(let i=0;i<400;i++){
    const dx=x-player.x,dz=z-player.z,d=Math.hypot(dx,dz);
    if(d<.13)return;
    player=stepPlayer(player,{x:dx/d,z:dz/d},dt);
    assert(player.grounded && !player.swimming,'continuous support to '+[x,z]);
  }
  assert.fail('blocked at '+[player.x,player.z]);
}
walk(61,-419);walk(61,stem.z);walk(head.east-.35,stem.z);walk(61,stem.z);walk(61,-419);walk(49,-419);

const people=new Map(),world=newExpedition(),boat=world.boats.find(b=>b.id==='marina-sable');
const {halfLength,halfWidth}=hullSize(boat);
Object.assign(boat,{x:101,z:head.z,yaw:-Math.PI/2,driver:1});
for(let i=0;i<340;i++)stepBoat(world,boat,{throttle:.25},dt,people);
const bowGap=boat.x-halfLength-head.east;
assert(bowGap>=-.001 && bowGap<.14 && !boat.wrecked,'bow stops flush with the outer stonework');
for(let i=0;i<120;i++)stepBoat(world,boat,{throttle:-1},dt,people);
assert(boat.x>head.east+halfLength+1,'boat can back away');

Object.assign(boat,{x:head.east+halfWidth+.6,z:-397,yaw:0,speed:0});
for(let i=0;i<280;i++)stepBoat(world,boat,{throttle:.62},dt,people);
assert(boat.z<stem.north-8 && !boat.wrecked,'a guest cruiser passes the head with 60 cm of beam clearance');
const yachtWorld=newExpedition(),yacht=yachtWorld.yacht;
Object.assign(yacht,{x:99,z:-378,yaw:0,driver:2,gangway:false});
for(let i=0;i<530;i++)stepYacht(yachtWorld,{throttle:1},dt,people);
assert(yacht.z<-431 && !yacht.wrecked,'Solana keeps an open north/south channel');
Object.assign(yacht,{x:87,z:-378,yaw:0,speed:0});
for(let i=0;i<380;i++)stepYacht(yachtWorld,{throttle:.48},dt,people);
assert(yacht.z-20>=head.south-.01 && yacht.z-20<head.south+.22);
assert(!yachtOverlap(yacht,head.x,head.z,0,head.halfWidth,head.halfLength));
console.log('PASS jetty render/terrain parity, fittings, chart, road round trip, cruiser stern reversal and beam clearance, Solana passage and no-clip contacts. Cruiser bow gap',bowGap.toFixed(3),'m.');
