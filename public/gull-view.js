import * as THREE from 'three';

const white=0xf3f0e4,mantle=0xa8b4bf,slate=0x81909e,dark=0x30353b;
const tau=2*Math.PI;
const mix=THREE.MathUtils.lerp;
const shortest=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;

// Coordinates are metres. The gull faces -Z and has a 1.56 m wingspan.
// Joint values encode left/right and inner/outer wing for the flight shader.
function buildGeometry(){
  const positions=[],colors=[],joints=[],indices=[],paint=new THREE.Color();
  function vertex(x,y,z,color,joint=0){
    positions.push(x,y,z);paint.setHex(color);colors.push(paint.r,paint.g,paint.b);joints.push(joint);
    return joints.length-1;
  }
  function up(a,b,c){
    const abx=positions[3*b]-positions[3*a],abz=positions[3*b+2]-positions[3*a+2];
    const acx=positions[3*c]-positions[3*a],acz=positions[3*c+2]-positions[3*a+2];
    if(abz*acx-abx*acz>0)indices.push(a,b,c);else indices.push(a,c,b);
  }
  function loft(rows,tone,segments=16,xOffset=0){
    for(const [j,[z,rx,ry,cy]] of rows.entries()){
      for(let i=0;i<=segments;i++){
        const angle=i*tau/segments,y=Math.sin(angle);
        vertex(xOffset+rx*Math.cos(angle),cy+ry*y,z,tone(z,y));
        if(j && i){
          const v=joints.length-1,prior=v-segments-1;
          indices.push(prior-1,prior,v-1,prior,v,v-1);
        }
      }
    }
  }
  // A slightly cupped, tapered vane. The outer edge narrows near the tip,
  // leaving shallow notches between neighbouring flight feathers.
  function vane(from,to,width,joint,base,tip=base,mirror=false){
    const dx=to[0]-from[0],dz=to[2]-from[2],len=Math.hypot(dx,dz)||1;
    const prev=[];
    for(const [u,w] of [[0,.24],[.31,.94],[.62,1],[.79,.78],[.89,.57],[.968,.28],[1,.013]]){
      const shade=mirror && u>.76 && u<.96 ? white : u>.58 ? tip : base;
      const x=mix(from[0],to[0],u),y=mix(from[1],to[1],u),z=mix(from[2],to[2],u);
      const r=width*w,k=.005*Math.sin(u*Math.PI);
      const ring=[vertex(x-dz/len*r,y-k,z+dx/len*r,shade,joint),vertex(x,y+k,z,shade,joint),
        vertex(x+dz/len*r*.76,y-k,z-dx/len*r*.76,shade,joint)];
      if(prev.length)for(let c=0;c<2;c++){up(prev[c],ring[c],ring[c+1]);up(prev[c],ring[c+1],prev[c+1]);}
      prev.splice(0,3,...ring);
    }
  }
  function finish(){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    g.setAttribute('joint',new THREE.Float32BufferAttribute(joints,1));
    g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g;
  }
  return {vertex,up,loft,vane,finish};
}
function birdGeometry(){
  const {vertex,up,loft,vane,finish}=buildGeometry();
  loft([[-.275,.007,.009,.039],[-.255,.031,.031,.054],[-.218,.044,.045,.063],[-.184,.048,.048,.061],
    [-.14,.044,.047,.04],[-.105,.050,.055,.019],[-.06,.065,.067,.008],[.005,.076,.068,.006],
    [.07,.07,.061,.011],[.134,.052,.045,.014],[.194,.025,.028,.017],[.229,.007,.01,.022]],
    (z,y)=>z>-.115 && y>.31 ? mantle : y<-.7?0xe2e1d7:white);
  // Curved upper bill, lower mandible, red subterminal spot and dark pupils.
  loft([[-.354,.001,.003,.025],[-.343,.009,.007,.034],[-.333,.013,.012,.037],
    [-.303,.016,.013,.038],[-.264,.021,.018,.043],[-.245,.017,.013,.042]],(_,y)=>y>.05?0xe8b448:0xc29139,12);
  for(const side of [-1,1]){
    const bead=(z,y,x,rz,rx,ry,c)=>loft([[-1,0],[-.65,.77],[0,1],[.65,.77],[1,0]].map(([v,w])=>
      [z+v*rz,rx*w,ry*w,y]),()=>c,10,side*x);
    bead(-.32,.031,.0125,.008,.003,.004,0xbe573a);
    bead(-.224,.074,.043,.007,.004,.007,0xd5ab65);
    bead(-.225,.074,.046,.0045,.0025,.005,0x252521);
    bead(-.227,.076,.0475,.0015,.001,.0013,white);
    // Feet folded back under the belly, webbed toes swept toward the tail.
    vane([side*.033,-.037,.08],[side*.038,-.044,.155],.005,0,0xc59d86);
    vane([side*.038,-.044,.14],[side*.05,-.042,.185],.01,0,0xd4ad92);
  }
  for(let i=-4;i<=4;i++)vane([i*.003,.012,.135],[i*.018,.0005*(4-Math.abs(i)),.34-.013*Math.abs(i)],
    .015,0,i%2?0xe8e7dd:white);

  for(const side of [-1,1]){
    const inner=side,outer=side*2;
    function cover(rows,joint){
      let previous;
      for(const [x,y,front,back] of rows){
        const ring=[vertex(side*x,y,front,mantle,joint),
          vertex(side*x,y+.006,mix(front,back,.38),0xb7c1c9,joint),
          vertex(side*x,y-.009,back,0xe0e1d9,joint)];
        if(previous)for(let k=0;k<2;k++){up(previous[k],ring[k],ring[k+1]);up(previous[k],ring[k+1],previous[k+1]);}
        previous=ring;
      }
    }
    cover([[.03,.037,-.058,.124],[.12,.044,-.089,.118],[.24,.058,-.102,.079],
      [.348,.071,-.093,.039],[.371,.071,-.078,.030]],inner);
    cover([[.335,.070,-.077,.039],[.4,.066,-.08,.071],[.48,.056,-.043,.090],
      [.55,.043,.012,.102],[.62,.030,.054,.115]],outer);
    // Rounded secondaries sweep back from the shoulder to the wrist.
    for(let i=0;i<11;i++){
      const u=i/10;
      vane([side*(.042+.313*u),.035+.037*u,-.045-.034*u],
        [side*(.092+.289*u),.022+.020*u,.142-.113*u],.021,inner,i%2?mantle:0xb2bdc5,0xdde0da);
    }
    // Long overlapping primaries give the wrist a clean, swept leading edge.
    // Only the longest primaries carry the characteristic white mirrors.
    for(let i=9;i>=0;i--){
      const u=i/9;
      vane([side*(.326+.064*u),.072,-.052-.035*u],
        [side*(.418+.367*u),.042-.093*u,.114+.077*u],.035-.013*u,
        outer,u>.55?slate:mantle,u>.34?dark:0x7f8c98,i>=7);
    }
    // Covert feathers overlay the flights and soften the shoulder silhouette.
    const sections=[[.036,.044,-.048,.09],[.102,.053,-.078,.071],
      [.235,.065,-.1,.056],[.351,.074,-.098,.046]];
    for(let i=0;i<sections.length-1;i++){
      const [x,y,z,b]=sections[i],[nx,ny,nz,nb]=sections[i+1];
      vane([side*x,y,z+b*.55],[side*(nx+.016),ny,nz+nb*.55],(b+nb)*.4,inner,0xb7c2ca,mantle);
    }
  }
  return finish();
}
function flightMaterial(){
  const material=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.86});
  material.onBeforeCompile=s=>{
    s.vertexShader=s.vertexShader.replace('#include <common>',`#include <common>
      attribute float joint;
      attribute vec2 wingAngles;
      void hinge(inout vec3 p,float angle){
        float c=cos(angle), s=sin(angle);
        p.xy=mat2(c,s,-s,c)*p.xy;
      }
      vec3 articulate(vec3 p,bool point){
        float side=sign(joint);
        if(abs(joint)>1.5){
          vec3 wrist=vec3(.35*side,.072,-.075);
          if(point)p-=wrist;
          hinge(p,side*wingAngles.y);
          if(point)p+=wrist;
        }
        if(abs(joint)>.5){
          vec3 shoulder=vec3(.046*side,.036,-.03);
          if(point)p-=shoulder;
          hinge(p,side*wingAngles.x);
          if(point)p+=shoulder;
        }
        return p;
      }`)
      .replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal=articulate(objectNormal,false);')
      .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=articulate(transformed,true);');
  };
  return material;
}

