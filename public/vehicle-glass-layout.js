const stations=[
  [-2.53,.13,.80,.13],[-2.43,.39,.81,.23],[-2.18,.57,.84,.30],
  [-1.90,.65,.98,.42],[-1.55,.71,1.12,.55],[-1.17,.74,1.12,.58],
  [-.73,.76,1.12,.59],[-.12,.77,1.12,.60],[.52,.77,1.12,.60],
  [1.06,.74,1.15,.55],[1.53,.59,1.19,.44],[1.87,.37,1.28,.31],[2.10,.24,1.34,.23]
];
export const last=stations.length-1, tau=Math.PI*2;
export function skinPoint(t,theta) {
  t=Math.max(0,Math.min(t,last));
  const i=Math.min(last-1,Math.floor(t)),f=t-i;
  const a=stations[Math.max(0,i-1)],b=stations[i],c=stations[i+1],d=stations[Math.min(last,i+2)];
  function at(k) {
    return b[k]+.5*f*((c[k]-a[k])+f*(2*a[k]-5*b[k]+4*c[k]-d[k]+f*(3*b[k]-a[k]-3*c[k]+d[k])));
  }
  const curve=v=>Math.sign(v)*Math.abs(v)**.42;
  return [at(1)*curve(Math.sin(theta)),at(2)+at(3)*curve(Math.cos(theta)),at(0)];
}

export function aircraftPane(t,angle,right){
    const windscreen=t>2.32 && t<4.67 && angle<1.33 && angle>.055;
    const window=((t>4.67 && t<6.33) || (t>6.67 && t<7.67) || (t>8 && t<9)) && angle>.78 && angle<1.63;
    const footlight=t>2.33 && t<3.67 && angle>1.57 && angle<2.10;
  if(!windscreen && !window && !footlight)return null;
  return (right?'R':'L')+(windscreen?'wind':footlight?'foot':t<6.34?'pilot':t<7.68?'forward':'aft');
}
export const glassQuads={heli:[],rover:[],supercar:[]};
for(let r=0;r<last*3;r++)for(let j=0;j<48;j++){
  const angle=Math.min(j+.5,48-j-.5)*tau/48,id=aircraftPane((r+.5)/3,angle,j<24);
  if(!id)continue;
  const corners=[[r,j],[r+1,j],[r+1,j+1],[r,j+1]].map(([a,b])=>skinPoint(a/3,b*tau/48).map(v=>v*1.24));
  glassQuads.heli.push({id,corners});
}
const add=(kind,id,...corners)=>glassQuads[kind].push({id,corners});
export const sections=[
  // z, half-width, centre bonnet, fender shoulder, lowest sill
  [-2.31,.67,.40,.43,.16],[-2.18,.83,.46,.53,.15],[-1.91,.965,.53,.68,.15],
  [-1.47,1.00,.565,.785,.16],[-1.07,.955,.61,.70,.16],[-.82,.947,.66,.67,.16],
  [-.57,.94,.695,.65,.15],[-.10,.955,.685,.64,.15],[.43,.965,.70,.68,.15],
  [.88,.99,.735,.76,.15],[1.18,1.01,.74,.805,.16],[1.47,1.02,.735,.83,.17],
  [1.86,.978,.695,.79,.18],[2.12,.914,.67,.70,.20],[2.30,.817,.625,.63,.205],
];
export function sectionAt(z){
  for(let i=1;i<sections.length;i++)if(z<=sections[i][0]){
    const a=sections[i-1],b=sections[i],t=Math.max(0,Math.min(1,(z-a[0])/(b[0]-a[0])));
    return a.map((v,k)=>v+(b[k]-v)*t);
  }
  return sections.at(-1);
}
export const canopy=[[-.97,.72,.675],[-.69,.74,.88],[-.30,.61,1.17],[.03,.59,1.23],[.40,.596,1.20],[.71,.66,1.06],[1.15,.71,.738]];
for(let i=1;i<canopy.length;i++){
  const [z0,w0,h0]=canopy[i-1],[z1,w1,h1]=canopy[i];
  if(i<3 || i>4)add('supercar',i<3?'front':'rear',[-w0,h0-.045,z0],[-w1,h1-.045,z1],[w1,h1-.045,z1],[w0,h0-.045,z0]);
  for(const s of [-1,1])add('supercar',s<0?'left':'right',[s*.785,sectionAt(z0)[2]+.016,z0],[s*.785,sectionAt(z1)[2]+.016,z1],[s*w1,h1-.045,z1],[s*w0,h0-.045,z0]);
}
add('rover','front',[-.611,1.02,-.633],[.611,1.02,-.633],[.553,1.55,-.40],[-.553,1.55,-.40]);
add('rover','rear',[-.635,1.015,.37],[-.573,1.53,.298],[.573,1.53,.298],[.635,1.015,.37]);
for(const s of [-1,1])add('rover',s<0?'left':'right',[s*.667,1.023,-.58],[s*.597,1.54,-.397],[s*.599,1.53,.299],[s*.665,1.02,.356]);
// The original window quads followed the small procedural truck. Fit them to
// the imported Humvee cabin after its real-size rescale.
for(const pane of glassQuads.rover)for(const corner of pane.corners){corner[0]*=1.48;corner[1]+=.15;corner[2]*=2.35;}
for(const pane of glassQuads.supercar)for(const corner of pane.corners){corner[0]*=1.958/2.3366;corner[2]*=4.565/4.8349;}

