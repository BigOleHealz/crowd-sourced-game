import {beachSigns} from './scenery-layout.js';
import {addLookouts} from './lifeguard-lookouts.js';
import * as THREE from 'three';
import { beach, courts, sandHeight } from './beach-layout.js';
export function addBeach(scene,Batch) {
  const geometry=new THREE.PlaneGeometry(beach.east-beach.west,beach.south-beach.north,24,64);
  geometry.rotateX(-Math.PI/2);geometry.translate((beach.east+beach.west)/2,0,(beach.south+beach.north)/2);
  const p=geometry.attributes.position, colors=[],c=new THREE.Color();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),y=sandHeight(x,z);p.setY(i,y);
    const damp=THREE.MathUtils.smoothstep(y,-.36,.55);
    c.setRGB(.53+.47*damp,.49+.51*damp,.45+.55*damp);colors.push(c.r,c.g,c.b);
  }
  const tex=new THREE.TextureLoader().load('./harbor-sand.webp');tex.colorSpace=THREE.SRGBColorSpace;
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(10,34);
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const sand=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({map:tex,vertexColors:true}));sand.receiveShadow=true;sand.userData.impactSurface='solid';scene.add(sand);
  const box=new THREE.BoxGeometry(), timber=new Batch(), cord=new Batch();
  for(const [x,z,yaw,label] of beachSigns){
    const panel=document.createElement('canvas');panel.width=768;panel.height=152;
    const ink=panel.getContext('2d');
    ink.fillStyle='#efe8ce';ink.fillRect(0,0,768,152);ink.fillStyle='#215d62';ink.fillRect(6,6,756,140);
    ink.textAlign='center';ink.textBaseline='middle';ink.font='bold 62px sans-serif';ink.fillStyle='#fff4cf';ink.fillText(label,384,79);
    const map=new THREE.CanvasTexture(panel);map.colorSpace=THREE.SRGBColorSpace;
    const face=new THREE.Mesh(new THREE.PlaneGeometry(4.6,.91),new THREE.MeshBasicMaterial({map}));
    face.rotation.y=yaw;face.position.set(x+.075*Math.sin(yaw),3.14,z+.075*Math.cos(yaw));scene.add(face);
    timber.add(box,0x637e78,x,3.14,z,4.64,.95,.13,0,yaw);
    for(const side of [-1,1]) timber.add(box,0xac9470,x+side*1.72*Math.cos(yaw),1.84,z-side*1.72*Math.sin(yaw),.14,2.1,.14);
  }
  for(const {x,z} of courts){
    const h=sandHeight(x,z);
    for(const sign of [-1,1]){
      timber.add(box,0x397e84,x+sign*4.37,h+1.29,z,.112,2.58,.112);
      for(let i=0;i<16;i++) {
        const at=z-8+i;
        cord.beam(0xdbaf72,[x+sign*4,sandHeight(x+sign*4,at)+.025,at],[x+sign*4,sandHeight(x+sign*4,at+1)+.025,at+1],.045);
      }
      for(let i=0;i<8;i++){
        const at=x-4+i,zz=z+sign*8;
        cord.beam(0xdbaf72,[at,sandHeight(at,zz)+.025,zz],[at+1,sandHeight(at+1,zz)+.025,zz],.045);
      }
    }
    const top=u=>h+2.40-.078*(1-u*u);
    for(let i=0;i<32;i++){
      const u=i/16-1,v=(i+1)/16-1,ax=x+u*4.28,bx=x+v*4.28;
      cord.beam(0xf3ebd4,[ax,top(u),z],[bx,top(v),z],.047);
      for(let row=1;row<=5;row++)cord.beam(0x4d5553,[ax,top(u)-row*.176,z],[bx,top(v)-row*.176,z],.013);
      cord.beam(0x525957,[ax,top(u),z],[ax,top(u)-.88,z],.015);
    }
  }
  addLookouts(scene,Batch);
  const wood=timber.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true}));wood.userData.impactSurface='wood';
  cord.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true})).userData.impactSurface='solid';
  box.dispose();
}
