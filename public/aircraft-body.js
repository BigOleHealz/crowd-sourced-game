import * as THREE from 'three';

// Cross sections from the blunt chin through the flight deck and sliding cargo doors.
import {last,tau,skinPoint,aircraftPane} from './vehicle-glass-layout.js';
function skin(t,theta){return new THREE.Vector3(...skinPoint(t,theta));}
function surfaceNormal(t,theta) {
  const along=skin(t+.005,theta).sub(skin(t-.005,theta));
  const around=skin(t,theta+.001).sub(skin(t,theta-.001));
  return along.cross(around).normalize();
}

export function aircraftBody(hull,glazing,panes) {
  const paint={p:[],n:[],c:[]},glass=new Map();
  const paintTint=new THREE.Color(),rings=last*3,slices=48;
  const points=[],normals=[],liner=new THREE.Color();
  for(let r=0;r<=rings;r++) for(let j=0;j<=slices;j++) {
    points.push(skin(r/3,j*tau/slices));normals.push(surfaceNormal(r/3,j*tau/slices));
  }
  for(let r=0;r<rings;r++) for(let j=0;j<slices;j++) {
    const t=(r+.5)/3,angle=Math.min(j+.5,slices-j-.5)*tau/slices;
    const pane=aircraftPane(t,angle,j<24);
    if(pane && !glass.has(pane))glass.set(pane,{p:[],n:[],c:[]});
    const bucket=pane?glass.get(pane):paint;
    paintTint.setHex(pane ? 0x536969 : angle>2.19 ? 0x3b4039 : 0x515648);
    const a=r*(slices+1)+j,b=a+slices+1;
    for(const k of [a,b,b+1,a,b+1,a+1]) {
      bucket.p.push(...points[k].toArray());bucket.n.push(...normals[k].toArray());bucket.c.push(paintTint.r,paintTint.g,paintTint.b);
    }
    // Give the opaque cabin skin an inner face. Leave each window aperture
    // open so a missing pane still frames the seats and remaining windows.
    if(!pane && t<10.7){
      liner.setHex(angle>2.10?0x414440:angle<.84?0xb2ae98:0x818372);
      for(const k of [a,b+1,b,a,a+1,b+1]){
        const p=points[k],n=normals[k];
        paint.p.push(p.x-.023*n.x,p.y-.023*n.y,p.z-.023*n.z);
        paint.n.push(-n.x,-n.y,-n.z);paint.c.push(liner.r,liner.g,liner.b);
      }
    }
  }
  // Continue the first skin ring into a shallow domed chin. Sharing the
  // ring's positions and normals keeps the cowling continuous at the seam.
  const noseCenter=new THREE.Vector3(0,skinPoint(0,Math.PI/2)[1],skinPoint(0,Math.PI/2)[2]);
  const forward=new THREE.Vector3(0,0,-1);
  const nosePaint=new THREE.Color(0x515648);
  function noseVertex(j,band) {
    const f=band/3, radius=1-f;
    const p=points[j].clone().lerp(noseCenter,f);
    p.z-=.030*(1-radius*radius);
    const n=normals[j].clone().lerp(forward,f).normalize();
    const tint=paintTint.clone().lerp(nosePaint,f);
    paint.p.push(p.x,p.y,p.z);paint.n.push(n.x,n.y,n.z);paint.c.push(tint.r,tint.g,tint.b);
  }
  for(let band=0;band<3;band++) for(let j=0;j<slices;j++) {
    const angle=Math.min(j+.5,slices-j-.5)*tau/slices;
    paintTint.setHex(angle>2.19 ? 0x3b4039 : 0x515648);
    noseVertex(j,band);noseVertex(j+1,band);noseVertex(j+1,band+1);
    if(band<2){noseVertex(j,band);noseVertex(j+1,band+1);noseVertex(j,band+1);}
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
  append(paint,hull);
  for(const [id,bucket] of glass)panes.add(id,()=>append(bucket,glazing));

  // Thin seals follow the canopy curvature without interrupting reflections.
  function rail(t1,t2,a1,a2,width) {
    const steps=Math.ceil(Math.max(Math.abs(t2-t1)*3,Math.abs(a2-a1)*7));
    let start=skin(t1,a1).toArray();
    for(let j=1;j<=steps;j++){
      const f=j/steps,tip=skin(t1+(t2-t1)*f,a1+(a2-a1)*f).toArray();
      hull.beam(0x373d36,start,tip,width);start=tip;
    }
  }
  rail(2.33,4.67,0,0,.090);
  for(const sign of [-1,1]) {
    for(const t of [2.33,4.67]) rail(t,t,0,sign*1.31,.042);
    rail(2.33,4.67,sign*1.31,sign*1.31,.037);
    for(const t of [2.33,3.67])rail(t,t,sign*1.57,sign*2.10,.028);
    for(const a of [1.57,2.10])rail(2.33,3.67,sign*a,sign*a,.024);
    for(const [front,rear] of [[4.67,6.33],[6.67,7.67],[8,9]]){
      const roof=sign*.786,sill=sign*1.637;
      rail(front,front,roof,sill,.018);rail(rear,rear,roof,sill,.018);
      rail(front,rear,sill,sill,.020);rail(front,rear,roof,roof,.018);
    }
    // The pilot door and paired sliding cabin windows have independent jambs.
    for(const [front,rear] of [[4.67,6.38],[6.52,9.18]]){
      rail(front,front,sign*.73,sign*2.43,.012);
      rail(rear,rear,sign*.73,sign*2.43,.012);
      rail(front,rear,sign*2.43,sign*2.43,.013);
    }
    rail(6.25,9.60,sign*.71,sign*.71,.030);
  }
}
