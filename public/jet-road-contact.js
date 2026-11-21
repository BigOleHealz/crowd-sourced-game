import {wingOutline,tailOutline,strakeOutline} from './jet-layout.js';

// Piecewise convex prisms leave clear space ahead of the swept wings and
// underneath the airframe. Clip each to the car's height before testing in XZ.
const pieces=[];
function prism(plan,bottom,top,gear=false){
  const n=plan.length;
  const vertices=[bottom,top].flatMap(y=>plan.map(([x,z])=>[x,y,z]));
  const edges=[];
  for(let i=0;i<n;i++){
    const j=(i+1)%n;
    edges.push([i,j],[n+i,n+j],[i,i+n]);
  }
  pieces.push({vertices,edges,gear});
}
function tapered(x,front,frontWidth,rear,rearWidth,low,high,gear=false){
  prism([[x-frontWidth,front],[x+frontWidth,front],[x+rearWidth,rear],[x-rearWidth,rear]],low,high,gear);
}
tapered(0,-3.25,.01,-2.25,.35,.75,1.2);
tapered(0,-2.25,.35,-1.36,.49,.62,1.38);
tapered(0,-1.36,.49,.60,.71,.52,1.49);
tapered(0,.60,.71,2.78,.03,.64,1.30);
tapered(0,-1.95,.20,-.68,.28,1.28,1.78);
tapered(0,-1.76,.09,-1.40,.09,0,.70,true);
for(const side of [-1,1]){
  tapered(side*.44,-1.42,.22,2.68,.26,.59,1.24);
  tapered(side*.72,.50,.10,.92,.10,0,.76,true);
  for(const [outline,y,h] of [[wingOutline,.88,.10],[tailOutline,1,.068],[strakeOutline,1.07,.07]])
    prism(outline.map(([x,z])=>[side*x,z]),y,y+h);
  // The canted fins are raised and swept aft, with a much smaller plan
  // at their tips than at their roots.
  tapered(side*.65,1.25,.10,2.42,.12,1.08,1.72);
  tapered(side*.82,1.78,.10,2.42,.09,1.72,2.20);
}

const cache=new WeakMap();
function transformed(jet){
  const {x,y,z,yaw,pitch=0}=jet, roll=jet.wrecked?1.12:jet.roll??0,gear=jet.grounded || jet.speed<13;
  const last=cache.get(jet);
  if(last && x===last.x && y===last.y && z===last.z && yaw===last.yaw && pitch===last.pitch && roll===last.roll && gear===last.gear)return last.solids;
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),cr=Math.cos(roll),sr=Math.sin(roll);
  const solids=pieces.filter(p=>gear || !p.gear).map(({vertices,edges})=>{
    const points=vertices.map(([u,v,w])=>{
      const a=cr*u-sr*v,b=sr*u+cr*v,c=sp*b+cp*w;
      return [x+cy*a-sy*c,y+cp*b-sp*w,z+sy*a+cy*c];
    });
    return {points,edges,bottom:Math.min(...points.map(p=>p[1])),top:Math.max(...points.map(p=>p[1]))};
  });
  cache.set(jet,{x,y,z,yaw,pitch,roll,gear,solids});
  return solids;
}

function outlineAtHeight(solid,low,high){
  const lower=Math.max(low,solid.bottom),upper=Math.min(high,solid.top);
  if(solid.outline && solid.low===lower && solid.high===upper)return solid.outline;
  const {points,edges}=solid;
  const plan=points.filter(p=>p[1]>=low && p[1]<=high).map(p=>[p[0],p[2]]);
  for(const [i,j] of edges){
    const a=points[i],b=points[j];
    for(const height of [low,high]){
      if((height-a[1])*(height-b[1])>=0)continue;
      const t=(height-a[1])/(b[1]-a[1]);
      plan.push([a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t]);
    }
  }
  plan.sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
  const chain=(points)=>{
    const hull=[];
    for(const p of points){
      while(hull.length>=2){
        const a=hull.at(-2),b=hull.at(-1);
        if((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])>1e-10)break;
        hull.pop();
      }
      hull.push(p);
    }
    hull.pop();return hull;
  };
  solid.low=lower;solid.high=upper;
  return solid.outline=[...chain(plan),...chain(plan.reverse())];
}

export function jetRoadContact(jet,x,y,z,yaw,shape){
  if(!jet || Math.abs(jet.x-x)>8 || Math.abs(jet.z-z)>8 || Math.abs(jet.y-y)>6)return;
  const roof=y+(shape.roof??shape.height??1.66),c=Math.cos(yaw),s=Math.sin(yaw);
  let result;
  for(const solid of transformed(jet)){
    if(solid.bottom>=roof || solid.top<=y)continue;
    const outline=outlineAtHeight(solid,y,roof);
    if(outline.length<3)continue;
    const axes=[[c,s],[-s,c]];
    for(let i=0;i<outline.length;i++){
      const a=outline[i],b=outline[(i+1)%outline.length];
      const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
      if(length>1e-8)axes.push([-dz/length,dx/length]);
    }
    let depth=Infinity,nx=0,nz=0;
    for(const [ax,az] of axes){
      const radius=(shape.halfWidth-shape.corner)*Math.abs(ax*c+az*s)+(shape.halfLength-shape.corner)*Math.abs(az*c-ax*s)+shape.corner;
      let lo=Infinity,hi=-Infinity;
      for(const [px,pz] of outline){
        const d=(px-x)*ax+(pz-z)*az;
        lo=Math.min(lo,d);hi=Math.max(hi,d);
      }
      const pushPositive=hi+radius,pushNegative=radius-lo;
      const overlap=Math.min(pushPositive,pushNegative);
      if(overlap<=0){depth=0;break;}
      if(overlap<depth){
        depth=overlap;const sign=pushPositive<pushNegative?1:-1;nx=ax*sign;nz=az*sign;
      }
    }
    if(depth && (!result || result.depth<depth))result={nx,nz,depth,object:jet};
  }
  return result;
}
