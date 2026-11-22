import * as THREE from 'three';
import {courts,sandHeight} from './beach-layout.js';
import {civilianLooks} from './civilian-style.js';
import {ballRadius,sampleVolleyball,sideSign,slotSide,spikeRecovery,spikeWindup,volleyballMember,volleyballServiceSpot,
  volleyballTeams} from './volleyball-court.js';

const profiles=['rival-maia','rival-diego','rival-rafi','rival-ana','rival-mei','rival-jules','rival-iman','rival-santi'];
export const volleyballLooks=Object.fromEntries(profiles.map((profile,i)=>{
  const slot=i%4;
  return ['volley-'+Math.floor(i/4)+'-'+slot,{...civilianLooks[profile],shirt:slot%2?'tee':'tank',
    top:volleyballTeams[slotSide(slot)].color,bottom:'shorts',pants:slot%2?0x304855:0x383b43,extra:null}];
}));

export function volleyballActors(states,samples,local){
  if(!states)return [];
  return states.flatMap((game,index)=>{
    const court=courts[index];
    if(game.phase==='closed' || Math.hypot(local.x-court.x,local.z-court.z)>76)return [];
    const athletes=samples?.[index]?.athletes??game.athletes;
    return athletes.filter(({slot})=>game.players[slot]==null)
      .map(actor=>({...actor,volleyball:{state:game,court,slot:actor.slot}}));
  });
}

function makeBall(scene){
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=128;
  const ink=canvas.getContext('2d');
  const panels=['#f0d347','#f7f6e6','#2c90c5','#fff4c3','#e1bc29','#26658f'];
  ink.fillStyle='#183c54';ink.fillRect(0,0,canvas.width,canvas.height);
  function stripe(x){
    ink.beginPath();ink.moveTo(x,0);
    ink.bezierCurveTo(x+40,30,x-30,78,x+7,128);
    ink.bezierCurveTo(x+52,78,x+1,30,x+42,0);
    ink.closePath();
  }
  for(let i=-1;i<=6;i++){
    stripe(i*256/6);
    ink.fillStyle=panels[(i+6)%6];ink.fill();
    ink.strokeStyle='#1e4052';ink.lineWidth=1.5;ink.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const ball=new THREE.Mesh(new THREE.SphereGeometry(ballRadius,24,16),
    new THREE.MeshStandardMaterial({map:texture,roughness:.54}));
  ball.name='Beach volleyball';ball.visible=false;ball.castShadow=true;scene.add(ball);
  return ball;
}

function makeBoard(scene,court,index){
  const courtName='COURT '+(index+1),x=court.x-5.18,z=court.z+1.22,y=sandHeight(x,z);
  const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=Math.PI/2;
  group.name='Harbor Key beach volleyball '+courtName.toLowerCase();scene.add(group);
  const painted=new THREE.MeshStandardMaterial({color:0x1f585f,roughness:.83});
  const trim=new THREE.MeshStandardMaterial({color:0xe6d4a9,roughness:.78});
  const box=(w,h,d,bx,by,bz,material)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(bx,by,bz);group.add(mesh);
  };
  box(2.22,1.09,.12,0,1.39,0,trim);
  box(2.12,1.00,.128,0,1.39,0,painted);
  for(const side of [-1,1]){
    box(.105,1.30,.14,side*.86,.65,0,painted);
    box(.36,.055,.46,side*.86,.035,0,trim);
  }
  const canvas=document.createElement('canvas');canvas.width=624;canvas.height=288;
  const paint=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const faceMaterial=new THREE.MeshBasicMaterial({map:texture});
  for(const side of [-1,1]){
    const face=new THREE.Mesh(new THREE.PlaneGeometry(2.05,.952),faceMaterial);
    face.position.set(0,1.39,side*.066);face.rotation.y=side<0?Math.PI:0;group.add(face);
  }
  let previous='';
  return game=>{
    const score=game?.score??[0,0],phase=game?.phase;
    const message=phase==='closed'?'NET DOWN':phase==='game'?volleyballTeams[game.winner].name.toUpperCase()+' WINS':'PICKUP DOUBLES';
    const key=score.join('-')+message;
    if(key===previous)return;
    previous=key;
    paint.fillStyle='#153e46';paint.fillRect(0,0,624,288);
    paint.fillStyle='#f7e9bc';paint.textAlign='center';paint.font='700 36px sans-serif';
    paint.fillText('HARBOR KEY BEACH VOLLEYBALL',312,48);
    paint.font='700 24px sans-serif';paint.fillText(courtName,312,80);
    for(const [side,team] of volleyballTeams.entries()){
      const center=side?456:168;
      paint.fillStyle=side?'#754334':'#225a6a';paint.fillRect(center-112,95,224,139);
      paint.fillStyle=side?'#ffc5a3':'#a6edf0';paint.font='700 32px sans-serif';paint.fillText(team.name.toUpperCase(),center,134);
      paint.font='700 75px sans-serif';paint.fillText(score[side],center,214);
    }
    paint.fillStyle='#f7e9bc';paint.font='700 23px sans-serif';paint.fillText(message,312,269);
    texture.needsUpdate=true;
  };
}

