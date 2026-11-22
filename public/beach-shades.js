import * as THREE from 'three';
import {sandHeight,shadeSpots} from './beach-layout.js';

// One cloth panel, crowned along the ribs and scalloped at its hem.
function canopyPanel() {
  const vertices=[], indices=[];
  const rings=[[.02,2.54],[.63,2.40],[1.25,2.07],[1.25,2.02]];
  for(const [row,[radius,height]] of rings.entries()){
    for(let i=0;i<=4;i++){
      const angle=i*Math.PI/16, sag=Math.sin(i*Math.PI/4);
      vertices.push(radius*Math.cos(angle),height-sag*(row===3?.095:row===2?.035:.007),radius*Math.sin(angle));
      if(row && i){
        const at=row*5+i;
        indices.push(at-6,at-5,at,at-6,at,at-1);
      }
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function addBeachShades(Batch,makeRig) {
  const box=new THREE.BoxGeometry(), panel=canopyPanel();
  const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  for(const [i,{x,z,color}] of shadeSpots.entries()){
    const y=sandHeight(x,z), shade=new Batch();
    const parts=makeRig('parasol-'+i,x,y,z,false);
    shade.add(box,0xa98b67,x,y+1.24,z,.067,2.5,.067);
    for(let rib=0;rib<8;rib++){
      const yaw=rib*Math.PI/4;
      shade.add(panel,rib%2?0xffedce:color,x,y,z,1,1,1,0,yaw);
      shade.beam(0xd6bb91,[x,y+2.49,z],[x+Math.cos(yaw)*1.23,y+2.049,z+Math.sin(yaw)*1.23],.018);
    }
    shade.mesh(parts,material).userData.impactSurface='wood';
    for(const side of [-1,1]){
      const cx=x+.85,cz=z+side*.86,cy=sandHeight(cx,cz), seat=new Batch();
      const chair=makeRig('lounger-'+i+'-'+side,cx,cy,cz,false);
      for(const edge of [-1,1]){
        const railZ=cz+edge*.29;
        seat.add(box,0xb68e60,cx,cy+.29,railZ,1.80,.075,.045);
        seat.beam(0xb68e60,[cx-.27,cy+.32,railZ],[cx-.86,cy+.73,railZ],.046);
        for(const leg of [-.65,.66])seat.add(box,0xaa8055,cx+leg,cy+.15,railZ,.062,.30,.046);
      }
      seat.add(box,0xf9eace,cx+.32,cy+.34,cz,1.18,.045,.55);
      seat.add(box,0xf9eace,cx-.565,cy+.54,cz,.72,.045,.55,0,0,-.61);
      for(const stripe of [-1,1]){
        const at=cz+stripe*.19;
        seat.add(box,color,cx+.32,cy+.364,at,1.18,.004,.048);
        seat.add(box,color,cx-.553,cy+.562,at,.72,.004,.048,0,0,-.61);
      }
      seat.mesh(chair,material).userData.impactSurface='wood';
    }
  }
  box.dispose();
  panel.dispose();
}
