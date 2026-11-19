// Resolve visible clothing inside a hit already accepted by gameplay. Distances
// below are in metres; torso contacts occlude limbs on the far side of the body.
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
function capsule(origin,dir,a,b,r) {
  const axis=sub(b,a),offset=sub(origin,a),len=dot(axis,axis);
  const along=dot(axis,dir),start=dot(axis,offset);
  const nearest=mix(a,b,Math.max(0,Math.min(1,start/(len||1))));
  const delta=sub(origin,nearest);
  if(dot(delta,delta)<=r*r)return 0;
  let first=Infinity;
  const aa=len-along*along,bb=len*dot(offset,dir)-start*along;
  const cc=len*(dot(offset,offset)-r*r)-start*start;
  const disc=bb*bb-aa*cc;
  if(aa>1e-8 && disc>=0) {
    const t=(-bb-Math.sqrt(disc))/aa,position=start+t*along;
    if(t>=0 && position>=0 && position<=len)first=t;
  }
  for(const end of [a,b]) {
    const d=sub(origin,end),h=dot(d,dir),q=h*h-dot(d,d)+r*r;
    if(q>=0){const t=-h-Math.sqrt(q);if(t>=0)first=Math.min(first,t);}
  }
  return first;
}

export function posedHit(actor,from,dir,entry,exit) {
  if(!actor.hitPose)return null;
  const {joints,indices:J,origin}=actor.hitPose;
  const speed=Math.hypot(dir.x,dir.y,dir.z);
  if(speed<1e-8)return null;
  const ray={x:dir.x/speed,y:dir.y/speed,z:dir.z/speed};
  const feet=actor.state, start={x:from.x+origin.x-feet.x+dir.x*entry,
    y:from.y+origin.y-feet.y+dir.y*entry,z:from.z+origin.z-feet.z+dir.z*entry};
  let distance=Math.min(1.9,(exit-entry)*speed)+.001, part='torso', matched=false;
  function consider(a,b,r,name) {
    const t=capsule(start,ray,a,b,r);
    if(t<distance){distance=t;part=name;matched=true;}
  }
  const hips=[joints[J.hipL],joints[J.hipR]],shoulders=[joints[J.shoulderL],joints[J.shoulderR]];
  consider(hips[0],hips[1],.13,'torso');
  for(const across of [.30,.70])consider(mix(...hips,across),mix(...shoulders,across),.123,'torso');
  for(let i=0;i<2;i++) {
    const side=i===0?'left':'right', arm=side+'Arm',leg=side+'Leg';
    if(!actor.life?.lostParts?.[arm]) {
      consider(shoulders[i],joints[J.elbowL+i],.085,arm);
      consider(joints[J.elbowL+i],joints[J.wristL+i],.070,arm);
    }
    if(!actor.life?.lostParts?.[leg]) {
      consider(hips[i],joints[J.kneeL+i],.095,leg);
      consider(joints[J.kneeL+i],joints[J.ankleL+i],.083,leg);
      consider(joints[J.ankleL+i],joints[J.toeL+i],.080,leg);
    }
  }
  return {part,visualT:matched ? entry+distance/speed : entry};
}