function makeMarker(scene){
  const marker=new THREE.Mesh(new THREE.RingGeometry(.29,.40,32),new THREE.MeshBasicMaterial({
    color:0x67f3e7,transparent:true,side:THREE.DoubleSide,depthWrite:false,opacity:.95,
  }));
  marker.rotation.x=-Math.PI/2;marker.visible=false;scene.add(marker);
  return marker;
}

export function volleyballLandingScale(flight,tick){
  const {from,to,lift,duration}=flight;
  const apex=lift>0?clamp(.5+(to[1]-from[1])/(8*lift),0,1):0;
  const progress=(tick-flight.tick)/duration;
  const descent=THREE.MathUtils.smoothstep(progress,apex,1);
  return mix(1.72,.67,descent);
}

export function volleyballView(scene){
  const views=courts.map((court,index)=>({
    ball:makeBall(scene),marker:makeMarker(scene),board:makeBoard(scene,court,index),
  }));
  return (states,local,remotes,tick,dt)=>{
    const member=volleyballMember(states,local.id);
    for(const [index,view] of views.entries()){
      const {ball,marker,board}=view,court=courts[index],game=states?.[index];
      const near=game && Math.hypot(local.x-court.x,local.z-court.z)<85;
      board(game);
      ball.visible=!!near && game.phase!=='closed';
      marker.visible=false;
      if(!ball.visible)continue;
      if(game.phase==='rally'){
        const shot=game.flight,position=sampleVolleyball(shot,tick);
        ball.position.set(position.x,position.y,position.z);
        ball.rotation.set(tick*.18, tick*.085, tick*.058);
        if(member?.index===index && member.side!==slotSide(shot.slot)){
          const [x,,z]=shot.to;
          marker.visible=true;
          marker.scale.setScalar(volleyballLandingScale(shot,tick));
          marker.position.set(x,sandHeight(x,z)+.041,z);
        }
      }else if(game.phase==='serve'){
        const server=game.server,id=game.players[server],side=slotSide(server);
        const actor=id==null?game.athletes[server]:id===local.id?local:remotes.find(p=>p.id===id);
        if(!actor){ball.visible=false;continue;}
        const spot=volleyballServiceSpot(court,server);
        const direction=sideSign(side);
        ball.position.set(actor.x+.095,actor.y+1.24,actor.z-direction*.40);
        if(member?.index===index && member.slot===server){
          marker.visible=true;
          marker.scale.setScalar(1);
          marker.position.set(spot.x,sandHeight(spot.x,spot.z)+.041,spot.z);
        }
      }else if(game.drop){
        const drop=game.drop,elapsed=Math.max(0,(tick-drop.tick)/30);
        const low=sandHeight(drop.x,drop.z)+ballRadius;
        const offset=Math.min(.27,elapsed*.6);
        const bounce=.31*Math.abs(Math.sin(elapsed*10))*Math.exp(-elapsed*3);
        ball.position.set(drop.x,Math.max(low+bounce,drop.y-6.6*elapsed*elapsed),drop.z+offset);
        ball.rotation.x+=dt*6*Math.exp(-elapsed*3);
      }else ball.visible=false;
    }
  };
}

