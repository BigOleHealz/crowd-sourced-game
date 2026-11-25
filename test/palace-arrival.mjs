import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {roadContact}=await import('../public/road-contact.js');
const {groundHeight}=await import('../public/world.js');
const {newCityTraffic}=await import('../public/city-traffic.js');
const {drive,arrivalBarriers}=await import('../public/palma-site.js');
const w=newExpedition(),car=w.rover;
w.traffic=newCityTraffic({resort:true}).filter(c=>c.id.startsWith('valet'));
let previous=drive[0],lastY=.7,highest=0;
for(const [i,[ax,az]] of drive.entries()){
  if(!i)continue;
  const [bx,bz]=drive[i-1],len=Math.hypot(ax-bx,az-bz);
  if(len<.001)continue;
  const yaw=Math.atan2(ax-bx,bz-az);
  for(let j=1;j<=Math.ceil(len/.12);j++){
    const t=j/Math.ceil(len/.12),x=bx+(ax-bx)*t,z=bz+(az-bz)*t;
    const y=groundHeight(x,z,car.y+.4,w.doors);
    Object.assign(car,{x,y,z,yaw});
    const hit=roadContact(w,x,z,yaw,...previous,car);
    assert(!hit,'Valet route obstruction at '+[x,z]+' '+JSON.stringify(hit?.object?.id??hit?.object));
    assert(Math.abs(y-lastY)<.17,'smooth grade');highest=Math.max(highest,y);lastY=y;previous=[x,z];
  }
}
const wall=arrivalBarriers.find(b=>b.x<-64 && b.z<38);
assert(wall && roadContact(w,wall.x,wall.z,0,wall.x+.1,wall.z,car)?.object.arrivalWall,'solid elevated parapet stops a car');
assert(!arrivalBarriers.some(b=>b.x<-65 && b.z>40.5 && b.z<47.5),'open curb at valet drop-off');
assert.equal(highest,1.8);assert(Math.abs(lastY-.7)<.01);
console.log('PASS chassis clearance at 12 cm intervals through the full valet approach and exit.');