function featherGeometry(){
  const {vertex,up,finish}=buildGeometry();
  let prior;
  for(let j=0;j<=9;j++){
    const u=j/9,w=Math.pow(Math.sin(u*Math.PI),.74)*(.86+.16*u);
    const x=.11*u*u,z=u-.5,ridge=.055*w;
    const edge=j===6?.71:1;
    const ring=[vertex(x-.14*w,-ridge,z,0xc6c8c5),vertex(x-.007,ridge,z,0xf5f1de),
      vertex(x+.007,ridge,z,0xfaf7eb),vertex(x+.1*w*edge,-ridge,z,0xe3e2d7)];
    if(prior)for(let c=0;c<3;c++){up(prior[c],ring[c],ring[c+1]);up(prior[c],ring[c+1],prior[c+1]);}
    prior=ring;
  }
  return finish();
}
function scatter(seed,blast){
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  return Array.from({length:blast?75:49},(_,i)=>{
    const angle=tau*rand(),speed=(.7+3.8*rand())*(blast?1.52:1);
    return {vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed,vy:1+4.8*rand(),
      length:i%3===0?.15+.085*rand():.051+.07*rand(),width:.7+rand(),
      phase:tau*rand(),frequency:2.6+rand()*3.4,fall:.56+rand()*.74,pale:rand()};
  });
}
const maxBirds=24,maxBursts=12,lifetime=8;
function batch(scene,geometry,material,count,name){
  const mesh=new THREE.InstancedMesh(geometry,material,count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;mesh.frustumCulled=false;
  mesh.name=name;scene.add(mesh);return mesh;
}

export function gullView(scene,groundHeight,waterY){
  const pose=new THREE.Object3D(),color=new THREE.Color(),tracks=[];
  let birds,angles,feathers,bursts=[],last;
  function birdsReady(){
    const g=birdGeometry();
    angles=new THREE.InstancedBufferAttribute(new Float32Array(maxBirds*2),2).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('wingAngles',angles);
    birds=batch(scene,g,flightMaterial(),maxBirds,'Coastal gull flock');
  }
  return (states,local,tick,dt)=>{
    if(states!==last){
      if(!states?.length){bursts=[];tracks.length=0;}
      last=states;
      for(const [i,s] of (states??[]).entries()){
        const old=tracks[i];
        if(!s.hp && s.ageSinceHit!=null && s.ageSinceHit<lifetime && old?.seq!==s.hitSeq){
          const blast=s.deathKind==='blast';
          if(bursts.length>=maxBursts)bursts.shift();
          bursts.push({x:s.x,y:s.y,z:s.z,age:s.ageSinceHit,size:s.size,
            floor:Math.max(waterY,groundHeight(s.x,s.z)),pieces:scatter((i+1)*1009+s.hitSeq*71,blast)});
        }
        if(!old || !old.alive || Math.hypot(old.x-s.x,old.y-s.y,old.z-s.z)>10){
          tracks[i]={x:s.x,y:s.y,z:s.z,yaw:s.yaw,pitch:s.pitch,roll:s.roll,wing:s.wing};
        }
        tracks[i].alive=!!s.hp;tracks[i].seq=s.hitSeq;
      }
    }
    const blend=-Math.expm1(-17*dt);
    let n=0,f=0;
    for(const [i,s] of (states??[]).entries()){
      const p=tracks[i];
      if(!s.hp || Math.hypot(local.x-s.x,local.y-s.y,local.z-s.z)>100 || n===maxBirds)continue;
      if(!birds)birdsReady();
      p.x=mix(p.x,s.x,blend);p.y=mix(p.y,s.y,blend);p.z=mix(p.z,s.z,blend);
      p.yaw=shortest(p.yaw,s.yaw,blend);p.pitch=mix(p.pitch,s.pitch,blend);
      p.roll=mix(p.roll,s.roll,blend);p.wing=shortest(p.wing,s.wing,blend);
      const flap=s.gliding?.04:.64;
      angles.setXY(n,.11+flap*Math.sin(p.wing),-.23+flap*.68*Math.sin(p.wing-.9));
      pose.position.set(p.x,p.y,p.z);pose.rotation.set(p.pitch,-p.yaw,p.roll,'YXZ');
      pose.scale.setScalar(s.size);pose.updateMatrix();birds.setMatrixAt(n++,pose.matrix);
    }
    let kept=0;
    for(const b of bursts){
      const t=b.age;b.age+=dt;
      if(t>=lifetime)continue;
      bursts[kept++]=b;
      if(Math.hypot(local.x-b.x,local.y-b.y,local.z-b.z)>65)continue;
      feathers??=batch(scene,featherGeometry(),new THREE.MeshStandardMaterial({roughness:.86,side:THREE.DoubleSide,vertexColors:true}),
        maxBursts*75,'Airborne gull feathers');
      const impulse=(1-Math.exp(-2.2*t))/2.2,settle=1-Math.exp(-1.5*t);
      for(const p of b.pieces){
        const flutter=p.frequency*t+p.phase;
        const y=b.y+p.vy*impulse-p.fall*(t-impulse);
        const airborne=y>b.floor+.024;
        pose.position.set(b.x+b.size*p.vx*impulse+.26*t+settle*.17*Math.sin(flutter),
          Math.max(b.floor+.018,y),b.z+b.size*p.vz*impulse+.07*t+settle*.13*Math.cos(flutter*.85));
        pose.rotation.set(airborne?.41+.93*Math.sin(flutter):.03,p.phase+.6*t,airborne?flutter*.94:.03);
        const length=b.size*p.length*(1-THREE.MathUtils.smoothstep(t,5.8,lifetime));
        pose.scale.set(length*p.width,length,length);pose.updateMatrix();feathers.setMatrixAt(f,pose.matrix);
        color.setHex(p.pale<.14?dark:p.pale<.44?mantle:white);feathers.setColorAt(f++,color);
      }
    }
    bursts.length=kept;
    if(birds){birds.count=n;birds.visible=n>0;if(n){birds.instanceMatrix.needsUpdate=true;angles.needsUpdate=true;}}
    if(feathers){feathers.count=f;feathers.visible=f>0;if(f){feathers.instanceMatrix.needsUpdate=true;feathers.instanceColor.needsUpdate=true;}}
  };
}
