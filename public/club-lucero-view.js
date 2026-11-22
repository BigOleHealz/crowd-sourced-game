import * as THREE from 'three';
import {club,clubFixtures,clubPoint,clubCast} from './club-lucero.js';

export function clubInterior(scene,Batch){
  const root=new THREE.Group();root.name='Club Lucero';root.position.set(club.x,club.floor,club.z);root.rotation.y=club.yaw;scene.add(root);
  const b=new Batch(),cube=new THREE.BoxGeometry(),drum=new THREE.CylinderGeometry(1,1,1,18);
  const rect=(c,u,y,v,w,h,d)=>b.add(cube,c,u,y,v,w,h,d);
  const cylinder=(c,u,y,v,r,h)=>b.add(drum,c,u,y,v,r,h,r);
  for(const p of clubFixtures)b.add(cube,p.color,p.u,(p.bottom+p.h)/2,p.v,p.w,p.h-p.bottom,p.d);
  rect(0x534341,0,.009,0,8.6,.018,9.62);
  // Fluted velvet, warm footlights, stage monitors and a stepped brass proscenium.
  for(let i=0;i<37;i++){
    const u=(i-18)*.226;rect(i%3===0?0x813c59:0x602e4e,u,1.86,-4.69,.20,3.29,.11+.065*Math.cos(i*1.3));
  }
  for(const side of [-1,1]){
    for(let i=0;i<3;i++)rect(0xb59063,side*(3.55-i*.09),1.77,-3.94,.048,3.45-i*.17,.07);
    for(const v of [-2.14,2.32])rect(0x583342,side*3.48,.68,v,1.15,1.33,.10);
    rect(0x38323a,side*2.94,.62,-3.02,.55,.68,.44);
    for(const y of [.47,.73])b.add(drum,0x292730,side*2.94,y,-2.788,.155,.02,.155,Math.PI/2);
    for(const v of [-.94,1.06]){
      for(const k of [-1,0,1])rect(0xa36269,side*3.63,.83,v+k*.51,.07,.48,.44);
      cylinder(0x755c47,side*2.62,.37,v,.055,.70);
      cylinder(0xac8b6c,side*2.62,.73,v,.30,.055);
      cylinder(0xd49669,side*2.62,.85,v,.065,.17);
    }
    for(let i=0;i<4;i++)rect(0xd69c85,side*4.21,1.40+i*.34,0,.038,.024,8.53);
    rect(0x763c54,side*1.11,1.29,4.87,.13,2.58,.19);
  }
  // Track cans, overlapping trim, padded booth corners and entrance marquee.
  for(const side of [-1,1]){
    for(const v of [-3.68,-1.35]){
      b.add(drum,0x36343a,side*2.24,3.14,v,.16,.28,.16,.30);
      b.add(drum,side<0?0xf0b587:0xe39fba,side*2.24,2.99,v+.055,.139,.024,.139,.30);
    }
    for(const v of [-1.0,1.0]){
      for(let j=-3;j<=3;j++)rect(j%2?0xb16b72:0x975762,side*3.655,.77,v+j*.227,.082,.57,.18);
    }
    for(let j=0;j<8;j++)rect(0xb79a79,side*(1.35+j*.37),.41,4.946,.035,.81,.05);
    rect(0x9b805e,side*2.54,2.02,4.948,.16,.79,.13);
    rect(0xffcd8b,side*2.54,2.02,5.02,.081,.66,.03);
  }
  for(let j=0;j<15;j++)rect(0xa89378,-4.05+j*.575,2.59,5.07,.027,.042,.45);
  rect(0x745369,0,2.65,5.13,8.66,.12,.67);
  for(let i=0;i<12;i++)cylinder(0xe7af84,-2.97+i*.54,.285,-2.19,.052,.026);
  for(let i=0;i<3;i++)rect(0xc09782,0,3.43+i*.17,4.99,6.3-i*.3,.036,.21);
  const paint=document.createElement('canvas');paint.width=768;paint.height=144;
  const ctx=paint.getContext('2d');ctx.fillStyle='#382538';ctx.fillRect(0,0,768,144);ctx.strokeStyle='#c49875';ctx.lineWidth=2;ctx.strokeRect(9,8,750,128);
  ctx.fillStyle='#ffdfc2';ctx.textAlign='center';ctx.font='62px Georgia';ctx.fillText('CLUB LUCERO',384,79);
  ctx.font='19px sans-serif';ctx.fillText('L I V E   C A B A R E T     •     2 1 +',384,113);
  const map=new THREE.CanvasTexture(paint);map.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(4.28,.8),new THREE.MeshBasicMaterial({map}));sign.position.set(0,3.07,5.04);root.add(sign);
  // Project the photographed wood/limestone grain onto the batch. Three wide
  // stage washes and the entrance sconces are baked into this one material.
  const grain=new THREE.TextureLoader().load('./storefront-oak.webp');
  grain.colorSpace=THREE.SRGBColorSpace;grain.wrapS=grain.wrapT=THREE.RepeatWrapping;
  const mat=new THREE.MeshLambertMaterial({vertexColors:true});
  mat.onBeforeCompile=shader=>{
    shader.uniforms.luceroGrain={value:grain};
    shader.vertexShader='varying vec3 clubPosition,clubNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nclubPosition=position;clubNormal=normal;');
    shader.fragmentShader='uniform sampler2D luceroGrain;varying vec3 clubPosition,clubNormal;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 pos=clubPosition,n=normalize(clubNormal);
      vec2 uv=abs(n.y)>.64?pos.xz:(abs(n.x)>.55?pos.zy:pos.xy);
      vec3 g=texture2D(luceroGrain,uv/vec2(2.1,1.35)).rgb;
      outgoingLight*=mix(vec3(.73),vec3(1.26),clamp(g*1.65,0.,1.));
      float interior=1.-smoothstep(4.65,4.91,pos.z);
      float stage=exp(-.43*abs(pos.z+3.55));
      float rose=exp(-.37*pow(pos.x-1.65,2.))*stage;
      float gold=exp(-.43*pow(pos.x+1.85,2.))*stage;
      float booth=exp(-1.22*abs(abs(pos.x)-3.32))*exp(-.48*abs(pos.y-.71));
      outgoingLight+=interior*diffuseColor.rgb*(vec3(1.22,.28,.49)*rose+vec3(1.12,.65,.31)*gold+vec3(.78,.32,.25)*booth+.10);
      float sconces=exp(-2.1*abs(abs(pos.x)-2.54)-1.56*abs(pos.y-2.03));
      outgoingLight+=(1.-interior)*sconces*vec3(.43,.24,.10);
      #include <opaque_fragment>`);
  };
  b.mesh(root,mat,false);
  cube.dispose();drum.dispose();
}

