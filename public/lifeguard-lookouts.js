import * as THREE from 'three';
import {stations, sandHeight, lookoutSteps, rescueCanopies, canopyHeight} from './beach-layout.js';

export function addLookouts(scene,Batch,makeRig) {
  const grain=new THREE.TextureLoader().load('./sawn-timber.webp');grain.colorSpace=THREE.SRGBColorSpace;
  const woodMaterial=new THREE.MeshLambertMaterial({map:grain,vertexColors:true});
  const trimMaterial=new THREE.MeshLambertMaterial({vertexColors:true});
  const box = new THREE.BoxGeometry();
  box.setAttribute('batchUv',box.attributes.uv);
  const ring = new THREE.TorusGeometry(.205,.046,10,48);
  const wrap = new THREE.TorusGeometry(.205,.05,8,9,.30);
  for(const {x,z,number} of stations) {
    const y=sandHeight(x,z), aqua=number==='01';
    const paint=aqua?0x298e95:0xd75b56, pale=aqua?0x76d5c4:0xf4a26c;
    const accent=aqua?0xf29a79:0x31878e, ivory=0xf8eacb;
    const parts=makeRig(number,x,y,z,true);
    const lumber=new Batch(true),trim=new Batch();
    const timber=(color,dx,dy,dz,w,h,d,...rot)=>lumber.add(box,color,x+dx,y+dy,z+dz,w,h,d,...rot);
    const piece=(color,dx,dy,dz,w,h,d,...rot)=>trim.add(box,color,x+dx,y+dy,z+dz,w,h,d,...rot);
    const brace=(color,a,b,w,d=w)=>trim.beam(color,[x+a[0],y+a[1],z+a[2]],[x+b[0],y+b[1],z+b[2]],w,d);
    const boards=[0xc4b39a,0xcabca2,0xae9c80,0xc7b99f];
    // Splayed piles, crossed storm bracing and joists beneath the slatted deck.
    for(const side of [-1,1]) {
      for(const end of [-1,1]) {
        const dx=side*1.18,dz=end*1.25;
        brace(0x958777,[dx,sandHeight(x+dx,z+dz)-y-.11,dz],[side*1.04,1.38,end*1.12],.145,.16);
      }
      brace(0xa28c70,[-1.13,.18,side*1.20],[1.03,1.21,side*1.13],.085,.09);
      brace(0xa28c70,[1.13,.18,side*1.20],[-1.03,1.21,side*1.13],.085,.09);
      timber(0x9d8c75,0,1.26,side*1.12,2.74,.18,.14);
    }
    for(let i=0;i<15;i++) timber(boards[i%4],-.99+i*.172,1.395,0,.163,.09,2.68);
    // Low beadboard walls leave open sightlines from the swivel seat toward the sea.
    for(let i=0;i<6;i++){
      const h=1.51+i*.109;
      const band=[paint,paint,pale,ivory,accent,pale][i];
      for(const side of [-1,1]) timber(band,-.12,h,side*1.12,1.72,.102,.075);
      timber(band,-.94,h,-.73,.076,.102,.76);
    }
    for(const side of [-1,1]){
      for(const dx of [-.94,.69]){
        const top=canopyHeight(number,dx)-.036;
        timber(ivory,dx,(1.42+top)/2,side*1.12,.105,top-1.42,.105);
      }
      timber(0xeee2bd,-.13,2.16,side*1.12,1.82,.097,.15);
      const end=side*1.26;
      for(const dx of [.81,1.39]) timber(0xe1d9bf,dx,1.91,end,.075,.93,.075);
      for(const dy of [1.92,2.35]) timber(0xe8debd,1.08,dy,end,.72,.065,.078);
    }
    for(const dy of [1.92,2.35]) timber(0xe8debd,1.39,dy,0,.075,.068,2.59);
    // One station curls up toward the water, the other has a folded butterfly roof.
    // Sandwich the dark shadow line between the pastel underside and white fascia.
    const profile=rescueCanopies[number];
    for(let i=1;i<profile.length;i++){
      const [ax,ay]=profile[i-1], [bx,by]=profile[i];
      const dx=(ax+bx)/2, dy=(ay+by)/2;
      const width=Math.hypot(bx-ax,by-ay)+.015, slope=Math.atan2(by-ay,bx-ax);
      piece(pale,dx,dy-.03,0,width,.07,3.04,0,0,slope);
      piece(ivory,dx,dy+.037,0,width,.075,3.10,0,0,slope);
      for(const side of [-1,1]){
        piece(paint,dx,dy-.01,side*1.55,width,.065,.045,0,0,slope);
        piece(ivory,dx,dy+.052,side*1.55,width,.048,.053,0,0,slope);
      }
    }
    for(const side of [-1,1]){
      brace(accent,[.69,2.86,side*1.12],[1.30,canopyHeight(number,1.30)-.07,side*1.12],.064);
    }
    // The west stair enters through a gap in the back wall.
    for(const side of [-1,1]) {
      brace(0x948269,[-2.60,.07,side*.405],[-.99,1.39,side*.405],.094,.11);
      brace(0xeee3c2,[-2.55,.94,side*.46],[-1.03,2.26,side*.46],.074);
      for(const [dx,h] of [[-2.55,.11],[-1.05,1.35]]) timber(0xc4b298,dx,h+.43,side*.46,.083,.86,.083);
    }
    for(const [i,tread] of lookoutSteps.entries()) timber(boards[i%4],tread.x,tread.h-.042,0,.292,.084,.94);
    // Slatted seat and backrest, facing east into the bay.
    for(const side of [-1,1]) {
      for(const dx of [-.29,.10]) piece(0x737d79,dx,1.70,side*.24,.049,.53,.049);
      piece(0xece6cb,-.28,2.11,side*.26,.065,.65,.065,0,0,-.12);
      piece(0xd8b897,-.04,2.10,side*.30,.51,.055,.065);
    }
    for(let i=0;i<4;i++) timber(0xe8d9b7,-.22+i*.104,1.97,0,.095,.055,.58);
    for(let i=0;i<3;i++) timber(0xe8d9b7,-.31-i*.012,2.13+i*.099,0,.05,.08,.56);
    // Flotation ring hangs on the southern wall, beneath the lookout number.
    trim.add(ring,0xec613d,x+.38,y+1.81,z+1.208,1,1,1);
    for(let j=0;j<4;j++)trim.add(wrap,0xffecd0,x+.38,y+1.81,z+1.208,1,1,1,0,0,j*Math.PI/2);
    const plate=document.createElement('canvas');plate.width=640;plate.height=190;
    const ink=plate.getContext('2d');ink.fillStyle='#f2e6c6';ink.fillRect(0,0,640,190);
    ink.fillStyle='#27565a';ink.fillRect(6,6,628,178);ink.fillStyle='#f4ecd5';
    ink.textAlign='center';ink.font='bold 83px sans-serif';ink.fillText('RESCUE '+number,320,97);
    ink.font='bold 33px sans-serif';ink.fillText('H A R B O R   K E Y',320,151);
    const map=new THREE.CanvasTexture(plate);map.colorSpace=THREE.SRGBColorSpace;
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(.98,.30),new THREE.MeshLambertMaterial({map}));
    sign.position.set(x-.42,y+1.90,z+1.173);parts.add(sign);
    lumber.mesh(parts,woodMaterial).userData.impactSurface='wood';
    trim.mesh(parts,trimMaterial).userData.impactSurface='solid';
  }
  box.dispose();ring.dispose();wrap.dispose();
}
