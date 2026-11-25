import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {newCityTraffic}=await import('../public/city-traffic.js');
const {driveRover}=await import('../public/rover.js');
const {roadSurfaceAt}=await import('../public/road-surface.js');
const {groundHeight}=await import('../public/world.js');
const points={asphalt:[0,-187],sand:[47,-216],grass:[-21,-190]};
for(const model of ['rover','supercar','sedan','hatchback','van']){
  const metrics=[];
  for(const [surface,[x,z]] of Object.entries(points)){
    assert.equal(roadSurfaceAt(x,z),surface);
    const w=newExpedition();w.traffic=newCityTraffic();
    const c=w[model]??w.traffic.find(v=>v.model===model);Object.assign(c,{driver:1,npcDriver:null,x,z,y:groundHeight(x,z),speed:0,yaw:0,lateralSpeed:0});
    driveRover(w,{throttle:1},1/30,null,c.kind);
    const acceleration=c.speed*30;
    Object.assign(c,{x,z,speed:8,yaw:0,lateralSpeed:0});
    driveRover(w,{steer:1},1/30,null,c.kind);
    metrics.push({surface,acceleration,braking:(8-c.speed)*30,yaw:c.yaw});
  }
  for(const k of ['acceleration','braking','yaw'])assert(metrics[0][k]>metrics[2][k] && metrics[2][k]>metrics[1][k],model+' '+k+' '+JSON.stringify(metrics));
}
console.log('PASS pickup/GT/hatch/sedan/van preserve distinct dynamics with progressive asphalt, grass and sand traction.');
