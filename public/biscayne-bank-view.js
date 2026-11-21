import * as THREE from 'three';

// This branch of Biscayne Mutual occupies the existing north gallery, including
// its open doors, glazing, waiting chairs and wheelchair-width center aisle.
export function bankFrontage(scene,Batch){
  const group=new THREE.Group();group.name='Biscayne Mutual Bank';scene.add(group);
  const batch=new Batch(),cube=new THREE.BoxGeometry(),disc=new THREE.CylinderGeometry(1,1,1,24);
  const rect=(c,x,y,z,w,h,d)=>batch.add(cube,c,x,y,z,w,h,d);
  const green=0x284e4b,bronze=0xb59260,cream=0xedddba;
  rect(green,-20,3.49,-39.13,5.07,.65,.24);
  rect(bronze,-20,3.15,-39.14,5.14,.045,.25);
  // Place the service counter against the back wall; leave the central lobby clear.
  rect(green,-21.48,1.39,-34.28,1.23,.83,.49);
  rect(cream,-21.48,1.83,-34.30,1.28,.068,.54);
  rect(0x343f42,-21.58,2.00,-34.28,.32,.25,.045);
  for(let i=0;i<8;i++)rect(bronze,-21.98+i*.14,1.42,-34.54,.023,.63,.02);
  for(const dx of [-1,1])for(const dz of [-1,1]){
    rect(bronze,-20+dx*.49,.837,-35.7+dz*.49,.23,.012,.035);
    rect(bronze,-20+dx*.59,.838,-35.7+dz*.39,.032,.014,.23);
  }
  batch.add(disc,green,-20,.837,-35.7,.31,.014,.31);
  const map=document.createElement('canvas');map.width=768;map.height=96;
  const ctx=map.getContext('2d');ctx.fillStyle='#254747';ctx.fillRect(0,0,768,96);
  ctx.fillStyle='#eedcb2';ctx.font='42px Georgia';ctx.textAlign='center';ctx.fillText('BISCAYNE MUTUAL',384,49);
  ctx.font='17px sans-serif';ctx.fillText('B A N K   •   B R I C K E L L   B R A N C H',384,77);
  const texture=new THREE.CanvasTexture(map);texture.colorSpace=THREE.SRGBColorSpace;
  const plaque=new THREE.Mesh(new THREE.PlaneGeometry(4.76,.595),new THREE.MeshBasicMaterial({map:texture}));
  plaque.position.set(-20,3.49,-39.26);plaque.rotation.y=Math.PI;group.add(plaque);
  batch.mesh(group,new THREE.MeshLambertMaterial({vertexColors:true}),false);
  cube.dispose();disc.dispose();
  return doors=>{group.visible=!doors?.collapsedTowers?.includes(3);};
}
