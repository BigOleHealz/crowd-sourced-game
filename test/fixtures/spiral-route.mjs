import {spiralPoint} from '../../public/residential-spirals.js';

export function spiralRoute(s,up=true){
  const radius=(s.inner+s.r)*.52,landing=[s.x-radius,s.z];
  const route=[[s.x-s.r-.12,s.z],landing];
  for(let k=0;k<=36;k++){
    const p=spiralPoint(s,up?k/36:1-k/36,radius);
    route.push([p.x,p.z]);
  }
  return [...route,landing,[s.x-s.r-.12,s.z]];
}
