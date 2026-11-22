import * as THREE from 'three';
import {casinoSeat,cardName,tableZ} from './casino-layout.js';
import {civilianLooks} from './civilian-style.js';
import {holdWorld} from './ranger-pose.js';

const {x,y}=casinoSeat,z=tableZ;
const brass=0xc7a873,walnut=0x5c372d,leather=0x362d2a,velvet=0x30514b;
const dealer={id:'lantern-dealer',name:'Lucía · Dealer',casinoDealer:true,x,y,z:tableZ-1.2,yaw:Math.PI,grounded:true,hp:100};
export const dealerLooks={[dealer.id]:{...civilianLooks['rival-ines'],face:18,outfit:11,cut:'bun',hair:0x36241f,
  shirt:'jacket',top:0x2e4944,bottom:'slacks',pants:0x343330,extra:'staff'}};
const occupied=[dealer],empty=[];
export const casinoCast=(local,game)=>game && Math.abs(local.y-y)<7 && Math.hypot(local.x-x,local.z-z)<34?occupied:empty;

export function poseAtTable(actor,isDealer,game,time){
  actor.root.rotation.y=isDealer?Math.PI:0;
  for(const kit of actor.tools)kit.visible=false;
  actor.body.position.set(0,isDealer?-.025:-.41,isDealer?0:-.025);
  const showing=isDealer && (game.phase==='play' || game.phase==='result');
  const gesture=showing?.5+.5*Math.sin(time*1.35):0;
  actor.spine.rotation.set(isDealer?-.045:-.16,0,0);
  actor.head.rotation.set(showing?.18:.065,isDealer?.075*Math.sin(time*.7):0,0);
  for(const {side,leg,knee,ankle,arm,forearm} of actor.limbs){
    leg.rotation.set(isDealer?.02:1.50,0,isDealer?0:side*.09);
    knee.rotation.set(isDealer?-.07:-1.56,0,0);ankle.rotation.set(.05,0,0);
    arm.rotation.set(.40,0,.11*side);forearm.rotation.set(.78,0,0);
    const reach=isDealer && side<0?gesture:0;
    holdWorld(actor,arm,forearm,side,{x:x+(isDealer?-side:side)*(.24+.12*reach),
      y:y+(isDealer?1.04+.07*reach:.87),z:isDealer?dealer.z+.26+.16*reach:casinoSeat.z-.32});
  }
}

