import {civilianProfiles} from './civilian-fleet.js';

// Two hinged roadway leaves meet at the crown of each Brickell crossing.
export const leafLength=16;
export const maxLift=25*Math.PI/180;
export const bridgeMiddle=bridge=>(bridge.north+bridge.south)/2;

export const trafficStopLine=car=>leafLength+civilianProfiles[car.model].halfLength+1;

export function leafGeometry(bridge,angle){
  const middle=bridgeMiddle(bridge), hinge=middle-leafLength;
  const base=bridge.height(hinge,'road'), rise=bridge.height(middle,'road')-base;
  const horizontal=leafLength*Math.cos(angle)-rise*Math.sin(angle);
  const vertical=leafLength*Math.sin(angle)+rise*Math.cos(angle);
  return {middle,base,horizontal,vertical,gap:2*(leafLength-horizontal),slope:vertical/horizontal};
}

export function leafSurface(bridge,z,angle){
  const offset=leafLength-Math.abs(z-bridgeMiddle(bridge));
  if(offset<0)return null;
  const leaf=leafGeometry(bridge,angle);
  return offset<=leaf.horizontal+1e-8 ? leaf.base+offset*leaf.slope : -Infinity;
}

export function stepDrawbridges(world,bridges,dt){
  if(!world.yacht || !world.doors)return;
  const lifts=world.doors.bridgeLifts??={};
  for(const bridge of bridges){
    const key=bridge.north, y=world.yacht;
    const angle=lifts[key]??0;
    const distance=Math.hypot(y.x-(bridge.east+bridge.west)/2,y.z-bridgeMiddle(bridge));
    // A hysteresis band keeps the leaves up while the stern clears the channel.
    const near=!y.wrecked && distance<(angle>0 ? 76 : 65);
    const occupied=near && angle===0 && world.traffic?.some(car=>car.npcDriver && Math.abs(car.x)<5 &&
      Math.abs(car.z-bridgeMiddle(bridge))<trafficStopLine(car)-.08);
    const target=near && !occupied?maxLift:0,step=maxLift*dt/5;
    lifts[key]=angle+Math.max(-step,Math.min(step,target-angle));
  }
}