export function castForAudience(local,remotes,simTick){
  if(Math.hypot(local.x-club.x,local.z-club.z)>22)return [];
  const guest=[local,...remotes].find(p=>p.clubSince!=null);
  // The host walks from the stage to the booth at the same point in the
  // performance for all observers, including a guest who joins mid-song.
  const travel=guest?Math.min(1,Math.max(0,(simTick-guest.clubSince)/72)):0;
  const fraction=travel*travel*(3-2*travel);
  const booth=clubPoint(-1.47,1.02);
  return clubCast.map((p,i)=>({...p,...(i===1 && guest?{
    x:p.x+(booth.x-p.x)*fraction,y:p.y-.27*Math.min(1,fraction*2),
    z:p.z+(booth.z-p.z)*fraction,moving:travel>0 && travel<1}:{}),
    yaw:(i===1 && guest?-Math.PI/2:Math.PI)-club.yaw,grounded:true,hp:100,performer:i+1}));
}
export function poseCabaret(actor,state,t){
  const beat=t*(Math.PI*2*96/60),v=beat+(state.performer===2?1.3:0);
  for(const kit of actor.tools)kit.visible=false;
  if(state.clubSince!=null){
    actor.body.position.y=-.38;actor.spine.rotation.x=.06;
    for(const {leg,knee,arm,forearm,side} of actor.limbs){
      leg.rotation.set(1.39,0,side*.07);knee.rotation.set(-1.52,0,0);
      arm.rotation.set(.18,0,side*.09);forearm.rotation.set(.76,0,0);
    }
    return;
  }
  actor.body.position.y=.017*Math.cos(v*2);actor.spine.rotation.y=.12*Math.sin(v*.5);
  actor.head.rotation.z=.043*Math.sin(v*.5);
  for(const {side,leg,knee,arm,forearm} of actor.limbs){
    const phase=v+(side>0?Math.PI:0);
    leg.rotation.set(.07*Math.sin(phase),0,.032*side);knee.rotation.x=-.07*(1+Math.sin(phase));
    arm.rotation.set(.26+.23*Math.cos(phase*.5),side*.16,side*(.38+.28*Math.sin(v*.5)));
    forearm.rotation.set(.68+.32*Math.sin(phase*.5),side*.14,0);
  }
}
