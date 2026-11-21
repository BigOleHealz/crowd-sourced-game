import {MAP,sceneryHeight} from './world.js';

export const terrainWidth=164,terrainLength=terrainWidth-MAP.northBound-MAP.bounds;
export const terrainCols=172,terrainRows=Math.round(terrainCols*terrainLength/terrainWidth);
const stretch=.13;
function expand(v,lo,hi){
  const signed=Math.min(0,v-lo)+Math.max(0,v-hi);
  return v+stretch*signed*Math.abs(signed);
}
function contract(v,lo,hi){
  const edge=Math.max(lo,Math.min(hi,v)),offset=v-edge;
  return edge+Math.sign(offset)*(Math.sqrt(1+4*stretch*Math.abs(offset))-1)/(2*stretch);
}
export const ridgeX=x=>expand(x,-MAP.bounds-10,MAP.bounds+10);
export const ridgeZ=z=>expand(z,MAP.northBound-10,MAP.bounds+10);
// Outer trees stand on the actual drawn triangle, including across a steep
// crease where the continuous survey and the sampled mesh diverge.
export function ridgeFloor(x,z){
  const left=-terrainWidth/2,top=terrainWidth/2-terrainLength;
  const dx=terrainWidth/terrainCols,dz=terrainLength/terrainRows;
  const u=(contract(x,-MAP.bounds-10,MAP.bounds+10)-left)/dx;
  const v=(contract(z,MAP.northBound-10,MAP.bounds+10)-top)/dz;
  const x0=ridgeX(left+Math.floor(u)*dx),x1=ridgeX(left+(Math.floor(u)+1)*dx);
  const z0=ridgeZ(top+Math.floor(v)*dz),z1=ridgeZ(top+(Math.floor(v)+1)*dz);
  const a=(x-x0)/(x1-x0),b=(z-z0)/(z1-z0);
  const h10=sceneryHeight(x1,z0),h01=sceneryHeight(x0,z1);
  if(a+b<=1)return (1-a-b)*sceneryHeight(x0,z0)+a*h10+b*h01;
  return (1-b)*h10+(1-a)*h01+(a+b-1)*sceneryHeight(x1,z1);
}
