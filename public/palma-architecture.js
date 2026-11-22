import * as THREE from 'three';
import {displayBays,arrivalSections,arrivalPoint,arrivalWalls,pool,poolTerrace,levelY} from './palma-site.js';

// Architectural surfaces are static and share the resort's three material batches.
export function dressPalmaArchitecture({stone,metal,glow,box,disc,ball,blade}){
  const limestone=0xe9d6b2,travertine=0xc4a888,champagne=0xc99c65,teak=0x77513c,jade=0x234741;
  function patch(batch,color,vertices,indices){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));g.setIndex(indices);g.computeVertexNormals();
    batch.add(g,color,0,0,0);g.dispose();
  }
  const quad=(batch,color,a,b,c,d)=>patch(batch,color,[a,b,c,d],[0,1,2,0,2,3]);
  function planter(x,y,z,r){
    stone.add(disc,travertine,x,y+.23*r,z,1.72*r,.46*r,1.72*r);
    metal.add(disc,champagne,x,y+.44*r,z,1.79*r,.07*r,1.79*r);
    stone.add(disc,0x503c2d,x,y+.48*r,z,1.64*r,.05*r,1.64*r);
    for(let j=0;j<19;j++){
      const a=j*2.4,radius=r*(.60+.36*Math.sin(j*1.9));
      blade(stone,[0x416341,0x627d46,0x888c4a,0x395844][j%4],[x,y+.49*r,z],
        [x+radius*Math.cos(a),y+r*(.87+.54*(j%3)),z+radius*Math.sin(a)],r*.36,[0,1,0]);
    }
  }
  // Brass inlays follow the pose of each vehicle, with an open approach at the nose.
  for(const {x,z,yaw} of displayBays){
    const c=Math.cos(yaw),s=Math.sin(yaw);
    const point=(right,forward)=>[x+c*right+s*forward,.804,z+s*right-c*forward];
    const strip=(left,right,rear,front)=>quad(metal,champagne,point(left,rear),point(right,rear),point(right,front),point(left,front));
    for(const side of [-1,1])strip(side*1.48-.028,side*1.48+.028,-2.7,2.7);
    strip(-1.48,1.48,-2.7,-2.645);
  }
  // Wall-to-ground cheeks close both exposed road edges, even at the curb cuts.
  for(let i=1;i<arrivalSections.length;i++){
    const a=arrivalSections[i-1],b=arrivalSections[i];
    const p=(section,s,h)=>arrivalPoint(section,s,h);
    quad(stone,0xcab69f,p(a,-2.52,a.y),p(b,-2.52,b.y),p(b,2.52,b.y),p(a,2.52,a.y));
    for(const side of [-1,1]){
      const edge=side*2.52;
      quad(stone,travertine,p(a,edge,.58),p(b,edge,.58),p(b,edge,b.y),p(a,edge,a.y));
      quad(stone,0x95765b,p(a,side*1.94,a.y+.005),p(b,side*1.94,b.y+.005),p(b,side*2.10,b.y+.005),p(a,side*2.10,a.y+.005));
    }
  }
  for(const {from:a,to:b,ht,side} of arrivalWalls){
    const dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz);
    const at=(p,offset,y)=>[p[0]+side*dz/len*offset,y,p[2]-side*dx/len*offset];
    for(const o of [-.13,.13])quad(stone,limestone,at(a,o,a[1]-.04),at(b,o,b[1]-.04),at(b,o,b[1]+ht),at(a,o,a[1]+ht));
    quad(stone,0xf4dfb7,at(a,-.13,a[1]+ht),at(b,-.13,b[1]+ht),at(b,.13,b[1]+ht),at(a,.13,a[1]+ht));
    for(const p of [a,b])quad(stone,travertine,at(p,-.13,p[1]),at(p,.13,p[1]),at(p,.13,p[1]+ht),at(p,-.13,p[1]+ht));
    if(ht>.22)metal.beam(champagne,at(a,.145,a[1]+ht-.09),at(b,.145,b[1]+ht-.09),.042);
  }

  // A deeply fluted bell supporting the broad, continuous porte-cochère of the reference.
  const cx=-67.45,cz=49.65;
  for(let j=0;j<64;j++){
    const radii=[[.49,.50,.70,cz],[.58,.61,3.1,cz],[.78,.89,4.8,cz-.20],[1.35,2.2,6.0,cz-.54],[2.41,4.6,6.85,cz-1.6],[5.4,8.25,7.58,44.5]];
    const ring=(k,r)=>{
      const a=k*Math.PI/32,fold=k%2?.92:1;
      return [cx+r[0]*Math.cos(a)*fold,r[2]+(k%2?.06:0),r[3]+r[1]*Math.sin(a)*fold];
    };
    for(let k=1;k<radii.length;k++)quad(metal,j%2?0xa97a4c:0xd4a76d,ring(j,radii[k-1]),ring(j+1,radii[k-1]),ring(j+1,radii[k]),ring(j,radii[k]));
    const a=ring(j,radii.at(-1)),b=ring(j+1,radii.at(-1));
    quad(metal,champagne,a,b,[b[0],7.90,b[2]],[a[0],7.90,a[2]]);
    patch(stone,0xb69b77,[[cx,7.90,44.5],[a[0],7.90,a[2]],[b[0],7.90,b[2]]],[0,1,2]);
    if(j%4===0)for(let k=3;k<radii.length;k++)glow.beam(0xffdb96,ring(j,radii[k-1]),ring(j,radii[k]),.045);
  }
  for(const z of [38.3,49.95]){
    box(stone,limestone,-69.15,4.59,z,.91,5.6,.94);
    box(metal,champagne,-68.67,4.68,z,.08,5.76,.29);
    box(glow,0xffe4a0,-68.61,4.60,z,.045,4.95,.08);
  }
  for(const [x,z] of [[-69.8,36.9],[-69.8,50.7],[-46.35,40.9],[-46.55,47.95]])planter(x,.8,z,.87);

  // Seven branching piers span the six deep loggias. The low balcony edges stay horizontal.
  for(let i=0;i<=6;i++){
    const x=-72.55+i*6.17;
    for(const s of [-1,1]){
      const reach=Math.min(3.12,s<0?x+73:-35-x);
      if(reach<.1)continue;
      const profile=[[x,.8],[x+s*.48,1.02],[x+s*.68,5.5],[x+s*reach,15.48],[x+s*reach,16.7],[x+s*Math.min(reach,.90),15.78],[x+s*.18,8.05]];
      const pos=[...profile.map(([u,h])=>[u,h,95.97]),...profile.map(([u,h])=>[u,h,94.71])],ix=[];
      for(let k=1;k<profile.length-1;k++)ix.push(0,k,k+1,7,7+k+1,7+k);
      for(let k=0;k<7;k++){const n=(k+1)%7;ix.push(k,n,n+7,k,n+7,k+7);}
      patch(stone,limestone,pos,ix);
      metal.beam(champagne,[x+s*.2,2.2,96.0],[x+s*reach,16.23,96.0],.13);
      glow.beam(0xeab46d,[x+s*.24,2.22,96.08],[x+s*reach,16.18,96.08],.075);
      glow.beam(0xd79c62,[x,1.20,96.02],[x+s*.33,5.22,96.07],.092);
    }
    // The arcade face sits forward of the glass, giving the tall openings a shaded reveal.
    box(stone,limestone,x,2.63,95.73,.58,3.66,1.55);
    box(metal,champagne,x,1.01,95.74,.66,.14,1.61);
    if(i===6)continue;
    const mid=x+3.08;
    box(stone,limestone,mid,16.5,95.20,6.2,.77,2.43);
    box(stone,teak,mid,16.06,95.27,5.78,.13,1.87);
    for(const y of [6.63,11.63]){
      box(stone,0xb3997b,mid,y,94.52,5.86,.43,2.12);
      box(metal,champagne,mid,y+.23,95.60,5.91,.105,.105);
      box(glow,0xffca82,mid,y-.19,95.60,5.67,.095,.08);
      for(const side of [-1,1]){
        const xx=mid+side*1.84;
        box(stone,0x344c3e,xx,y+.55,95.13,1.27,.47,.53);
        for(let k=0;k<7;k++)stone.add(ball,k%2?0x587148:0x758451,xx+(k-3)*.17,y+.86,95.14+.065*Math.sin(k),.30,.35+.09*(k%3),.38);
      }
    }
    planter(mid-1.93,.8,96.46,.53);
    for(const offset of [-1.4,1.4]){
      metal.beam(champagne,[mid+offset,14.6,94.85],[mid+offset,16.1,94.85],.036);
      glow.add(ball,0xffcf8f,mid+offset,14.45,94.85,.38,.43,.38);
    }
  }
  // The unbroken stone cornice carries around the west return that a passing boat sees first.
  for(const y of [6.63,11.63,16.42]){
    box(stone,limestone,-73.29,y,82.5,1.10,.58,25.28);
    box(metal,champagne,-73.87,y+.21,82.5,.085,.115,25.22);
  }
  for(const z of [70.45,76.43,82.43,88.43,94.45]){
    box(stone,limestone,-73.26,8.46,z,.90,15.24,.88);
    for(const s of [-1,1])metal.beam(champagne,[-73.76,7.3,z],[-73.76,16.3,z+s*2.6],.15);
  }

  // Rounded bay fascias throw real shadows between the window ribbons. Two gilded
  // corner sails spring from the roof and split against the sky from the southwest.
  for(const y of levelY.slice(5,23)){
    for(const z of [32,62]){
      const sign=z<40?-1:1;
      for(let i=0;i<12;i++){
        const at=t=>[-88.52+14.56*t,y-.12,z+sign*(.26+.63*Math.sin(Math.PI*t))];
        const a=at(i/12),b=at((i+1)/12),lower=p=>[p[0],p[1]-.26,p[2]];
        quad(stone,limestone,lower(a),lower(b),b,a);
        quad(stone,0x988369,a,b,[b[0],y-.12,z],[a[0],y-.12,z]);
        metal.beam(champagne,a,b,.084,.11);
        if(y===levelY[5] || y===levelY[12] || y>=levelY[20])glow.beam(0xffce86,lower(a),lower(b),.105);
      }
    }
  }
  for(const [cx,cz,dx,dz] of [[-87.7,35,-1,-1],[-75.5,58.5,1,1]]){
    for(let i=0;i<13;i++){
      const u=i/12,angle=(u-.5)*1.9,peak=101.55+7.6*Math.pow(Math.abs(2*u-1),1.20);
      const base=[cx+dx*(u-.5)*1.1,87.55,cz+dz*(u-.5)*4.3];
      const tip=[cx+dx*(1.25+Math.cos(angle)*1.15),peak,cz+dz*(u-.5)*7.5];
      blade(metal,i%2?0xc99a59:0xe9c684,base,tip,.99,[dx,0,.25*dz]);
      glow.beam(0xffdb96,[tip[0]-.21*dx,peak-3.0,tip[2]-.12*dz],tip,.19);
    }
  }
  // The terrace is cantilevered on the NNE corner; its wet belly is entirely outside the bedroom.
  const y=levelY[23],deck=poolTerrace;
  box(stone,travertine,pool.x,y-1.51,pool.z,pool.w+.48,.23,pool.d+.48);
  for(const s of [-1,1]){
    box(stone,jade,pool.x+s*(pool.w/2+.10),y-.73,pool.z,.20,1.57,pool.d+.4);
    box(stone,jade,pool.x,y-.73,pool.z+s*(pool.d/2+.10),pool.w+.04,1.57,.20);
    box(metal,champagne,pool.x+s*(pool.w/2+.10),y+.028,pool.z,.18,.055,pool.d+.42);
    box(metal,champagne,pool.x,y+.028,pool.z+s*(pool.d/2+.10),pool.w+.35,.055,.18);
  }
  for(const z of [31.2,37,44.35])metal.beam(0xb38961,[-74,91.8,z],[-65.05,96.15,z],.34,.44);
  for(const z of [deck.z-deck.d/2,deck.z+deck.d/2]){
    box(stone,limestone,deck.x,y-.20,z,deck.w+.20,.47,.34);
    box(glow,0xffd49b,deck.x,y-.29,z,deck.w+.22,.07,.38);
  }
  for(const z of [31.3,44.15])planter(-65.62,y,z,.63);
  return planter;
}
