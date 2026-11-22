// Bake curved trim into the same static geometry batch as its host building.
import * as THREE from 'three';

export function roundedBrow(batch, color, x, y, z, width, depth, height, yaw=0) {
  const r=Math.min(depth*.47,width*.20), a=width/2,b=depth/2;
  const outline=new THREE.Shape();
  outline.moveTo(-a+r,-b); outline.lineTo(a-r,-b);
  outline.quadraticCurveTo(a,-b,a,-b+r); outline.lineTo(a,b-r);
  outline.quadraticCurveTo(a,b,a-r,b); outline.lineTo(-a+r,b);
  outline.quadraticCurveTo(-a,b,-a,b-r); outline.lineTo(-a,-b+r);
  outline.quadraticCurveTo(-a,-b,-a+r,-b);
  const plate=new THREE.ExtrudeGeometry(outline,{depth:height,curveSegments:4,bevelEnabled:false});
  plate.rotateX(-Math.PI/2);
  batch.add(plate,color,x,y-height/2,z,1,1,1,0,yaw);
  plate.dispose();
}

// A stepped parapet follows the avenue-facing gable. Its lower edge traces the
// real roof, leaving the operable glazing and the vent in the gable exposed.
export function decoResidence(batch,box,house,top) {
  const {x,z,w,d,rise,trim,shutters,finish}=house;
  const side=Math.sign(-x), yaw=side*Math.PI/2, front=x+side*w/2;
  const run=d/2, steps=finish==='stucco'?4:3;
  const outline=new THREE.Shape();
  outline.moveTo(-run,-.05);
  for(let i=0;i<2*steps;i++){
    const left=-run+i*run/steps, right=left+run/steps;
    const level=rise*(1-Math.min(Math.abs(left),Math.abs(right))/run)+.23;
    outline.lineTo(left,level); outline.lineTo(right,level);
  }
  outline.lineTo(run,-.05); outline.lineTo(0,rise-.05); outline.closePath();
  const crown=new THREE.ExtrudeGeometry(outline,{depth:.20,bevelEnabled:false});
  batch.add(crown,trim,front,top,z,1,1,1,0,yaw);
  crown.dispose();

  // Three narrow, inset-looking flutes continue the central step into the sky.
  for(let i=-1;i<=1;i++) {
    const height=i===0?.69:.45;
    batch.add(box,shutters,front+side*.23,top+rise+.05+height/2,z+i*.21,.09,height,.11);
  }
  const yawAlongZ=Math.PI/2;
  for(const end of [-1,1]){
    const center=z+end*d*.29;
    roundedBrow(batch,trim,front+side*.23,top-.10,center,3.20,.75,.13,yawAlongZ);
    roundedBrow(batch,shutters,front+side*.24,top-.205,center,3.04,.66,.05,yawAlongZ);
  }
}

// A sunrise formed from cast radial ribs reads from both sides of the market arcade.
export function marketSunburst(batch,box,disk,x,y,z,side,accent,brass) {
  batch.add(disk,accent,x,y,z,.51,.10,.51,Math.PI/2);
  batch.add(disk,brass,x,y,z+side*.065,.26,.04,.26,Math.PI/2);
  for(let i=-3;i<=3;i++){
    const a=i*Math.PI/9;
    batch.add(box,brass,x+Math.sin(a)*.355,y+Math.cos(a)*.355,z+side*.069,
      .031,.17,.032,0,0,-a);
  }
}
