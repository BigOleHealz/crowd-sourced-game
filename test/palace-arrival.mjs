import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {driveRover}=await import('../public/rover.js');
const {roadContact}=await import('../public/road-contact.js');
const {stepPlayer,groundHeight}=await import('../public/world.js');
const {roomAtFeet}=await import('../public/building-interiors.js');
const {loopPoint,arrivalDoor,arrivalDeck}=await import('../public/palace-arrival.js');
const {fountainSite}=await import('../public/centaur-fountain-layout.js');
const tick=1/60;
function visit(reverse){
  const w=newExpedition(),car=w.rover,owners=new Map();
  Object.assign(car,{driver:1,x:-38,z:64.7,y:.70,yaw:Math.PI});
  const enter=reverse?[[-38,76],[-38.6,83.8],[-42,88.3]]:[[-38,74],[-39.6,77.8],[-44.5,81.7]];
  const start=reverse?0:-.72,end=reverse?Math.PI*2-.72:-Math.PI*2;
  const stops=[...enter];
  for(let i=0;i<=28;i++){
    const a=start+(end-start)*i/28,p=loopPoint(a);stops.push([p.x,p.z]);
  }
  stops.push(...(reverse?[[-40,78.6],[-38,75.2],[-38,65]]:[[-41,85.7],[-38.9,81.0],[-38,75.4],[-38,65]]));
  let dropped=false,peak=0,old=car.y;
  for(const [x,z] of stops){
    for(let t=0;t<670;t++){
      const dx=x-car.x,dz=z-car.z,dist=Math.hypot(dx,dz);
      if(dist<1.58)break;
      const desired=Math.atan2(dx,-dz),diff=Math.atan2(Math.sin(desired-car.yaw),Math.cos(desired-car.yaw));
      driveRover(w,{steer:Math.max(-1,Math.min(1,diff*2.4)),throttle:.20},tick,owners);
      assert(Math.abs(car.y-old)<.12,'Smooth grade at '+[car.x,car.z]);old=car.y;
      assert.equal(car.hp,car.maxHp,'Car struck something at '+[car.x,car.z]);
      peak=Math.max(peak,car.y);
      if(Math.abs(car.x-arrivalDoor.x)<2.4 && Math.abs(car.z-80.8)<2.2)dropped=true;
    }
    assert(Math.hypot(car.x-x,car.z-z)<1.6,'Drive blocked approaching '+[x,z]+' at '+[car.x,car.y,car.z]);
  }
  assert(dropped && peak>=arrivalDeck-.025 && car.y<.75,'Raised porte-cochère and street exit');
  assert(roadContact(w,fountainSite.x,fountainSite.z,0,car.x,car.z,car),'Stone basin stops cars');
}
visit(false);visit(true);
const w=newExpedition();
let p={x:-57,z:80.7,y:arrivalDeck,grounded:true};
function walk(x,z,label){
  for(let i=0;i<680;i++){
    const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.06)break;
    p=stepPlayer(p,{x:dx/d*Math.min(1,d*4),z:dz/d*Math.min(1,d*4)},tick,w.hp,w);
    assert(p.grounded,'Unexpected footfall at '+[p.x,p.y,p.z]+' to '+[x,z]);
  }
  assert(Math.hypot(x-p.x,z-p.z)<.07,'Blocked walking to '+[x,z]+' at '+[p.x,p.y,p.z]);
  if(label)assert.equal(roomAtFeet(p,w.doors)?.label,label);
}
walk(-57,76,'Imperial Arrival Hall');walk(-43.7,75.6);walk(-38,75.6);walk(-29,75.6,'Oasis Palm Gallery');
walk(-43.7,75.6);walk(-69.0,75.6);walk(-69.0,69.7);walk(-75.15,69.7,'Aurora Colonnade');
walk(-75.15,63.38,'Aurora Colonnade');walk(-80.4,63.38,'Aurora Colonnade');walk(-80.4,59,'Aurora Waterfront Salon');
walk(-80.4,58.75);walk(-80.4,46.5);walk(-70,46.5,'Lantern Club Casino');
assert.equal(groundHeight(fountainSite.x,fountainSite.z),arrivalDeck);
console.log('Both pickup circuits climb, pass the fountain and canopy and descend. Drop-off connects through all three blocks to the main lobby.');
