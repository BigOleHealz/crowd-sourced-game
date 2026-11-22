import * as THREE from 'three';
import {skatePark as p,parkBanks,parkRails,skateParkFloor,bankRise} from './skate-park.js';

export function addSkatePark(scene,Batch){
  const group=new THREE.Group();group.name=p.name;scene.add(group);
  const mesh=new THREE.PlaneGeometry(p.east-p.west,p.south-p.north,60,160).rotateX(-Math.PI/2);
  mesh.translate((p.east+p.west)/2,0,(p.north+p.south)/2);
  const points=mesh.attributes.position,colors=[],color=new THREE.Color();
  for(let i=0;i<points.count;i++){
    const x=points.getX(i),z=points.getZ(i),y=skateParkFloor(x,z)??p.y-.20;
    const bank=parkBanks.find(b=>bankRise(b,x,z)>.015);
    const border=Math.min(x-p.west,p.east-x,z-p.north,p.south-z);
    const trim=bank && Math.abs(x-bank.x)>bank.w/2-.35;
    color.setHex(trim?0xce7854:bank?0xabb9af:border<.40?0x357f80:0xa5adb1);
    const grain=1+.017*Math.sin(x*71+z*229);color.multiplyScalar(grain);
    colors.push(color.r,color.g,color.b);points.setY(i,y+.014);
  }
  mesh.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));mesh.computeVertexNormals();
  const flat=new THREE.MeshLambertMaterial({vertexColors:true});
  const pad=new THREE.Mesh(mesh,flat);pad.receiveShadow=true;group.add(pad);
  const detail=new Batch(),box=new THREE.BoxGeometry();
  for(const rail of parkRails){
    detail.beam(0x40545a,[rail.x,rail.y-.035,rail.north],[rail.x,rail.y-.035,rail.south],.071);
    for(const f of [.07,.50,.93]){
      const z=rail.north+(rail.south-rail.north)*f,floor=skateParkFloor(rail.x,z);
      detail.beam(0x448083,[rail.x,floor,z],[rail.x,rail.y-.055,z],.073);
      detail.add(box,0x40565b,rail.x,floor+.028,z,.22,.042,.17);
    }
  }
  // Painted joints divide the flat runways and stop at the bank faces.
  for(const z of [-178.8,-166.88,-155.48])detail.beam(0xe3d0aa,[p.west+.78,p.y+.024,z],[p.east-.78,p.y+.024,z],.037);
  const signX=p.west+.20,signZ=p.south-3.1,signY=1.83;
  for(const side of [-1,1])detail.add(box,0x336360,signX,signY-.28,signZ+side*.75,.09,.98,.09);
  detail.add(box,0x22575b,signX,signY,signZ,.10,.71,1.85);
  detail.mesh(group,flat);box.dispose();
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#22575b';ctx.fillRect(0,0,512,160);
  ctx.fillStyle='#edd8a5';ctx.font='600 42px sans-serif';ctx.textAlign='center';ctx.fillText('SOUTH BEACH',256,57);
  ctx.fillStyle='#fff4df';ctx.font='bold 64px sans-serif';ctx.fillText('SKATE PARK',256,125);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  for(const sign of [-1,1]){
    const face=new THREE.Mesh(new THREE.PlaneGeometry(1.8,.62),new THREE.MeshBasicMaterial({map:tex}));
    face.position.set(signX+sign*.054,signY,signZ);face.rotation.y=sign*Math.PI/2;group.add(face);
  }
}