const mix=THREE.MathUtils.lerp,clamp=THREE.MathUtils.clamp;
export function poseVolleyball(avatar,actor,member,tick){
  const {state:game,court,slot}=member;
  for(const tool of avatar.tools)tool.visible=false;
  const swing=game.swings[slot],elapsed=tick-swing?.tick,age=elapsed/30;
  const spike=swing?.kind==='spike' && elapsed>=0 && elapsed<spikeWindup+spikeRecovery;
  const arc=spike ? elapsed<spikeWindup ? (elapsed-spikeWindup)/spikeWindup : (elapsed-spikeWindup)/spikeRecovery : 1;
  const jump=Math.max(0,1-arc*arc);
  const activity=spike?jump:age>=0 && age<.54?Math.sin(Math.PI*clamp(age/.54+.10,0,1))**.7:0;
  const serving=game.phase==='serve' && game.server===slot;
  const moving=actor.moving && activity<.2;
  const {x,z,y}=game.flight?sampleVolleyball(game.flight,tick):{x:court.x,z:court.z,y:actor.y+1.48};
  const target=activity>.2?swing:{x,z};
  if(!moving && (Math.hypot(target.x-actor.x,target.z-actor.z)>.15)){
    const yaw=Math.atan2(actor.x-target.x,actor.z-target.z);
    const turn=Math.atan2(Math.sin(yaw-avatar.root.rotation.y),Math.cos(yaw-avatar.root.rotation.y));
    avatar.root.rotation.y+=turn*.74;
  }
  avatar.head.rotation.x=clamp(-Math.atan2(y-actor.y-1.56,Math.max(.4,Math.hypot(x-actor.x,z-actor.z))),-.67,.33);
  const ready=moving?.52:1;
  avatar.spine.rotation.x+=ready*(-.12+.10*activity);
  avatar.spine.rotation.y+=swing?.kind==='serve'?activity*.37:0;
  const dig=swing?.kind==='dig' ? activity : 0;
  const hit=spike ? clamp((elapsed-spikeWindup)/spikeRecovery,0,1):0;
  if(dig){avatar.body.position.y-=.31*dig;avatar.spine.rotation.x-=.30*dig;}
  if(spike){
    avatar.root.position.y+=.76*jump;
    avatar.spine.rotation.x+=(.16-.68*hit)*jump;
    avatar.spine.rotation.y+=(.34-.86*hit)*jump;
  }
  for(const {arm,forearm,leg,knee,ankle,side} of avatar.limbs){
    let raise=serving?1.10:.60,spread=side*(serving?-.21:.10),elbow=serving?.87:.49;
    if(activity){
      if(swing.kind==='serve'){
        raise=mix(raise,side===1?2.87:1.41,activity);
        spread=mix(spread,side===1?.30:-.24,activity);
        elbow=mix(elbow,.20,activity);
      }else if(dig){
        raise=mix(raise,.86,dig);spread=mix(spread,-side*.31,dig);elbow=mix(elbow,.03,dig);
        leg.rotation.x=mix(leg.rotation.x,.84+side*.12,dig);
        leg.rotation.z=mix(leg.rotation.z,side*.18,dig);
        knee.rotation.x=mix(knee.rotation.x,-1.45,dig);
        ankle.rotation.x=-leg.rotation.x-knee.rotation.x;
      }else if(spike){
        const hittingArm=side===1;
        raise=mix(raise,hittingArm?3.08-2.24*hit:2.16-1.20*hit,jump);
        spread=mix(spread,hittingArm?.24-.48*hit:-.32,jump);
        elbow=mix(elbow,hittingArm?Math.abs(arc)*1.08:.44,jump);
        leg.rotation.x=mix(leg.rotation.x,hittingArm?.44:.25,jump);
        knee.rotation.x=mix(knee.rotation.x,hittingArm?-1.03:-.62,jump);
      }else{
        raise=mix(raise,1.82,activity);spread=mix(spread,-side*.36,activity);
        elbow=mix(elbow,.11,activity);
      }
    }
    arm.rotation.set(mix(arm.rotation.x,raise,ready),0,mix(arm.rotation.z,spread,ready));
    forearm.rotation.set(mix(forearm.rotation.x,elbow,ready),0,0);
  }
}
