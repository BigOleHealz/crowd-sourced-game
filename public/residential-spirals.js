import {harborHouses} from './harbor-key-structures.js';
const shape=(home,x,z,r,inner,ys)=>({home,x,z,r,inner,ys,hole:r+.09,start:-Math.PI+.50,end:Math.PI-.50,
  steps:ys.slice(1).map((y,i)=>Math.ceil((y-ys[i])/.185))});
export const casaSpiral=shape('casa',-25,-406.05,2.09,.53,[1.07,4.77]);
export const mareSpiral=shape('mare',21.55,-447.08,2.33,.62,[.87,4.90,8.70]);
export const harborSpirals=harborHouses.map((b,i)=>shape('harbor-'+i,b.x+1.49,b.z,1.055,.105,[.824,4.70]));
export const residenceSpirals=[casaSpiral,mareSpiral,...harborSpirals];
export const spiralForHouse=b=>harborSpirals[harborHouses.indexOf(b)];
export function spiralWell(s,x,z,margin=0){return !!s && Math.abs(x-s.x)<=s.hole+margin && Math.abs(z-s.z)<=s.hole+margin;}
export function spiralPolar(s,x,z){
  const dx=x-s.x,dz=z-s.z,r=Math.hypot(dx,dz),a=Math.atan2(dz,dx);
  return {r,a,landing:a<s.start || a>=s.end};
}
export function spiralPoint(s,t,r=(s.inner+s.r)*.5){
  const a=s.start+(s.end-s.start)*t;
  return {x:s.x+Math.cos(a)*r,z:s.z+Math.sin(a)*r};
}
export function stairY(s,i,a){
  const t=Math.max(0,Math.min(1,(a-s.start)/(s.end-s.start)));
  return s.ys[i]+(s.ys[i+1]-s.ys[i])*t;
}
export function spiralSupport(s,x,z,probe){
  if(!spiralWell(s,x,z))return;
  const {a,r,landing}=spiralPolar(s,x,z);
  let y=s.ys[0];
  if(landing || r>s.r+.04){
    for(const floor of s.ys)if(floor<=probe+.002)y=floor;
  }else if(r>=s.inner-.03){
    for(let i=0;i<s.steps.length;i++){
      const floor=stairY(s,i,a);
      if(floor<=probe+.002)y=floor;
    }
  }
  return y;
}
export function spiralCeiling(s,x,y,z){
  if(!spiralWell(s,x,z))return Infinity;
  const {r,a,landing}=spiralPolar(s,x,z);
  if(landing || r>s.r || r<s.inner)return Infinity;
  for(let i=0;i<s.steps.length;i++){
    const underside=stairY(s,i,a)-.16;
    if(underside>y+.12)return underside;
  }
  return Infinity;
}
// The rail follows the helix in height as well as in plan. The landing is open
// towards the hall so either flight can be approached and the return is visible.
export function spiralSolid(s,x,z,pad,probe){
  if(!spiralWell(s,x,z,pad) || probe<s.ys[0]-.05)return -Infinity;
  const {r,a,landing}=spiralPolar(s,x,z),last=s.ys.at(-1);
  if(r<s.inner*.65+pad && probe<last+1.1)return last+1.0;
  if(!landing && Math.abs(r-s.r)<.04+pad){
    for(let i=s.steps.length-1;i>=0;i--){
      const top=stairY(s,i,a);
      if(probe>=top-.10 && probe<=top+2.86)return top+.98;
    }
  }
  return -Infinity;
}
export function outsideWell(rect,s){
  if(!s)return [rect];
  const l=rect.x-rect.w/2,r=rect.x+rect.w/2,n=rect.z-rect.d/2,b=rect.z+rect.d/2;
  const left=Math.max(l,s.x-s.hole),right=Math.min(r,s.x+s.hole),north=Math.max(n,s.z-s.hole),south=Math.min(b,s.z+s.hole);
  if(left>=right || north>=south)return [rect];
  return [[l,r,n,north],[l,r,south,b],[l,left,north,south],[right,r,north,south]]
    .filter(([a,c,h,k])=>c-a>.001 && k-h>.001)
    .map(([a,c,h,k])=>({...rect,x:(a+c)/2,z:(h+k)/2,w:c-a,d:k-h}));
}
