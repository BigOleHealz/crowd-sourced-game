import * as THREE from 'three';
import { beach, courts, stations, sandHeight } from './beach-layout.js';
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
  for(const [x,z,yaw,label] of [[8,-198,0,'BEACH ACCESS  →'],[33,-198,-Math.PI/2,'HARBOR KEY BEACH  ↑']]){
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
  for(const {x,z,number} of stations){
    const h=sandHeight(x,z),paint=number==='01'?0x4ba9aa:0xe27955;
    for(const s of [-1,1]) for(const t of [-1,1]){
      const a=[x+s*1.13,sandHeight(x+s*1.13,z+t*1.25)-.04,z+t*1.25],b=[x+s*.94,h+1.64,z+t*1.04];
      timber.beam(0xa58967,a,b,.16);
    }
    timber.add(box,0xc2ab87,x+.25,h+1.58,z,2.84,.16,2.76);
    timber.add(box,paint,x-.32,h+2.34,z,1.78,1.37,2.38);
    timber.add(box,0x365558,x+.58,h+2.61,z,.032,.57,2.03);
    for(const side of [-1,1]) {
      timber.add(box,0x405b5d,x-.38,h+2.60,z+side*1.196,1.31,.53,.024);
      timber.beam(0xf1e4bd,[x+1.52,h+1.60,z+side*1.28],[x+1.52,h+2.39,z+side*1.28],.062);
      timber.beam(0xe7dbb9,[x+.56,h+2.38,z+side*1.27],[x+1.54,h+2.38,z+side*1.27],.063);
    }
    timber.add(box,0xf3e7c7,x,h+3.14,z,2.91,.145,3.04,0,0,.065);
    for(let i=0;i<5;i++)timber.add(box,0xb19a75,x-.89-i*.22,h+1.35-i*.265,z,.29,.095,.77);
    const canvas=document.createElement('canvas');canvas.width=384;canvas.height=100;
    const ink=canvas.getContext('2d');ink.fillStyle='#e9dfc6';ink.fillRect(0,0,384,100);ink.fillStyle='#29514f';ink.font='bold 37px sans-serif';ink.textAlign='center';ink.fillText('OCEAN RESCUE',192,43);ink.font='bold 30px sans-serif';ink.fillText('HARBOR KEY  '+number,192,83);
    const m=new THREE.CanvasTexture(canvas);m.colorSpace=THREE.SRGBColorSpace;
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.48,.37),new THREE.MeshLambertMaterial({map:m}));
    sign.position.set(x-.33,h+2.14,z+1.21);scene.add(sign);
  }
  const wood=timber.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true}));wood.userData.impactSurface='wood';
  cord.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true})).userData.impactSurface='solid';
  box.dispose();
}