const trafficGlass={
  sedan:{w:.86,roof:1.52,topFront:-.42,topRear:.55,cabinEnd:1.29},
  hatchback:{w:.82,roof:1.55,topFront:-.40,topRear:.84,cabinEnd:1.47},
  van:{w:.95,roof:2.10,topFront:-.43,topRear:1.91,cabinEnd:2.16},
};
for(const [kind,{w,roof,topFront,topRear,cabinEnd}] of Object.entries(trafficGlass)){
  glassQuads[kind]=[];
  const van=kind==='van',front=van?-1.07:-1.02,post=van?.28:.26;
  const belt=van?1.025:.965,topW=w-(van?.19:.185),sideBottom=van?1.033:.964;
  const frontLower=f=>[f*(w-.066),belt+.012+.026*(1-f*f),front-.053*(1-f*f)];
  const frontUpper=f=>[f*(topW-.026),roof-.086+.043*(1-f*f),topFront-.017*(1-f*f)];
  const samples=[-1,-.68,-.30,0,.30,.68,1];
  for(let i=1;i<samples.length;i++)add(kind,'front',frontLower(samples[i-1]),frontUpper(samples[i-1]),frontUpper(samples[i]),frontLower(samples[i]));
  for(const side of [-1,1]){
    const forward=[side*(w-.059),sideBottom,front+.07],forwardTop=[side*topW,roof-.083,topFront+.034];
    const backTop=[side*topW,roof-.083,post+.025],back=[side*(w-.058),sideBottom,post-.047];
    if(side>0)add(kind,'right',forward,forwardTop,backTop,back);
    else{
      const quarterBase=[side*(w-.060),sideBottom,front+.22];
      const quarterTop=forward.map((v,i)=>v+.31*(forwardTop[i]-v));
      add(kind,'leftQuarter',forward,quarterTop,quarterTop,quarterBase);
    }
    if(!van)add(kind,side<0?'leftRear':'rightRear',
      [side*(w-.055),belt+.012,post+.042],[side*topW,roof-.09,post+.11],
      [side*topW,roof-.09,topRear-.032],[side*(w-.061),belt+.012,cabinEnd-.065]);
    else add(kind,side<0?'leftRear':'rightRear',
      [side*.075,1.39,cabinEnd+.012],[side*(w-.158),1.39,cabinEnd+.012],
      [side*(w-.171),1.82,cabinEnd+.012],[side*.075,1.84,cabinEnd+.012]);
  }
  if(!van)add(kind,'rear',[-topW+.025,roof-.082,topRear],[topW-.025,roof-.082,topRear],
    [w-.061,belt+.022,cabinEnd],[-w+.061,belt+.022,cabinEnd]);
}

const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const triangles={};
for(const [kind,quads] of Object.entries(glassQuads)){
  triangles[kind]=quads.flatMap(({id,corners:[a,b,c,d]})=>[[a,b,c],[a,c,d]].map(([p,q,r])=>({id,p,ab:sub(q,p),ac:sub(r,p)})));
}
export function windowContact(kind,v,point,velocity,pickup=true,includeBroken=false){
  const c=Math.cos(v.yaw),s=Math.sin(v.yaw);
  const pitch=v.pitch??v.suspension?.pitch??0,roll=v.roll??v.suspension?.roll??0;
  function local(x,y,z){
    const side=c*x+s*z,aft=-s*x+c*z,up=y*Math.cos(pitch)+aft*Math.sin(pitch);
    return [side*Math.cos(roll)+up*Math.sin(roll),up*Math.cos(roll)-side*Math.sin(roll),aft*Math.cos(pitch)-y*Math.sin(pitch)];
  }
  const d=local(velocity.x,velocity.y,velocity.z),length=Math.hypot(...d);
  if(length<1e-9)return null;
  for(let i=0;i<3;i++)d[i]/=length;
  const origin=local(point.x-v.x,point.y-v.y-(v.suspension?.heave??0),point.z-v.z);
  // The gameplay hull surrounds the detailed bodywork. Refine only a short
  // segment around its contact so a shot into the bumper cannot hit rear glass.
  let nearest=kind==='heli'?1.05:.70,hit=null;
  for(const tri of triangles[kind]){
    if((!includeBroken && v.brokenGlass?.[tri.id]) || (kind==='rover' && !pickup && tri.id!=='front'))continue;
    const p=cross(d,tri.ac),det=dot(tri.ab,p);
    if(Math.abs(det)<1e-8)continue;
    const offset=sub(origin,tri.p),u=dot(offset,p)/det;
    if(u<0 || u>1)continue;
    const q=cross(offset,tri.ab),vcoord=dot(d,q)/det;
    if(vcoord<0 || u+vcoord>1)continue;
    const t=dot(tri.ac,q)/det;
    if(t<-.55 || t>=nearest)continue;
    nearest=t;
    hit={id:tri.id,x:point.x+t*velocity.x/length,y:point.y+t*velocity.y/length,z:point.z+t*velocity.z/length};
  }
  return hit;
}
