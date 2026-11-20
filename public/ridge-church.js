// Heights above the churchyard terrace. The nave faces south towards the trail.
export const church={x:0,z:-60,base:10.4};
export const churchPath=[[5,-47],[0,-50],[0,-53]];
export const churchParts=[],churchSteps=[];
const floors=[];
function part(kind,x,z,w,d,bottom,h,walkable=false){
  const p={kind,x,z:z+church.z,w,d,bottom,h,flushEdge:walkable};
  churchParts.push(p);
  if(walkable)floors.push(p);
  return p;
}
export function churchLot(x,z,margin=0){
  return Math.abs(x)<5.5+margin && z>church.z-14-margin && z<church.z+7.6+margin;
}
export function churchTerrace(x,z){
  const distance=Math.max(Math.abs(x)-5.7,church.z-14-z,z-church.z-8,0);
  const t=Math.min(1,distance/4);
  return 1-t*t*(3-2*t);
}
export function churchRoom(x,y,z){
  return y>=church.base-.12 && ((Math.abs(x)<5 && z>-66 && z< -53 && y<church.base+5.55) ||
    (Math.abs(x)<2.8 && z>=-73.35 && z<=-66 && y<church.base+10.55));
}
part('floor',0,.5,10.25,13.3,-.13,.08,true);
part('floor',0,-9.7,5.65,7.6,-.13,.08,true);
for(const side of [-1,1]){
  part('stone',side*3.26,7,3.49,.36,.08,5.3);
  part('stone',side*3.76,-6,2.50,.38,.08,5.3);
  for(let bay=0;bay<4;bay++){
    const z=-4.35+bay*3.2;
    part('stone',5*side,z, .34,3.2,.08,1.44);
    part('stone',5*side,z, .34,3.2,3.85,5.3);
    for(const edge of [-1,1])part('stone',5*side,z+edge*1.23,.34,.75,1.44,3.85);
    part('glass',5*side,z,.10,1.72,1.44,3.85);
  }
  part('stone',side*2.75,-9.72,.32,7.5,.08,7.65);
  for(const z of [-6.12,-13.3])part('stone',side*2.70,z,.49,.49,7.23,10.55);
  for(const z of [-3.2,-.6,2,4.6])part('pew',side*2.9,z,2.72,.72,.08,.98);
  part('rail',side*2.74,-9.72,.19,7.50,7.23,8.06);
}
part('stone',0,7,3.1,.38,3.48,5.3);
part('stone',0,-13.45,5.8,.36,.08,7.64);
part('stone',0,-6,5.6,.32,4.45,7.23);
part('rail',0,-13.40,5.55,.18,7.23,8.06);
part('rail',0,-6,5.55,.18,7.23,8.06);
part('table',3.2,-4.8,1.8,.82,.08,1.05);
part('landing',0,-12.67,5.32,1.35,3.46,3.66,true);
part('landing',0,-6.89,5.34,1.43,7.03,7.24,true);
part('landing',-1.35,-10.48,2.56,5.85,7.03,7.24,true);
part('landing',1.27,-12.95,2.64,.76,7.03,7.24,true);
for(const [x,start,end,low,high] of [[-1.35,-7.6,-12,.08,3.66],[1.35,-12,-7.6,3.66,7.24]]){
  for(let i=0;i<18;i++){
    const h=low+(high-low)*(i+1)/18;
    churchSteps.push(part('step',x,start+(end-start)*(i+.5)/18,2.48,Math.abs(end-start)/18,h-.16,h,true));
  }
}
// Enclose the nave with a pitched roof. Thin strips let the collision follow the slope.
for(let i=0;i<20;i++){
  const x=-4.94+i*.52,top=7.72-Math.abs(x)*.48;
  part('roof',x,.5,.52,13.8,top-.18,top);
}
part('cap',0,-9.8,6.05,7.72,10.52,10.8);
for(let i=0;i<9;i++){
  const f=1-i/9;
  part('spire',0,-9.8,5.9*f,7.5*f,10.8+i*.70,11.5+i*.70);
}
function covers(p,x,z){return Math.abs(x-p.x)<=p.w/2+.00001 && Math.abs(z-p.z)<=p.d/2+.00001;}
export function churchFloor(x,z,probe){
  let height=-Infinity;
  if(churchLot(x,z))for(const p of floors)if(church.base+p.h<=probe && covers(p,x,z))height=Math.max(height,church.base+p.h);
  return height;
}
export function churchCeiling(x,y,z){
  let limit=Infinity;
  if(churchLot(x,z))for(const p of churchParts)if(church.base+p.bottom>y+.01 && covers(p,x,z))limit=Math.min(limit,church.base+p.bottom);
  return limit;
}
