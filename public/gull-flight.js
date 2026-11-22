// Coastal beats keep the birds over open water, low enough to see from a dock.
// Offsets and differing periods let neighbours overtake and separate.
const beats=[
  {x:56,z:-5,rx:12,rz:19}, {x:76,z:-239,rx:9,rz:20}, {x:94,z:-434,rx:8,rz:13}
];
const flock=[
  [0,0,.96,4.4],[0,1.2,1.04,6.1],[0,3.8,.92,5.2],
  [1,.4,.98,5.3],[1,2.5,1.08,6.5],[1,4.8,.94,4.8],
  [2,1.2,1.02,4.4],[2,3.7,.96,6.2]
];
const tau=2*Math.PI;
const round=n=>Math.round(n*1000)/1000;

function flightPose(index,time){
  const [route,phase,size,height]=flock[index],b=beats[route];
  const rate=.26+.015*Math.sin(index*2.3),a=time*rate+phase;
  const drift=time*.083+phase,bob=time*.45+phase;
  const x=b.x+b.rx*Math.cos(a)+1.2*Math.sin(drift);
  const z=b.z+b.rz*Math.sin(a);
  const dx=-b.rx*rate*Math.sin(a)+1.2*.083*Math.cos(drift),dz=b.rz*rate*Math.cos(a);
  const ddx=-b.rx*rate*rate*Math.cos(a)-1.2*.083**2*Math.sin(drift);
  const ddz=-b.rz*rate*rate*Math.sin(a);
  const speed=Math.hypot(dx,dz),yawRate=(dx*ddz-dz*ddx)/(speed*speed);
  return {x:round(x),y:round(height+1.15*Math.sin(bob)),z:round(z),
    yaw:round(Math.atan2(dx,-dz)),pitch:round(Math.atan2(.5175*Math.cos(bob),speed)),
    roll:round(-Math.atan(speed*yawRate/9.8)),wing:round((time*(16+size)+phase)%tau),
    gliding:Math.sin(time*.78+phase)>.02};
}

export function createGulls(){
  let time=0;
  const state=flock.map((f,i)=>({...flightPose(i,time),size:f[2],hp:12,maxHp:12,
    hitSeq:0,ageSinceHit:null,deathKind:null}));
  const lastHit=state.map(()=>null);
  function step(dt){
    time+=dt;
    for(const [i,gull] of state.entries()){
      if(gull.ageSinceHit===0 && lastHit[i]?.seq!==gull.hitSeq)lastHit[i]={seq:gull.hitSeq,time:time-dt};
      if(lastHit[i])gull.ageSinceHit=round(time-lastHit[i].time);
      if(!gull.hp){
        if(gull.ageSinceHit<90)continue;
        Object.assign(gull,{hp:gull.maxHp,ageSinceHit:null,deathKind:null,hitX:null,hitY:null,hitZ:null});
        lastHit[i]=null;
      }
      Object.assign(gull,flightPose(i,time));
    }
  }
  return {state,step};
}

// Sweep in the bird's banked coordinate frame. Separate wing and torso
// volumes leave room for misses above and below an outstretched wing.
export function gullContact(states,start,end){
  let nearest=null;
  for(const [i,b] of (states??[]).entries()){
    const reach=.95*b.size;
    if(!b.hp || b.x<Math.min(start.x,end.x)-reach || b.x>Math.max(start.x,end.x)+reach ||
       b.y<Math.min(start.y,end.y)-reach || b.y>Math.max(start.y,end.y)+reach ||
       b.z<Math.min(start.z,end.z)-reach || b.z>Math.max(start.z,end.z)+reach)continue;
    const cy=Math.cos(b.yaw),sy=Math.sin(b.yaw),cp=Math.cos(b.pitch),sp=Math.sin(b.pitch);
    const cr=Math.cos(b.roll),sr=Math.sin(b.roll);
    function local(p){
      const x=(p.x-b.x)/b.size,y=(p.y-b.y)/b.size,z=(p.z-b.z)/b.size;
      const right=cy*x+sy*z,back=-sy*x+cy*z,up=cp*y+sp*back;
      return [cr*right+sr*up,-sr*right+cr*up,-sp*y+cp*back];
    }
    const a=local(start),e=local(end);
    const lift=b.gliding?.05:.14*Math.sin(b.wing);
    for(const [cx,cz,up,rx,ry,rz] of [[0,0,0,.125,.14,.34],[-.40,.04,lift,.39,.085,.14],[.40,.04,lift,.39,.085,.14]]){
      const ox=(a[0]-cx)/rx,oy=(a[1]-up)/ry,oz=(a[2]-cz)/rz;
      const dx=(e[0]-a[0])/rx,dy=(e[1]-a[1])/ry,dz=(e[2]-a[2])/rz;
      const aa=dx*dx+dy*dy+dz*dz,dot=ox*dx+oy*dy+oz*dz,c=ox*ox+oy*oy+oz*oz-1;
      const disc=dot*dot-aa*c;
      if(c>0 && (aa===0 || disc<0))continue;
      const t=c<=0?0:(-dot-Math.sqrt(disc))/aa;
      if(t>=0 && t<=1 && (!nearest || t<nearest.t))nearest={index:i,t};
    }
  }
  return nearest;
}

export function damageGull(states,index,amount,kind,point){
  const b=states?.[index];
  if(!b?.hp || !Number.isFinite(amount) || amount<=0)return false;
  b.hp=Math.max(0,b.hp-amount);
  b.hitSeq++;b.ageSinceHit=0;
  b.hitX=round(point?.x??b.x);b.hitY=round(point?.y??b.y);b.hitZ=round(point?.z??b.z);
  if(!b.hp)b.deathKind=kind;
  return true;
}
