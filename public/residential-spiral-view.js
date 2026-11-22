import * as THREE from 'three';
import {residenceSpirals} from './residential-spirals.js';
const tau=Math.PI*2;
function wedge(inner,outer,start,end,height){
  const path=new THREE.Shape();
  path.moveTo(Math.cos(start)*outer,-Math.sin(start)*outer);
  path.absarc(0,0,outer,-start,-end,true);
  path.lineTo(Math.cos(end)*inner,-Math.sin(end)*inner);
  path.absarc(0,0,inner,-end,-start,false);path.closePath();
  const g=new THREE.ExtrudeGeometry(path,{depth:height,bevelEnabled:false,curveSegments:32});
  g.rotateX(-Math.PI/2);return g;
}
export function addResidentialSpirals(scene,Batch){
  const geometry=new THREE.CylinderGeometry(.5,.5,1,22),material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.54,metalness:.14});
  for(const s of residenceSpirals){
    const batch=new Batch(),grand=s.home==='mare',dark=0x6d5141,metal=grand?0xb49661:0x9a8061;
    const r=s.r,lo=s.ys[0],hi=s.ys.at(-1);
    const point=(a,h,radius)=>[s.x+Math.cos(a)*radius,h,s.z+Math.sin(a)*radius];
    batch.add(geometry,dark,s.x,(lo+hi+.96)/2,s.z,s.inner*1.18,hi-lo+.96,s.inner*1.18);
    // Brass collar rings and fluted wood turn the newel into a finished column.
    const stem=s.inner*1.18;
    const collar=(y,dia,h)=>batch.add(geometry,metal,s.x,y,s.z,dia,h,dia);
    for(const y of s.ys){
      collar(y+.052,stem+.14,.104);collar(y+.137,stem+.073,.052);collar(y+.21,stem+.021,.045);
      collar(y+.88,stem+.05,.054);
    }
    for(let j=0;j<(grand?12:8);j++){
      const a=j*tau/(grand?12:8),rad=stem*.49;
      batch.add(geometry,grand?0xaa8256:0x8b684b,s.x+Math.cos(a)*rad,(lo+hi+.88)/2,s.z+Math.sin(a)*rad,
        grand?.037:.019,hi-lo+.83,grand?.037:.019);
    }
    for(let i=0;i<s.steps.length;i++){
      const count=s.steps[i],angle=(s.end-s.start)/count,rise=(s.ys[i+1]-s.ys[i])/count;
      const tread=wedge(s.inner*.53,r,0,angle+.002,.115);
      const edge=wedge(r-.055,r+.017,0,angle+.001,.045);
      for(let j=0;j<count;j++){
        const a=s.start+angle*j,y=s.ys[i]+(j+.55)*rise;
        batch.add(tread,grand?(j%3?0xe0ceae:0xe9d7bb):(j%2?0xa88160:0xb18a68),s.x,y-.115,s.z,1,1,1,0,-a);
        batch.add(edge,metal,s.x,y-.042,s.z,1,1,1,0,-a);
        const below=s.ys[i]+rise*j,above=below+rise;
        if(grand){
          const edgeA=point(a+.005,y+.012,s.inner+.02),edgeB=point(a+.005,y+.012,r-.07);
          batch.beam(0xc6a86c,edgeA,edgeB,.025,.016);
        }
        for(const radius of [r-.025,s.inner+.05]){
          batch.beam(metal,point(a,below+.95,radius),point(a+angle,above+.95,radius),grand?.074:.054);
          batch.beam(grand?0xa28861:dark,point(a,below-.12,radius),point(a+angle,above-.12,radius),.095);
          if(j%2===0){
            batch.beam(metal,point(a+.015,y,radius),point(a+.015,below+.95,radius),grand?.039:.029);
            if(grand)batch.add(geometry,0xdac394,...point(a+.015,below+.37,radius),.067,.09,.067);
          }
        }
      }
      tread.dispose();edge.dispose();
    }
    // A true gate landing at each level. The fan joins the enclosing floor at
    // its west edge, while the rest of the circle stays open to the storey below.
    for(const y of s.ys.slice(1)){
      const landing=wedge(.025,s.r+.01,s.end,s.start+tau,.14);
      batch.add(landing,grand?0xdbcaab:0xad8866,s.x,y-.14,s.z);landing.dispose();
      const tongue=new THREE.BoxGeometry();batch.add(tongue,grand?0xdbcaab:0xad8866,s.x-s.r*.91,y-.077,s.z,s.r*.36,.154,s.r*.72);tongue.dispose();
      // Fill the corners between circular flight and square structural opening.
      const corner=new THREE.Shape();corner.moveTo(s.hole,0);corner.lineTo(s.hole,s.hole);corner.lineTo(0,s.hole);
      corner.lineTo(0,s.r);corner.absarc(0,0,s.r,Math.PI/2,0,true);corner.closePath();
      const g=new THREE.ExtrudeGeometry(corner,{depth:.14,bevelEnabled:false,curveSegments:12});g.rotateX(-Math.PI/2);
      for(let k=0;k<4;k++)batch.add(g,grand?0xdbcaab:0xad8866,s.x,y-.14,s.z,1,1,1,0,k*Math.PI/2);
      g.dispose();
    }
    const mesh=batch.mesh(scene,material,false);mesh.name=s.home+' · helical staircase';
  }
  geometry.dispose();
}
