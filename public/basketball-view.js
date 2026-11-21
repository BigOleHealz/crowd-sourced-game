import * as THREE from 'three';
import {
  basketballCourt as court,basketballTeams,basketballRadius,hoop,basketballFloor,
  longShotDistance,onBasketballCourt,basketballBackstop,
} from './basketball-layout.js';
import {civilianLooks} from './civilian-style.js';
import {basketballPose} from './basketball-pose.js';

export const basketballLooks={
  'hoops-maya':{...civilianLooks['rival-maia'],extra:'watch',top:0x198e89,bottom:'shorts',pants:0x273347,outfit:7},
  'hoops-nico':{...civilianLooks['rival-rafi'],extra:'watch',top:0xc67c4f,bottom:'shorts',pants:0x343d43,outfit:3},
};

const pi=Math.PI;
const iron=0x29474a,steel=0x74928c,cream=0xffedce,orange=0xdd633a;
function canvasMap(w,h,draw){
  const canvas=document.createElement('canvas');
  canvas.width=w;canvas.height=h;
  const ink=canvas.getContext('2d');
  const map=new THREE.CanvasTexture(canvas);
  map.colorSpace=THREE.SRGBColorSpace;
  draw(ink,w,h);
  return {ink,map};
}
function grain(ink,w,h,count,light,dark,seed){
  let n=seed;
  const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
  for(let i=0;i<count;i++){
    ink.fillStyle=i%3?light:dark;
    ink.fillRect(random()*w,random()*h,1+random()*2.6,1+random()*2.1);
  }
}
function courtMap(){
  const {width:w,length:d,x,z}=court;
  return canvasMap(1024,1024,(ink,pw,ph)=>{
    ink.scale(pw/w,ph/d);
    ink.translate(w/2,d/2);
    ink.fillStyle='#b76f4f';ink.fillRect(-w/2,-d/2,w,d);
    ink.fillStyle='#3f8887';ink.fillRect(-6.9,-6.87,13.8,13.74);
    const y=hoop.z-z;
    ink.fillStyle='#59767c';ink.fillRect(-2.04,-6.9,4.08,4.93);
    ink.strokeStyle='#eadcba';ink.lineWidth=.051;
    ink.strokeRect(-6.57,-6.60,13.14,13.22);
    ink.strokeRect(-2.04,-6.60,4.08,4.63);
    ink.beginPath();ink.arc(hoop.x-x,y,longShotDistance,-.155,pi+.155);ink.stroke();
    const end=longShotDistance*Math.sin(.155);
    for(const side of [-1,1]){
      const xx=side*longShotDistance*Math.cos(.155);
      ink.beginPath();ink.moveTo(xx,y-end);ink.lineTo(xx,-6.6);ink.stroke();
      for(const end of [-4.60,-3.75,-2.85]){
        ink.beginPath();ink.moveTo(side*2.05,end);ink.lineTo(side*2.20,end);ink.stroke();
      }
    }
    ink.beginPath();ink.arc(0,-1.97,1.55,0,pi);ink.stroke();
    ink.save();ink.setLineDash([.15,.10]);
    ink.beginPath();ink.arc(0,-1.97,1.55,pi,2*pi);ink.stroke();ink.restore();
    ink.beginPath();ink.arc(0,y,1.13,0,pi);ink.stroke();
    ink.fillStyle='#e7d7ab';ink.textAlign='center';ink.font='bold .45px sans-serif';
    ink.fillText('H A R B O R   K E Y',0,6.06);
    ink.setTransform(1,0,0,1,0,0);
    grain(ink,pw,ph,28000,'#f5e6c426','#2c47432b',72);
  }).map;
}

function fence(batch,x1,z1,x2,z2){
  const length=Math.hypot(x2-x1,z2-z1),count=Math.round(length/.31);
  const a=(d,y)=>[x1+(x2-x1)*d/length,y,z1+(z2-z1)*d/length];
  for(let i=0,columns=Math.ceil(length/2.45);i<=columns;i++){
    const at=length*i/columns;
    batch.beam(iron,a(at,.76),a(at,3.79),.077);
    batch.beam(steel,a(at,3.79),a(at,3.83),.082);
  }
  for(const y of [.91,2.20,3.73])batch.beam(steel,a(0,y),a(length,y),.038);
  for(let i=-8;i<=count;i++){
    const d=i*length/count;
    for(const side of [-1,1]){
      const base=side===1?d:length-d;
      const start=Math.max(0,base),end=Math.min(length,base+2.2);
      if(end<=start)continue;
      const ya=.96+(start-base)*1.24,yb=.96+(end-base)*1.24;
      if(side===1)batch.beam(0x82968e,a(start,ya),a(end,yb),.011);
      else batch.beam(0x82968e,a(start,4.64-ya),a(end,4.64-yb),.011);
    }
  }
}

