import * as THREE from 'three';
import {barMenu,beachClubFixtures,clubDeck,loungeDeck,pourTicks,glassTicks} from './beach-club.js';
import {skyDarkness} from './road-lighting.js';

export function addBeachClub(scene,Batch){
  const root=new THREE.Group();root.name='Harbor Key Beach Club';scene.add(root);
  const timber=new Batch(),lights=new Batch(),cube=new THREE.BoxGeometry(),tube=new THREE.CylinderGeometry(1,1,1,16);
  const orb=new THREE.SphereGeometry(1,10,8),y=clubDeck.y;
  const rect=(color,x,h,z,w,height,d,rx=0,ry=0,rz=0)=>timber.add(cube,color,x,y+h,z,w,height,d,rx,ry,rz);
  const round=(color,x,h,z,r,height)=>timber.add(tube,color,x,y+h,z,r,height,r);
  const teak=[0xbe9066,0xc89d72,0xb38a65,0xc69a72];
  for(const deck of [clubDeck,loungeDeck]){
    rect(0x795b45,deck.x,-.20,deck.z,deck.w,.37,deck.d);
    const boards=Math.ceil(deck.w/.24);
    for(let i=0;i<boards;i++)
      rect(teak[i%4],deck.x-deck.w/2+(i+.5)*deck.w/boards,-.012,deck.z,deck.w/boards-.009,.024,deck.d);
  }
  const colors={lightPost:0xb39168,counter:0x287970,return:0x287970,shelf:0x73533e,post:0xc7b08b,booth:0x274a4c,speaker:0x343638,chair:0xe8d7b4};
  for(const p of beachClubFixtures){
    if(p.kind==='awning'){
      for(let i=0;i<15;i++){
        const z=p.z-p.d/2+(i+.5)*p.d/15,c=i%2?0xffe8c8:0xc86955;
        rect(c,p.x,2.94,z,p.w,.085,p.d/15+.006,0,0,-.036);
        for(const side of [-1,1])rect(c,p.x+side*(p.w/2-.025),2.81-side*.065,z,.057,.22,p.d/15+.006);
      }
      continue;
    }
    if(p.kind==='cabana'){
      for(let i=0;i<12;i++){
        const along=(i+.5)/12;
        const dip=.09*Math.sin(along*Math.PI);
        rect(i%2?0xeee1c9:0xaecbc0,p.x,2.64-dip,p.z+(along-.5)*p.d,p.w,.049,p.d/12+.013,.068*Math.cos(along*Math.PI));
      }
      for(const side of [-1,1])rect(0xaf916b,p.x+side*1.45,2.49,p.z,.09,.10,p.d);
      continue;
    }
    if(p.kind==='table'){
      round(0x84654e,p.x,.25,p.z,.055,.50);
      round(0xf1dfba,p.x,.52,p.z,.173,.05);
      round(0xb27c64,p.x,.60,p.z,.052,.1);
      continue;
    }
    const chair=p.kind==='chair';
    rect(colors[p.kind],p.x,chair?.36:p.h/2,p.z,p.w,chair?.14:p.h,p.d);
    if(chair){
      rect(0xab6854,p.x-.36,.64,p.z,.12,.58,p.d,0,0,.16);
      for(const dx of [-.31,.31])for(const dz of [-.27,.27])rect(0x906b4b,p.x+dx,.16,p.z+dz,.07,.32,.07);
      for(const dz of [-.35,.35])rect(0xb58c66,p.x,.55,p.z+dz,.69,.07,.065);
    }
    if(p.kind==='counter' || p.kind==='return'){
      rect(0xeee0c5,p.x,1.035,p.z,p.w+.09,.085,p.d+.08);
      if(p.kind==='counter')for(let i=0;i<24;i++)rect(0x408a7d,p.x+p.w/2,.51,p.z-p.d/2+.08+i*.142,.032,.88,.054);
    }
    if(p.kind==='speaker')for(const h of [.44,1.01])timber.add(tube,0x171e22,p.x+.246,y+h,p.z,h<.5?.17:.105,.025,h<.5?.17:.105,0,0,Math.PI/2);
  }
  for(let i=0;i<11;i++){
    const z=-205.93+i*.267,x=40.61+(i%2)*.11;
    const c=[0x52988b,0xdfaa68,0x9b544c,0xb2bfb0][i%4];
    round(c,x,1.29,z,.066,.26);round(c,x,1.46,z,.032,.095);round(0xf3dbab,x,1.51,z,.034,.027);
  }
  // Turntables, platter rims, mixer faders and the DJ's headphone stand.
  rect(0x444349,47.85,1.029,-206.45,.60,.058,1.37);
  for(const dz of [-.43,.43]){
    round(0x9ea59e,47.85,1.07,-206.45+dz,.199,.037);
    round(0x23272b,47.85,1.092,-206.45+dz,.181,.018);
    round(0xd88667,47.85,1.106,-206.45+dz,.052,.012);
  }
  for(let i=0;i<5;i++)rect(0x98bbb0,47.66+i*.086,1.074,-206.46+(i%2)*.06,.033,.026,.12);
  for(const z of [-207.13,-201.99]){

    const end=43.5,span=55.85-end, sag=t=>3.08-.44*Math.sin(t*Math.PI);
    for(let i=0;i<14;i++){
      const a=i/14,b=(i+1)/14,x=end+span*b;
      timber.beam(0x4b473d,[end+span*a,y+sag(a),z],[x,y+sag(b),z],.019);
      rect(0x554a3f,x,sag(b)-.055,z,.035,.11,.035);
      lights.add(orb,0xffc777,x,y+sag(b)-.14,z,.065,.084,.065);
    }
  }
  function plaque(name,sub,x,h,z,w,angle){
    rect(0x345e54,x-.032*Math.sin(angle),h,z-.032*Math.cos(angle),w+.055,w/4+.055,.055,0,angle);
    for(const side of [-1,1])rect(0x746347,x+side*w*.38*Math.cos(angle),h+w/8+.09,z-side*w*.38*Math.sin(angle),.018,.20,.018);
    const cv=document.createElement('canvas');cv.width=768;cv.height=192;
    const ctx=cv.getContext('2d');ctx.fillStyle='#185552';ctx.fillRect(0,0,768,192);
    ctx.strokeStyle='#e1bc83';ctx.lineWidth=4;ctx.strokeRect(10,10,748,172);
    ctx.fillStyle='#ffeacb';ctx.textAlign='center';ctx.font='bold 64px Georgia';ctx.fillText(name,384,93);
    ctx.font='bold 33px sans-serif';ctx.fillText(sub,384,148);
    const map=new THREE.CanvasTexture(cv);map.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,w/4),new THREE.MeshBasicMaterial({map}));
    mesh.position.set(x,y+h,z);mesh.rotation.y=angle;root.add(mesh);
  }
  plaque('HARBOR KEY','B E A C H   C L U B',40.14,2.35,-204.55,3.35,-Math.PI/2);
  plaque('MARISOL’S','LIME SODA   •   HOUSE PUNCH',43.91,2.38,-204.55,3.25,Math.PI/2);
  plaque('HARBOR KEY','B E A C H   C L U B',42.06,2.39,-202.08,2.9,0);
  timber.mesh(root,new THREE.MeshLambertMaterial({vertexColors:true})).userData.impactSurface='wood';
  const bulbs=new THREE.MeshLambertMaterial({vertexColors:true,emissive:0xffaf64});
  lights.mesh(root,bulbs,false);
  const cups=barMenu.map(d=>{
    const parts=new Batch();
    parts.add(tube,0xffedd1,0,.02,0,.074,.04,.074);
    parts.add(tube,d.color,0,.115,0,.072,.18,.072);
    parts.add(tube,0xffebcc,0,.210,0,.076,.012,.076);
    parts.add(tube,0xeaddc3,.024,.24,.008,.009,.12,.009,.11);
    parts.add(orb,0x84a354,-.054,.217,.018,.044,.042,.012);
    const mesh=parts.mesh(root,new THREE.MeshLambertMaterial({vertexColors:true}),false);
    mesh.position.set(43.48,y+1.082,d.z);mesh.visible=false;return mesh;
  });
  cube.dispose();tube.dispose();orb.dispose();
  return (local,remotes,tick)=>{
    bulbs.emissiveIntensity=.12+1.5*skyDarkness.value;
    for(const [i,d] of barMenu.entries())cups[i].visible=[local,...remotes].some(p=>p.beachOrder?.drink===d.id &&
      tick-p.beachOrder.tick>=pourTicks && tick-p.beachOrder.tick<glassTicks);
  };
}
