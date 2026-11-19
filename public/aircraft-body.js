import * as THREE from 'three';

// Longitudinal stations in model space. The front stations form the bubble
// canopy, the rear stations taper into the existing animated tail assembly.
const stations=[
  [-1.62,.015,.93,.024],[-1.53,.31,.95,.20],[-1.33,.52,.984,.355],
  [-1.06,.645,1.025,.468],[-.75,.712,1.06,.53],[-.52,.735,1.07,.552],
  [-.15,.746,1.074,.555],[.29,.733,1.075,.54],[.59,.68,1.072,.485],
  [.86,.574,1.066,.414],[1.16,.412,1.07,.32],[1.44,.226,1.086,.208],[1.57,.135,1.09,.145]
];
const last=stations.length-1, tau=Math.PI*2;
function skin(t,theta) {
  t=THREE.MathUtils.clamp(t,0,last);
  const i=Math.min(last-1,Math.floor(t)),f=t-i;
  const a=stations[Math.max(0,i-1)],b=stations[i],c=stations[i+1],d=stations[Math.min(last,i+2)];
  function at(k) {
    return b[k]+.5*f*((c[k]-a[k])+f*(2*a[k]-5*b[k]+4*c[k]-d[k]+f*(3*b[k]-a[k]-3*c[k]+d[k])));
  }
  const curve=v=>Math.sign(v)*Math.abs(v)**.84;
  return new THREE.Vector3(at(1)*curve(Math.sin(theta)),at(2)+at(3)*curve(Math.cos(theta)),at(0));
}
function surfaceNormal(t,theta) {
  const along=skin(t+.005,theta).sub(skin(t-.005,theta));
  const around=skin(t,theta+.001).sub(skin(t,theta-.001));
  return along.cross(around).normalize();
}

export function aircraftBody(hull,glazing) {
  const paint={p:[],n:[],c:[]},glass={p:[],n:[],c:[]};
  const paintTint=new THREE.Color(),rings=last*3,slices=48;
  const points=[],normals=[];
  for(let r=0;r<=rings;r++) for(let j=0;j<=slices;j++) {
    points.push(skin(r/3,j*tau/slices));normals.push(surfaceNormal(r/3,j*tau/slices));
  }
  for(let r=0;r<rings;r++) for(let j=0;j<slices;j++) {
    const t=(r+.5)/3,angle=Math.min(j+.5,slices-j-.5)*tau/slices;
    const windscreen=t>1.32 && t<4.67 && angle<1.60 && angle>.055;
    const window=((t>5.0 && t<6.66) || (t>7.0 && t<8.66)) && angle>.59 && angle<1.70;
    const pane=windscreen || window, bucket=pane ? glass : paint;
    paintTint.setHex(pane ? 0x526560 : angle>2.19 ? 0x41483e : angle>1.86 && angle<1.99 ? 0x929281 : 0x71765e);
    const a=r*(slices+1)+j,b=a+slices+1;
    for(const k of [a,b,b+1,a,b+1,a+1]) {
      bucket.p.push(...points[k].toArray());bucket.n.push(...normals[k].toArray());bucket.c.push(paintTint.r,paintTint.g,paintTint.b);
    }
  }
  function append(bucket,batch){
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(bucket.p,3));
    geo.setAttribute('normal',new THREE.Float32BufferAttribute(bucket.n,3));
    const offset=batch.colors.length;
    batch.add(geo,0xffffff,0,0,0);
    for(let i=0;i<bucket.c.length;i++) batch.colors[offset+i]=bucket.c[i];
    geo.dispose();
  }
  append(paint,hull);append(glass,glazing);

  // Thin seals follow the canopy curvature without interrupting reflections.
  function rail(t1,t2,a1,a2,width) {
    const steps=Math.ceil(Math.max(Math.abs(t2-t1)*3,Math.abs(a2-a1)*7));
    let start=skin(t1,a1).toArray();
    for(let j=1;j<=steps;j++){
      const f=j/steps,tip=skin(t1+(t2-t1)*f,a1+(a2-a1)*f).toArray();
      hull.beam(0x373d36,start,tip,width);start=tip;
    }
  }
  rail(1.33,4.67,0,0,.023);
  for(const sign of [-1,1]) {
    for(const t of [1.33,4.67]) rail(t,t,0,sign*Math.PI/2,.023);
    rail(1.33,4.67,sign*Math.PI/2,sign*Math.PI/2,.024);
    for(const [front,rear] of [[5,6.67],[7,8.67]]){
      const roof=sign*.655,sill=sign*1.702;
      rail(front,front,roof,sill,.018);rail(rear,rear,roof,sill,.018);
      rail(front,rear,sill,sill,.020);rail(front,rear,roof,roof,.018);
    }
  }
}