export function addBasketballCourt(scene,Batch){
  const root=new THREE.Group();root.name='Harbor Key Basketball Court';scene.add(root);
  const coords=new THREE.PlaneGeometry(court.width,court.length,64,64).rotateX(-pi/2).translate(court.x,0,court.z);
  const vertices=coords.attributes.position;
  for(let i=0;i<vertices.count;i++){
    const x=vertices.getX(i),z=vertices.getZ(i);
    vertices.setY(i,(basketballFloor(x,z)??court.y)+.019);
  }
  coords.computeVertexNormals();
  const surface=new THREE.Mesh(coords,new THREE.MeshLambertMaterial({map:courtMap()}));
  surface.receiveShadow=true;root.add(surface);
  const batch=new Batch(),box=new THREE.BoxGeometry(),post=new THREE.CylinderGeometry(.5,.5,1,12);
  const painted=new THREE.MeshLambertMaterial({vertexColors:true});
  const {x,y,z}=hoop;
  batch.add(box,0x8b8b79,x,1.02,hoop.postZ,.64,.42,.64);
  batch.add(post,iron,x,2.56,hoop.postZ,.205,3.22,.205);
  batch.add(box,iron,x,4.24,hoop.postZ+.43,.115,.13,.92);
  batch.beam(steel,[x,3.35,hoop.postZ],[x,4.24,hoop.boardZ-.07],.069);
  batch.add(box,0x2c666a,x,1.81,hoop.postZ,.32,1.59,.32);
  for(const yy of [1.12,2.48])batch.add(box,steel,x,yy,hoop.postZ,.332,.043,.332);
  for(const side of [-1,1]){
    batch.add(box,cream,x+side*.91,y+.42,hoop.boardZ,.052,1.08,.055);
    batch.add(box,cream,x+side*.313,y+.227,hoop.boardZ+.031,.037,.43,.018);
  }
  for(const yy of [y-.12,y+.96])batch.add(box,cream,x,yy,hoop.boardZ,1.87,.054,.055);
  batch.add(box,cream,x,y+.445,hoop.boardZ+.031,.66,.038,.018);
  batch.add(box,cream,x,y+.02,hoop.boardZ+.031,.66,.035,.018);
  batch.add(box,orange,x,y-.014,hoop.boardZ+.14,.175,.095,.28);
  const pane=new THREE.Mesh(new THREE.BoxGeometry(1.81,1.03,.037),new THREE.MeshPhongMaterial({
    color:0xb2d7dd,shininess:90,transparent:true,opacity:.24,depthWrite:false,
  }));
  pane.position.set(x,y+.42,hoop.boardZ);root.add(pane);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(hoop.radius,.022,12,44),new THREE.MeshLambertMaterial({color:orange}));
  rim.rotation.x=pi/2;rim.position.set(x,y,z);root.add(rim);
  const cords=new Batch(),net=new THREE.Group();
  const netPoint=(i,level)=>{
    const angle=2*pi*(i+level*.5)/12,rad=hoop.radius-(level*.026);
    return [Math.sin(angle)*rad,-.038-level*.103,Math.cos(angle)*rad];
  };
  for(let level=0;level<4;level++)for(let i=0;i<12;i++){
    const a=netPoint(i,level),b=netPoint(i,level+1),c=netPoint(i-1,level+1);
    cords.beam(cream,a,b,.011);cords.beam(cream,a,c,.011);
  }
  cords.mesh(net,painted,false);net.position.set(x,y,z);root.add(net);

  const west=court.x-court.width/2;
  for(const span of basketballBackstop)fence(batch,...span);
  const bx=court.x+8.05,bz=court.z+1.65;
  for(const side of [-1,1]){
    const leg=bz+side*1.09;
    batch.add(box,iron,bx,1.01,leg,.46,.43,.082);
    batch.add(box,iron,bx+.23,1.26,leg,.055,.85,.10);
    batch.add(box,0x999987,bx,.84,leg,.70,.14,.24);
  }
  for(let i=0;i<4;i++){
    batch.add(box,0xae8b63,bx+.23-i*.14,1.22,bz,.105,.081,2.85);
    if(i<3)batch.add(box,0x987755,bx+.268,1.39+i*.12,bz,.071,.088,2.85);
  }
  const signX=west-.42,signZ=court.z+3.62;
  for(const side of [-1,1])batch.add(box,iron,signX,1.94,signZ+side*.79,.105,2.43,.105);
  batch.add(box,iron,signX,2.58,signZ,.15,.94,1.82);
  batch.add(box,steel,signX,3.05,signZ,.19,.042,1.88);
  batch.mesh(root,painted);
  post.dispose();box.dispose();

  const board=canvasMap(512,258,()=>{});
  const face=new THREE.Mesh(new THREE.PlaneGeometry(1.76,.89),new THREE.MeshBasicMaterial({map:board.map,side:THREE.DoubleSide}));
  const opposite=face.clone();
  face.rotation.y=pi/2;face.position.set(signX+.078,2.58,signZ);
  opposite.rotation.y=-pi/2;opposite.position.set(signX-.078,2.58,signZ);
  root.add(face,opposite);

  const leather=canvasMap(256,128,(ctx,w,h)=>{
    ctx.fillStyle='#c65a29';ctx.fillRect(0,0,w,h);
    grain(ctx,w,h,4200,'#ffad6760','#63351d70',120);
    ctx.strokeStyle='#322625';ctx.lineWidth=2.5;
    for(const x of [1,128,255]){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    ctx.beginPath();ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
    for(let i=0;i<2;i++){
      ctx.beginPath();
      for(let x=0;x<=w;x++)ctx.lineTo(x,h/2+32*Math.sin(x/w*2*pi+i*pi));
      ctx.stroke();
    }
  });
  const ball=new THREE.Mesh(new THREE.SphereGeometry(basketballRadius,24,16),new THREE.MeshLambertMaterial({map:leather.map}));
  ball.name='Harbor Key basketball';ball.castShadow=true;root.add(ball);
  const patch=canvasMap(64,64,c=>{
    const gradient=c.createRadialGradient(32,32,0,32,32,32);
    gradient.addColorStop(0,'#262c2588');gradient.addColorStop(1,'#262c2500');
    c.fillStyle=gradient;c.fillRect(0,0,64,64);
  });
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.62,.62),new THREE.MeshBasicMaterial({
    map:patch.map,transparent:true,depthWrite:false,
  }));
  shadow.rotation.x=-pi/2;root.add(shadow);
  let displayedSerial=-1,boardText='',resultSerial=-1,netPulse=0;

  return (game,local,remotes,clock,dt)=>{
    const visible=game && Math.hypot(local.x-court.x,local.z-court.z)<127;
    ball.visible=shadow.visible=!!visible;
    const score=game?.scores.join(' : ')??'— : —';
    if(score!==boardText){
      boardText=score;
      const {ink:c,map}=board;
      c.fillStyle='#173b43';c.fillRect(0,0,512,258);
      c.strokeStyle='#8fa79d';c.lineWidth=5;c.strokeRect(7,7,498,244);
      c.textAlign='center';c.fillStyle='#ebe2c1';c.font='bold 32px sans-serif';c.fillText('HARBOR KEY',256,47);
      c.font='bold 30px sans-serif';
      for(const [i,team] of basketballTeams.entries()){
        c.fillStyle=team.color;c.fillText(team.name.toUpperCase(),128+i*256,105);
      }
      c.fillStyle='#f9f1de';c.font='700 75px monospace';c.fillText(score,256,190);
      c.font='600 17px sans-serif';c.fillText(game?'PICKUP BASKETBALL':'BASKETBALL COURT',256,226);
      map.needsUpdate=true;
    }
    if(!visible)return;
    const {ball:point,players,turn,phase}=game;
    const actorId=players[turn]??basketballTeams[turn].npc;
    const holder=[local,...remotes,...game.npcs].find(p=>p.id===actorId);
    const anim=phase==='held' && holder && basketballPose(game,holder,clock);
    if(anim){
      const {height,forward,lateral}=anim;
      ball.position.set(holder.x+Math.sin(holder.yaw)*forward+Math.cos(holder.yaw)*lateral,
        holder.y+height,holder.z-Math.cos(holder.yaw)*forward+Math.sin(holder.yaw)*lateral);
      ball.rotation.set(clock*2.4,0,-clock*1.1);
    }else{
      // Smooth consecutive server ball positions while resetting on possession.
      const weight=displayedSerial===point.serial?-Math.expm1(-24*dt):1;
      ball.position.x+=weight*(point.x-ball.position.x);
      ball.position.y+=weight*(point.y-ball.position.y);
      ball.position.z+=weight*(point.z-ball.position.z);
      ball.rotation.set(point.spin*5.5,point.spin*1.1,-point.spin*2.9);
    }
    displayedSerial=point.serial;
    shadow.position.set(ball.position.x,court.y+.029,ball.position.z);
    shadow.visible=onBasketballCourt(ball.position,-.40);
    shadow.material.opacity=Math.max(.17,1-(ball.position.y-court.y)*.19);
    if(game.result?.serial!==resultSerial){
      resultSerial=game.result?.serial;
      if(game.result?.points && game.shot)netPulse=1;
    }
    netPulse=Math.max(0,netPulse-dt*1.7);
    net.scale.y=1+.18*netPulse*Math.sin((1-netPulse)*18);
    net.rotation.z=.13*netPulse*Math.sin((1-netPulse)*26);
  };
}
