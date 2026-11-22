import * as THREE from 'three';
import {pools,waterfall,pokerFloor,pokerTables} from './grand-atrium.js';

export function createGrandAtrium(scene,Batch){
  const group=new THREE.Group();group.name='Aurora crystal atrium';scene.add(group);
  const brass=new Batch(),glass=new Batch(),light=new Batch(),stone=new Batch(),water=new Batch();
  const cube=new THREE.BoxGeometry(),sphere=new THREE.SphereGeometry(.5,10,6);
  const cylinder=new THREE.CylinderGeometry(.5,.5,1,32),cut=new THREE.OctahedronGeometry(.5);
  const ring=new THREE.TorusGeometry(1,.018,6,80).rotateX(Math.PI/2);
  const gold=0xdca75a,amber=0xffca73,ivory=0xfff6dc,jade=0x105750;
  const cx=-55,cz=50.2,tau=Math.PI*2;
  function hoop(batch,col,x,y,z,r,depth=1){batch.add(ring,col,x,y,z,r,depth,r);}
  function cord(col,a,b,gauge=.018){brass.beam(col,a,b,gauge);}
  // A fluted canopy and six nested coronas suspend hundreds of individually cut prisms.
  brass.add(cylinder,gold,cx,18.53,cz,3.5,.23,3.5);
  for(let i=0;i<8;i++){
    const a=tau*i/8;
    cord(gold,[cx+Math.cos(a)*1.48,18.52,cz+Math.sin(a)*1.48],
      [cx+Math.cos(a)*3.18,15.14,cz+Math.sin(a)*3.18],.04);
  }
  const coronas=[[3.22,15.10,62],[2.75,13.65,52],[2.13,12.1,44],[1.52,10.48,34],[.93,9.0,24],[.42,7.68,16]];
  for(const [r,y,n] of coronas){
    hoop(brass,gold,cx,y,cz,r,3);hoop(light,amber,cx,y-.11,cz,r*.98,1.35);
    for(let i=0;i<n;i++){
      const a=tau*i/n+y*.42,swag=.48+.71*(.5+.5*Math.cos(8*a)),x=cx+r*Math.cos(a),z=cz+r*Math.sin(a);
      const end=[x-.085*Math.cos(a),y-swag,z-.085*Math.sin(a)];
      cord(0xd5bc82,[x,y,z],end);
      glass.add(cut,[0xeafaff,0xf8e1b8,0xa7dbeb,0xffecf6][i%4],...end,.14,.44+(i%3)*.07,.14,0,a,.06);
      if(i%3===0)light.add(cut,ivory,x,y-.16,z,.071,.11,.071);
    }
  }
  cord(gold,[cx,18.5,cz],[cx,7.2,cz],.065);
  glass.add(cut,0xeefbff,cx,7.01,cz,.78,1.34,.78);
  light.add(cut,ivory,cx,6.28,cz,.13,.20,.13);
  for(const p of pools){
    const {x,z}=p;
    for(const [y,d,h,col] of [[.90,2.06,.18,0x332e36],[1.02,1.92,.14,gold],[1.15,2.05,.14,0xd5cebc]]){
      stone.add(cylinder,col,x,y,z,d,h,d);
    }
    water.add(cylinder,0x438f96,x,1.235,z,1.86,.035,1.86);
    hoop(light,0x9afcf1,x,1.26,z,.94,1.5);
    for(let j=0;j<9;j++){
      const a=tau*j/9;
      let last;
      for(let k=0;k<=12;k++){
        const t=k/12,r=.17+.62*t,point=[x+r*Math.cos(a),1.26+3.6*t*(1-t),z+r*Math.sin(a)];
        if(last)water.beam(0xb8f7ee,last,point,.024);
        last=point;
      }
    }
    brass.add(cylinder,gold,x,1.38,z,.39,.27,.39);
  }
  const f=waterfall;
  stone.add(cube,0x163f43,f.x-.06,(f.top+f.bottom)/2,f.z,.24,f.top-f.bottom,f.width+.36);
  for(const end of [-1,1])brass.add(cube,gold,f.x+.08,(f.top+f.bottom)/2,f.z+end*(f.width/2+.04),.18,f.top-f.bottom+.22,.09);
  light.add(cube,0xc7fff5,f.x+.15,f.top,f.z,.16,.09,f.width+.12);
  const curtain=new THREE.Mesh(new THREE.PlaneGeometry(f.width,f.top-f.bottom),new THREE.ShaderMaterial({
    uniforms:{time:{value:0}},side:THREE.DoubleSide,transparent:true,depthWrite:false,
    vertexShader:'varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 v;uniform float time;void main(){
      float ribbon=sin(v.x*101.+sin(v.y*7.+time*1.5)*.7);
      float vein=.5+.5*sin(v.x*227.+sin(v.y*18.+time*4.));
      float drops=pow(.5+.5*sin(v.y*92.+time*8.+ribbon*4.),5.);
      vec3 c=mix(vec3(.04,.31,.34),vec3(.63,.95,.91),.22+.35*vein+.28*drops);
      gl_FragColor=vec4(c,.58+.24*vein);}`
  }));
  curtain.position.set(f.x+.115,(f.top+f.bottom)/2,f.z);curtain.rotation.y=Math.PI/2;group.add(curtain);
  for(const p of pokerTables){
    const {x,z}=p,y=pokerFloor;
    stone.add(cylinder,0x35233c,x,y+.39,z,1.5,.68,.76);
    brass.add(cylinder,gold,x,y+.71,z,3.24,.12,1.76);
    stone.add(cylinder,0x443046,x,y+.81,z,3.32,.16,1.83);
    stone.add(cylinder,jade,x,y+.897,z,2.96,.035,1.48);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,s=Math.sin(a),c=Math.cos(a),u=x+1.94*c,v=z+1.25*s;
      brass.add(cylinder,gold,u,y+.24,v,.11,.47,.11);
      stone.add(cylinder,0x71354d,u,y+.48,v,.54,.14,.54);
      stone.add(sphere,0x71354d,u+.22*c,y+.71,v+.22*s,.48,.55,.16,0,Math.PI/2-a);
      for(let j=0;j<2;j++)stone.add(cube,0xfff3ac,x+1.02*c+j*.084,y+.925,z+.46*s,.074,.012,.114,0,.13*j-a);
      for(let j=0;j<3;j++)stone.add(cylinder,[0xb03542,0xfae8bb,0x3e6595][j],x+1.19*c+.05*j,y+.93+j*.018,z+.57*s,.089,.024,.089);
    }
  }
  stone.mesh(group,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.48}),false);
  brass.mesh(group,new THREE.MeshStandardMaterial({vertexColors:true,metalness:.45,roughness:.28}),false);
  glass.mesh(group,new THREE.MeshPhongMaterial({vertexColors:true,specular:0xffffff,shininess:96,flatShading:true,emissive:0x303a3c}),false);
  light.mesh(group,new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}),false);
  water.mesh(group,new THREE.MeshPhongMaterial({vertexColors:true,specular:0xe1ffff,shininess:90,emissive:0x103339}),false);
  for(const g of [cube,sphere,cylinder,cut,ring])g.dispose();
  return (dt,feet)=>{
    group.visible=Math.abs(feet.x-cx)<43 && Math.abs(feet.z-cz)<49 && feet.y<33;
    if(group.visible)curtain.material.uniforms.time.value=(curtain.material.uniforms.time.value+dt)%400;
  };
}
