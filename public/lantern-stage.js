import * as THREE from 'three';

// A west-facing band plays toward the atrium through the open edge of floor 2.
export function buildShowroomStage(parent,Batch){
  const body=new Batch(),trim=new Batch(),lit=new Batch(),velvet=new Batch();
  const cube=new THREE.BoxGeometry(),drum=new THREE.CylinderGeometry(.5,.5,1,24);
  const bulb=new THREE.SphereGeometry(.5,8,5);
  const x=-65,z=51.05,y=4.40;
  const put=(batch,color,u,h,v,w,k,d,rx=0,ry=0,rz=0)=>batch.add(cube,color,x+u,y+h,z+v,w,k,d,rx,ry,rz);
  const gold=0xc49b55;
  put(body,0x4d2536,0,.065,0,5.78,.13,5.25);
  put(trim,gold,2.90,.085,0,.034,.11,5.27);
  const back=-2.78;
  // Pleated velvet curtains with a scalloped gold-edged valance.
  for(let i=0;i<52;i++){
    const v=-2.57+i*.101,fold=Math.cos(i*.85);
    put(velvet,fold>.35?0x963f54:fold<-.3?0x58253c:0x782b49,back+.085*fold,1.78,v,.10,3.28,.12,.0,.15*fold);
    const swag=.21+.26*Math.abs(Math.sin(i/51*Math.PI*3));
    put(velvet,0x873b4d,back+.21,3.37-swag/2,v,.23,swag,.12);
    put(trim,gold,back+.33,3.37-swag,v,.038,.045,.105);
  }
  for(const side of [-1,1]){
    const v=side*2.51;
    put(trim,gold,.13,3.40,v,5.58,.095,.10);
    put(velvet,0x64283c,-1.94,1.83,v,1.82,3.17,.094);
    for(let i=0;i<5;i++){
      const u=-2.08+i*.95;
      put(body,0x272631,u,3.18,v,.25,.36,.27,-side*.38);
      lit.add(bulb,[0xffca85,0xf38fbc,0x93d1ed][i%3],x+u,y+3.04,z+v-side*.07,.22,.09,.19);
    }
  }
  // Curved concert grand with a raised lid, keyboard and brass pedals.
  const shape=new THREE.Shape();
  shape.moveTo(0,0);shape.lineTo(1.10,0);shape.lineTo(1.10,.56);
  shape.bezierCurveTo(1.1,1.20,.48,.83,.42,1.56);
  shape.bezierCurveTo(.35,1.95,0,1.85,0,1.48);shape.closePath();
  const shell=new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.032,bevelThickness:.02}).rotateX(-Math.PI/2);
  body.add(shell,0x202024,x-.90,y+.97,z+.78);
  const lid=shell.clone().scale(1,.19,1).rotateZ(.29);
  body.add(lid,0x251d24,x-.9,y+1.20,z+.78);
  trim.beam(gold,[x+.06,y+1.14,z+.18],[x+.06,y+1.49,z+.18],.024);
  for(const [u,v] of [[-.82,.65],[.11,.65],[-.66,-.71]])body.add(drum,0x26252b,x+u,y+.58,z+v,.084,.90,.084);
  for(let i=0;i<30;i++){
    put(body,0xf3ecd7,-.88+i*.035,1.001,.89,.031,.048,.22);
    if(![2,6].includes(i%7))put(body,0x222023,-.863+i*.035,1.034,.847,.019,.029,.133);
  }
  put(velvet,0x5d3445,-.39,.59,1.42,.83,.13,.36);
  for(const u of [-.69,-.12])body.add(drum,0x342528,x+u,y+.35,z+1.42,.08,.52,.08);
  body.add(drum,0x28272b,x+1.33,y+.18,z-.42,.40,.08,.40);
  trim.beam(gold,[x+1.33,y+.2,z-.42],[x+1.33,y+1.69,z-.42],.028);
  body.add(bulb,0xc4bdba,x+1.31,y+1.70,z-.42,.11,.08,.075,0,0,.2);
  for(let i=0;i<14;i++)lit.add(bulb,0xffe3ac,x+2.86,y+.16,z-2.46+i*.378,.073,.075,.073);
  const g=new THREE.Group();g.name='Lantern Room concert stage';parent.add(g);
  body.mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.36}),false);
  velvet.mesh(g,new THREE.MeshLambertMaterial({vertexColors:true}),false);
  trim.mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.35,metalness:.42}),false);
  lit.mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}),false);
  for(const geo of [drum,cube,bulb,shell,lid])geo.dispose();
  return g;
}
