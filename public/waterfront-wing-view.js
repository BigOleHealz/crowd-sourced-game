import * as THREE from 'three';
import {wingArchitecture} from './waterfront-wing.js';

const plum=0x361c38, pearl=0xf1d9b8, onyx=0x222337, gold=0xd2a056;
const champagne=0xffe6a4, coral=0xff7a91, turquoise=0x78ede3;

// Each pane shares a material; the interior and the bay remain visible through it.
export function addWaterfrontWing(scene,Batch){
  const group=new THREE.Group();group.name='Aurora Salon · waterfront pavilion';scene.add(group);
  const masonry=new Batch(),metal=new Batch(),lamps=new Batch(),glazing=new Batch();
  const cube=new THREE.BoxGeometry(),bulb=new THREE.SphereGeometry(.5,8,6);
  const put=(batch,tint,x,y,z,w,h,d)=>batch.add(cube,tint,x,y,z,w,h,d);
  const box=(batch,tint,p)=>put(batch,tint,p.x,(p.bottom+p.top)/2,p.z,p.w,p.top-p.bottom,p.d);
  const w=-90.65,e=-72,n=30.4,s=61,base=.8,roof=9.35;
  const cx=(w+e)/2,cz=(n+s)/2;
  put(masonry,0xb6aa9c,-81.245,-.04,47.5,19.51,1.46,35);
  put(masonry,0xdbbca3,-81.245,.744,47.5,19.51,.11,35);
  for(const slab of wingArchitecture.slabs)box(masonry,slab.top>8?onyx:pearl,slab);
  for(const step of wingArchitecture.steps){
    box(masonry,0xdac9af,step);
    put(metal,gold,step.x,step.top+.002,step.z+step.d/2-.034,step.w,.016,.052);
  }
  for(const rail of wingArchitecture.rails){
    const along=rail.w>rail.d;
    put(metal,gold,rail.x,rail.top-.055,rail.z,rail.w,.11,rail.d);
    const len=along?rail.w:rail.d,count=Math.ceil(len/1.25);
    for(let i=0;i<=count;i++){
      const off=(i/count-.5)*Math.max(0,len-.075);
      put(metal,0xa17b51,rail.x+(along?off:0),(rail.bottom+rail.top)/2,rail.z+(along?0:off),.052,rail.top-rail.bottom,.052);
    }
  }
  for(const p of wingArchitecture.walls){
    // The shared lobby wall has interior finishes on both sides. Other walls
    // open visually to the bay behind a continuous, collidable glazed curtain.
    const inner=p.x>e-.24 && p.d>p.w && p.z>=39 && p.z<=54;
    if(inner || p.top-p.bottom<2){box(masonry,inner?plum:pearl,p);continue;}
    const sill=Math.min(p.top,p.bottom+.36);
    box(masonry,onyx,{...p,top:sill});
    if(p.top>sill)box(glazing,0x9cd4d9,{...p,bottom:sill});
  }

  // The waterfront colonnade is backed by the glass skin, with scalloped
  // transoms and repeated cap mouldings visible from both shore and sea.
  function bay(x,z,yaw,width){
    const point=(u,y,out)=>[x+Math.cos(yaw)*u+Math.sin(yaw)*out,y,z-Math.sin(yaw)*u+Math.cos(yaw)*out];
    const trim=(batch,c,u,y,out,sw,sh,sd)=>batch.add(cube,c,...point(u,y,out),sw,sh,sd,0,yaw);
    const beam=(batch,c,a,b,width)=>batch.beam(c,point(...a),point(...b),width);
    for(const u of [-width/2,width/2]){
      trim(masonry,pearl,u,4.81,.1,.34,8.04,.42);
      trim(metal,gold,u,5.0,.32,.10,8.4,.06);
      trim(lamps,champagne,u,5.9,.36,.035,6.15,.025);
      for(const [y,sw] of [[1.02,.53],[1.24,.43],[7.61,.44],[7.82,.57]])trim(metal,gold,u,y,.15,sw,.13,.55);
    }
    trim(metal,onyx,0,4.75,.03,width,.105,.17);
    const r=width*.46;
    for(const side of [-1,1]){
      beam(metal,gold,[0,5.87,.16],[side*r,7.77,.16],.053);
      beam(metal,gold,[0,5.87,.16],[side*r*.42,7.77,.16],.044);
    }
    trim(metal,gold,0,7.79,.12,width,.10,.21);
  }
  for(let i=0;i<7;i++)bay(w,n+(i+.5)*(s-n)/7,-Math.PI/2,(s-n)/7);
  for(let i=0;i<4;i++)bay(w+(i+.5)*(e-w)/4,n,Math.PI,(e-w)/4);
  for(const [left,right] of [[w,-82.58],[-78.22,e]])bay((left+right)/2,s,0,right-left);
  // Stepped horizontal bands tie the new wing to the original tower.
  for(const [y,h,over,c] of [[8.13,.28,.24,plum],[8.37,.15,.38,gold],[8.72,.47,.49,plum],[9.03,.10,.57,champagne],[9.24,.21,.47,pearl],[9.42,.095,.32,gold]]){
    const batch=c===champagne?lamps:c===gold?metal:masonry;
    for(const z of [n,s])put(batch,c,cx,y,z,e-w+over*2,h,.27+over);
    for(const x of [w,e])put(batch,c,x,y,cz,.27+over,h,s-n);
  }
  // Flared champagne-gold fan over the entry. Seven stepped blades and their
  // inlaid inner ribs give the crown a dimensional silhouette from the water.
  const portal=-80.4;
  function fan(x,z,y,yaw,scale){
    const on=(u,v,out)=>[x+scale*(Math.cos(yaw)*u+Math.sin(yaw)*out),y+scale*v,z+scale*(-Math.sin(yaw)*u+Math.cos(yaw)*out)];
    for(let i=-4;i<=4;i++){
      const a=i*.175,r=4.3-.095*Math.abs(i),tip=[Math.sin(a)*r,Math.cos(a)*r,0];
      metal.beam(gold,on(0,0,0),on(...tip),.33*scale,.26*scale);
      lamps.beam(i%2===0?champagne:coral,on(0,.11,.155),on(tip[0],tip[1]-.07,.155),.071*scale);
      if(i<4){
        const q=a+.175,nr=4.3-.095*Math.abs(i+1);
        metal.beam(gold,on(...tip),on(Math.sin(q)*nr,Math.cos(q)*nr,0),.15*scale);
      }
    }
  }
  fan(portal,s+.22,8.43,0,1.14);
  for(const z of [36.7,45.7,54.7])fan(w-.18,z,8.66,-Math.PI/2,.64);
  // A rounded porte-cochère glows beneath the sign. The doors below stay clear.
  const canopy=new THREE.Shape();canopy.moveTo(-4.45,0);canopy.lineTo(4.45,0);
  canopy.lineTo(4.45,-1.05);canopy.quadraticCurveTo(4.45,-2.05,3.35,-2.05);
  canopy.lineTo(-3.35,-2.05);canopy.quadraticCurveTo(-4.45,-2.05,-4.45,-1.05);canopy.closePath();
  const canopyShape=new THREE.ExtrudeGeometry(canopy,{depth:1,bevelEnabled:false,curveSegments:10}).rotateX(-Math.PI/2);
  for(const [y,h,c] of [[3.94,.1,champagne],[4.04,.29,plum],[4.33,.1,gold],[4.44,.055,coral]])
    (c===champagne||c===coral?lamps:c===gold?metal:masonry).add(canopyShape,c,portal,y,s,1,h,1);
  for(let j=0;j<3;j++)for(let i=0;i<13;i++)
    lamps.add(bulb,champagne,portal+(i-6)*.57,3.90,s+.25+j*.59,.085,.055,.085);
  for(const side of [-1,1]){
    put(metal,gold,portal+side*2.12,2.40,s+.10,.16,3.3,.24);
    put(lamps,champagne,portal+side*2.12,2.40,s+.24,.055,3.05,.05);
  }

  const sign=document.createElement('canvas');sign.width=1024;sign.height=320;
  const ctx=sign.getContext('2d'),bg=ctx.createLinearGradient(0,0,1024,320);
  bg.addColorStop(0,'#321d34');bg.addColorStop(.52,'#48203a');bg.addColorStop(1,'#182b31');
  ctx.fillStyle=bg;ctx.fillRect(0,0,1024,320);
  for(const inset of [9,18]){ctx.strokeStyle=inset===9?'#eaba76':'#a77758';ctx.lineWidth=inset===9?4:2;ctx.strokeRect(inset,inset,1024-2*inset,320-2*inset);}
  ctx.textAlign='center';ctx.fillStyle='#ffda95';ctx.font='bold 35px Georgia';ctx.fillText('L A N T E R N   C L U B',512,69);
  ctx.shadowColor='#e67e55';ctx.shadowBlur=11;ctx.fillStyle='#fff4d3';ctx.font='bold 132px Georgia';ctx.fillText('C A S I N O',512,201);
  ctx.shadowBlur=0;ctx.fillStyle='#f5c799';ctx.font='31px Georgia';ctx.fillText('A U R O R A    S A L O N',512,265);
  const texture=new THREE.CanvasTexture(sign);texture.colorSpace=THREE.SRGBColorSpace;
  const lettering=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
  const panel=new THREE.PlaneGeometry(1,1);
  function marquee(x,y,z,yaw,width){
    metal.add(cube,gold,x,y,z,width+.22,width*.3125+.21,.17,0,yaw);
    const face=new THREE.Mesh(panel,lettering);face.scale.set(width,width*.3125,1);face.rotation.y=yaw;
    face.position.set(x+Math.sin(yaw)*.095,y,z+Math.cos(yaw)*.095);group.add(face);
  }
  marquee(portal,6.27,s+.40,0,7.3);
  marquee(e+.14,3.94,58.75,Math.PI/2,3.65);
  marquee(w-.42,6.05,45.7,-Math.PI/2,6.3);
  masonry.mesh(group,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.56}),false);
  metal.mesh(group,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.34,metalness:.47}),false);
  glazing.mesh(group,new THREE.MeshStandardMaterial({vertexColors:true,transparent:true,opacity:.20,depthWrite:false,side:THREE.DoubleSide,roughness:.16,metalness:.16}),false);
  lamps.mesh(group,new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}),false);
  cube.dispose();bulb.dispose();canopyShape.dispose();
}