function canvasTexture(width,height,draw){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  draw(canvas.getContext('2d'));const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function outline(){
  const s=new THREE.Shape();
  s.moveTo(-1.38,.46);s.lineTo(1.38,.46);s.quadraticCurveTo(1.48,.46,1.48,.27);
  s.bezierCurveTo(1.44,-.30,.82,-.67,0,-.69);s.bezierCurveTo(-.82,-.67,-1.44,-.30,-1.48,.27);
  s.quadraticCurveTo(-1.48,.46,-1.38,.46);s.closePath();return s;
}
function felt(){
  return canvasTexture(1024,400,g=>{
    const wash=g.createRadialGradient(540,186,12,510,220,570);wash.addColorStop(0,'#426459');wash.addColorStop(1,'#1e4039');
    g.fillStyle=wash;g.fillRect(0,0,1024,400);
    for(let yy=0;yy<400;yy+=3){g.fillStyle=yy%2?'#ffffff05':'#001c1411';g.fillRect(0,yy,1024,1);}
    g.strokeStyle='#c4ac72';g.lineWidth=2;g.beginPath();g.moveTo(75,103);g.bezierCurveTo(220,304,798,304,949,103);g.stroke();
    g.textAlign='center';g.fillStyle='#eedfac';g.font='bold 34px Georgia,serif';g.fillText('BLACKJACK',512,120);
    g.font='16px Georgia,serif';g.fillText('L A N T E R N   C L U B',512,156);
    for(const [cx,cy,a] of [[227,174,-.35],[512,264,0],[797,174,.35]]){
      g.save();g.translate(cx,cy);g.rotate(a);g.strokeRect(-19,-20,38,40);g.restore();
    }
  });
}
function cardAtlas(){
  const cw=96,ch=128,cols=9;
  return canvasTexture(cw*cols,ch*6,g=>{
    for(let i=0;i<53;i++){
      const left=(i%cols)*cw,top=Math.floor(i/cols)*ch;
      g.save();g.translate(left,top);g.fillStyle='#eee9da';g.fillRect(0,0,cw,ch);
      g.strokeStyle='#9b886a';g.lineWidth=2;g.strokeRect(3,3,cw-6,ch-6);
      if(i===52){
        g.fillStyle='#294743';g.fillRect(7,7,cw-14,ch-14);g.strokeStyle='#bfa278';g.lineWidth=1.25;
        for(let yy=16;yy<ch-9;yy+=16)for(let xx=16;xx<cw-8;xx+=16){
          g.beginPath();g.moveTo(xx,yy-6);g.lineTo(xx+6,yy);g.lineTo(xx,yy+6);g.lineTo(xx-6,yy);g.closePath();g.stroke();
        }
      }else{
        const label=cardName(i),suit=label.slice(-1),rank=label.slice(0,-1);
        g.fillStyle=i>=13 && i<39?'#a93138':'#24312e';
        g.textAlign='left';g.font='bold 33px Georgia,serif';g.fillText(rank,8,38);
        g.textAlign='center';g.font='49px Georgia,serif';g.fillText(suit,cw/2,ch*.68);
        g.save();g.translate(cw-8,ch-7);g.rotate(Math.PI);g.textAlign='left';g.font='bold 25px Georgia,serif';g.fillText(rank,0,21);g.restore();
      }
      g.restore();
    }
  });
}
function tableCards(scene){
  const slots=32,geom=new THREE.PlaneGeometry(.20,.265).rotateX(-Math.PI/2);
  const indices=new THREE.InstancedBufferAttribute(new Float32Array(slots),1);geom.setAttribute('cardFace',indices);
  const mat=new THREE.MeshBasicMaterial({map:cardAtlas()});
  mat.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float cardFace;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vMapUv=(vec2(mod(cardFace,9.0),5.0-floor(cardFace/9.0))+mix(vec2(.012),vec2(.988),vMapUv))/vec2(9.0,6.0);');
  };
  const mesh=new THREE.InstancedMesh(geom,mat,slots);mesh.count=0;mesh.name='Blackjack cards on felt';
  mesh.position.set(x,y+.957,z);mesh.frustumCulled=false;scene.add(mesh);
  const pose=new THREE.Object3D();let prev;
  return (game,near)=>{
    mesh.visible=!!near;
    if(!near)return;
    const key=game?game.revision+'|'+game.phase+'|'+game.hand?.join(',')+'|'+game.dealer?.join(','):'';
    if(key===prev)return;prev=key;mesh.count=0;
    for(const [hand,dz] of [[game?.dealer,-.225],[game?.hand,.282]]){
      if(!hand?.length)continue;
      const spacing=Math.min(.224,2.02/hand.length);
      hand.forEach((card,i)=>{
        if(mesh.count>=slots)return;
        pose.position.set((i-(hand.length-1)/2)*spacing,.0017*i,dz);
        pose.rotation.set(0,-.037*(i-(hand.length-1)/2),0);pose.updateMatrix();
        mesh.setMatrixAt(mesh.count,pose.matrix);indices.setX(mesh.count++,card<0?52:card);
      });
    }
    indices.needsUpdate=mesh.instanceMatrix.needsUpdate=true;
  };
}
export function uniformDealer(rig,Batch,material){
  const accents=new Batch(),cube=new THREE.BoxGeometry(),knot=new THREE.SphereGeometry(.5,8,6);
  // The bow and nameplate sit above the jacket's photographic weave.
  for(const side of [-1,1]){
    accents.add(knot,0x35252a,side*.026,1.463,-.106,.058,.032,.022,0,0,-side*.28);
    accents.beam(0xd9caa7,[side*.081,1.48,-.075],[side*.042,1.43,-.101],.012,.009);
  }
  accents.add(knot,0x2e2023,0,1.462,-.119,.023,.021,.017);
  accents.add(cube,brass,.092,1.354,-.132,.068,.024,.008);
  accents.mesh(rig.upper,material,false);cube.dispose();knot.dispose();
}
export function casinoView(scene,Batch){
  const group=new THREE.Group();group.name='Palma de Sal';group.position.set(x,y,z);scene.add(group);
  const batch=new Batch(),cube=new THREE.BoxGeometry(),drum=new THREE.CylinderGeometry(.5,.5,1,28);
  const box=(c,u,h,v,w,hh,d,ry=0)=>batch.add(cube,c,u,h,v,w,hh,d,0,ry);
  const cyl=(c,u,h,v,w,hh,d=w)=>batch.add(drum,c,u,h,v,w,hh,d);
  box(0x536358,0,.008,.16,4.4,.015,3.26);
  for(const sign of [-1,1]){
    box(brass,sign*2.10,.018,.16,.019,.005,3.08);box(brass,0,.018,.16+sign*1.54,4.20,.005,.019);
  }
  const top=outline();
  const rim=new THREE.ExtrudeGeometry(top,{depth:.15,bevelEnabled:false,curveSegments:16}).rotateX(-Math.PI/2);
  batch.add(rim,walnut,0,.78,0);batch.add(rim,brass,0,.86,0,1.006,.18,1.006);
  batch.add(rim,leather,0,.91,0,1.002,.21,1.002);
  for(const u of [-.85,.85]){cyl(brass,u,.087,-.04,.50,.09);cyl(walnut,u,.44,-.04,.33,.70);cyl(brass,u,.71,-.04,.37,.055);}
  box(brass,0,.35,.07,1.68,.045,.055);
  const cloth=new THREE.ShapeGeometry(top,18),pos=cloth.attributes.position,uv=cloth.attributes.uv;
  for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+1.48)/2.96,(pos.getY(i)+.69)/1.15);
  cloth.rotateX(-Math.PI/2);const cover=new THREE.Mesh(cloth,new THREE.MeshBasicMaterial({map:felt()}));
  cover.scale.set(.91,1,.83);cover.position.y=.95;group.add(cover);
  // Upholstered seat and shoulder-height brass foot rail.
  const seatZ=casinoSeat.z-z;
  cyl(brass,0,.053,seatZ,.57,.08);cyl(leather,0,.27,seatZ,.12,.41);
  box(walnut,0,.50,seatZ,.64,.12,.64);box(velvet,0,.57,seatZ,.61,.14,.60);
  box(walnut,0,.78,seatZ+.295,.63,.43,.082);box(velvet,0,.81,seatZ+.238,.60,.37,.067);
  // Chip float, discard tray, and shoe at the dealer edge of the cloth.
  box(leather,-.82,.97,-.27,.51,.042,.19);
  for(let i=0;i<4;i++)for(let j=0;j<4;j++)cyl([0xa74442,0xc1a656,0x577c70,0x727b97][i],-.98+i*.106,1.002+j*.012,-.27,.078,.016);
  box(0x443e38,1.08,.996,-.25,.22,.12,.23,-.15);box(0xe4ddcb,1.08,1.062,-.25,.16,.015,.19,-.15);
  const mesh=batch.mesh(group,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.70}));mesh.userData.impactSurface='solid';
  rim.dispose();cube.dispose();drum.dispose();
  const updateCards=tableCards(scene);
  return (game,local)=>{
    const near=Math.abs(local.x-x)<58 && Math.abs(local.z-z)<58;
    group.visible=near;updateCards(game,near);
  };
}
