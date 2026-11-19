import {furnitureRanges} from './shop-furniture-view.js';
import {furnitureId} from './shop-furniture.js';
import * as THREE from 'three';
import {cafePieces,storefrontFloor, diningTables, benchTables, planters} from './storefront-layout.js';

// Both rooms are built from the curb elevation up. The entrance, aisles, furniture
// and rear work surfaces are in world metres and use the same scale as the player.
export function buildStorefrontRooms(scene,Batch,texture,stone) {
  const objects=new Batch(), joinery=new Batch(true), plaster=new Batch(true);
  const motion=furnitureRanges(scene,[objects,joinery]);
  const begin=(x,z)=>motion.start(cafePieces.get(furnitureId('cafe',x,z)));
  const box=new THREE.BoxGeometry(), cylinder=new THREE.CylinderGeometry(1,1,1,16);
  const oval=new THREE.SphereGeometry(1,12,8);
  const foot=storefrontFloor;
  const solid=(color,x,y,z,w,h,d)=>objects.add(box,color,x,y,z,w,h,d);
  const round=(color,x,y,z,r,h,rZ=r)=>objects.add(cylinder,color,x,y,z,r,h,rZ);
  const sphere=(color,x,y,z,w,h,d,tilt=0)=>objects.add(oval,color,x,y,z,w,h,d,0,0,tilt);
  function finishBox(batch,color,x,y,z,w,h,d,rx=0){
    const uv=box.attributes.uv.clone(),normal=box.attributes.normal;
    for(let i=0;i<uv.count;i++){
      const end=Math.abs(normal.getX(i))>.5,top=Math.abs(normal.getY(i))>.5;
      uv.setXY(i,(end?d:w)*uv.getX(i)/.63+z*.71,(top?d:h)*uv.getY(i)/1.6+x*.24);
    }
    box.setAttribute('batchUv',uv);
    batch.add(box,color,x,y,z,w,h,d,rx);
  }
  const timber=(...v)=>finishBox(joinery,...v);
  const mineral=(...v)=>finishBox(plaster,...v);
  // Close the ends of the enlarged cavity all the way to the old exterior footprint.
  for(const z of [-1.95,15.95]){
    stone(0xcbbda7,-13.07,2.75,z,7.16,3.90,.13);
    mineral(0xd8c5a6,-13.07,2.28,z+(z>0?-.09:.09),7.1,2.91,.075);
  }
  mineral(0xcebfa4,-13.08,2.35,2.41,7.06,3.05,.17);
  mineral(0xe1d0b2,-16.57,2.33,7,.11,3.1,17.84);
  mineral(0xcaad8d,-13.10,3.83,7,7.08,.18,17.88);
  // The deep perimeter beam and front soffit seal the slab from upstairs.
  solid(0xa69781,-13.08,4.30,7,7.16,.82,17.98);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(7.12,17.98).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({map:texture('./storefront-floor.webp'),color:0xc6bdaa}));
  floor.position.set(-13.06,foot,7);floor.userData.impactSurface='solid';scene.add(floor);
  for(const z of [-1.83,2.29,2.52,15.83]) solid(0x8e7660,-13.02,.895,z,7.0,.14,.074);

  const walnut=0x815a3d, oak=0xc09668, brass=0x857147, enamel=0xe8e0cc, rubber=0x373a34;
  const coffee=0x513925, clay=0xbd7350;
  // A bentwood chair has a ring seat, splayed legs, a curved back and a lower stretcher.
  // The back follows a real arc, so it reads edge-on through the shop window.
  function chair(x,z,side) {
    const marker=begin(x,z);
    round(walnut,x,1.265,z,.218,.045,.205);
    round(0xb79869,x,1.293,z,.194,.018,.178);
    const localZ=dz=>z+side*dz;
    for(const sx of [-1,1]) for(const sz of [-1,1])
      objects.beam(walnut,[x+.158*sx,foot,localZ(sz*.16)],[x+.132*sx,1.25,localZ(sz*.126)],.033);
    for(const sx of [-1,1]){
      objects.beam(oak,[x+sx*.15,1.215,localZ(.132)],[x+sx*.185,1.592,localZ(.16)],.036);
      objects.beam(walnut,[x+sx*.145,1.005,localZ(-.14)],[x+sx*.145,1.005,localZ(.145)],.022);
    }
    for(let i=0;i<6;i++){
      const segment=t=>[x+.194*Math.sin(t),1.60+.021*Math.cos(t),localZ(.119+.095*Math.cos(t))];
      const a=segment((i/6-.5)*2.55),b=segment(((i+1)/6-.5)*2.55);
      objects.beam(oak,a,b,.070,.032);
    }
    motion.end(marker);
  }
  function cup(x,y,z) {
    const ceramic=new THREE.CylinderGeometry(.046,.032,.061,10);
    objects.add(ceramic,enamel,x,y+.03,z);ceramic.dispose();
    round(coffee,x,y+.061,z,.038,.004);
    round(0xd1c6ab,x,y+.003,z,.064,.009,.06);
  }
  function table(x,z,bench=false) {
    const marker=begin(x,z);
    round(0x514d43,x,foot+.023,z,.235,.044);
    round(brass,x,1.205,z,.049,.714);
    round(0x9d8059,x,1.552,z,.394,.048);
    round(0xe6d0a7,x,1.579,z,.397,.021);
    cup(x+.11,1.593,z-.085);
    motion.end(marker);
    if(!bench){chair(x,z+.545,1);chair(x,z-.545,-1);}
    else chair(x+.445,z+.19,1);
  }
  // Foreground dining and the rear upholstered banquette sit at separate depths.
  for(const [x,z] of diningTables) table(x,z);
  timber(walnut,-16.05,1.005,5.32,.81,.33,4.65);
  solid(0x717e66,-15.98,1.21,5.32,.79,.15,4.70);
  for(let i=0;i<12;i++) solid(i%2?0x849078:0x76816c,-16.30,1.47,3.205+.383*i,.14,.64,.369);
  for(const [x,z] of benchTables)table(x,z,true);

  // The dining wall pairs a low upholstered bench with a carved tropical-leaf panel.
  timber(walnut,-16.46,2.51,5.33,.12,1.29,2.61);
  mineral(0x55746d,-16.38,2.51,5.33,.055,1.19,2.51);
  for(let i=0;i<11;i++) {
    const pos=4.23+i*.22, height=.30+.46*(.5+.5*Math.sin(i*1.41));
    objects.beam(0xbca477,[-16.34,2.0,pos],[-16.34,2.0+height,pos+.135],.021);
    for(let j=0;j<4;j++) {
      const y=2.0+height*(.24+j*.17),z=pos+.135*(.24+j*.17);
      objects.beam(0xcdb684,[-16.337,y,z],[-16.337,y+.10+.03*j,z+.12],.024);
      objects.beam(0xb49a6d,[-16.337,y,z],[-16.337,y+.12,z-.075],.024);
    }
  }
  // Service island, pastry case and espresso equipment. Leave a staff aisle behind it.
  solid(rubber,-13.74,.89,11.54,.98,.13,5.74);
  timber(walnut,-13.73,1.342,11.54,1.03,.87,5.82);
  for(let i=0;i<47;i++)timber(i%4?0xac7951:0x966442,-13.18,1.32,8.70+i*.123,.075,.78,.078);
  mineral(0xe5cfac,-13.67,1.81,11.54,1.30,.10,5.96);
  solid(brass,-13.14,.985,11.54,.033,.031,5.71);
  const clearPanels=[];
  function pane(x,y,z,w,h,d) {clearPanels.push([x,y,z,w,h,d]);}
  // A fine edge frame and real transparent sheets around two levels of pastries.
  const caseX=-13.39, caseZ=12.77;
  for(const level of [1.90,2.12,2.37]) {
    if(level===1.90)timber(walnut,caseX,level,caseZ,.65,.032,2.26);
    else {
      pane(caseX,level,caseZ,.62,.012,2.19);
      for(const dx of [-.312,.312]) solid(brass,caseX+dx,level,caseZ,.023,.025,2.24);
    }
    if(level!==2.37)for(let i=0;i<7;i++){
      const z=caseZ-0.91+i*.30, x=caseX+(i%2?.065:-.07);
      sphere(level<2?0xc9914c:0xdfb16b,x,level+.065,z,.111,.057,.087);
      for(let j=-1;j<=1;j++)sphere(0xf0ca8b,x+.038*j,level+.103-Math.abs(j)*.01,z,.012,.011,.043,-.25);
    }
  }
  for(const dx of [-.312,.312])for(const dz of [-1.11,1.11])solid(brass,caseX+dx,2.13,caseZ+dz,.024,.48,.024);
  pane(caseX+.31,2.13,caseZ,.009,.46,2.22);
  for(const z of [caseZ-1.11,caseZ+1.11])pane(caseX,2.13,z,.63,.46,.009);
  const machineZ=9.91;
  solid(0x564c43,-13.75,1.91,machineZ,.44,.064,.85);
  solid(0x9e5541,-13.76,2.11,machineZ,.40,.30,.86);
  solid(0xc7c4ae,-13.49,2.22,machineZ,.19,.11,.85);
  for(const dz of [-.19,.18]){
    round(0x7c7766,-13.44,2.135,machineZ+dz,.049,.082);
    solid(rubber,-13.35,2.135,machineZ+dz,.15,.028,.04);
    cup(-13.47,1.956,machineZ+dz);
  }
  for(let i=0;i<3;i++)cup(-13.70,2.265,machineZ-.24+i*.19);
  solid(rubber,-13.69,1.966,8.98,.28,.17,.28);
  round(0x999883,-13.69,2.115,8.98,.085,.17);
  round(coffee,-13.69,2.27,8.98,.115,.15);
  round(rubber,-13.69,2.354,8.98,.122,.025);

  // Arched recesses at the back are cut out of a plaster face. Returned jambs,
  // shelves and vessels cast their own silhouettes inside the reveal.
  function niche(z) {
    const opening=new THREE.Shape();
    opening.moveTo(-1.02,0);opening.lineTo(-.78,0);opening.lineTo(-.78,.70);
    opening.absarc(0,.70,.78,Math.PI,0,true);opening.lineTo(.78,0);opening.lineTo(1.02,0);
    opening.lineTo(1.02,1.66);opening.lineTo(-1.02,1.66);opening.closePath();
    const shape=new THREE.ExtrudeGeometry(opening,{depth:.21,bevelEnabled:false,curveSegments:12});
    objects.add(shape,0xd6b48f,-16.32,1.76,z,1,1,1,0,Math.PI/2,0);shape.dispose();
    mineral(0xa4654b,-16.47,2.47,z,.11,1.73,1.86);
    for(const y of [2.07,2.49]) {
      timber(oak,-16.18,y,z,.40,.042,1.46);
      for(let i=0;i<4;i++){
        const cz=z-.52+i*.31;
        round(i%2?enamel:clay,-16.19,y+.116,cz,.055+(i%2)*.014,.19+(i%2)*.027);
        round(i%2?0xb09b76:coffee,-16.19,y+.22+(i%2)*.013,cz,.058+(i%2)*.014,.022);
      }
    }
  }
  timber(0x725337,-16.10,1.28,11.48,.74,.81,6.81);
  mineral(0xd3bfa1,-16.07,1.73,11.48,.86,.07,6.95);
  for(const z of [9.28,11.48,13.68])niche(z);

  // The return wall is visible through the south door and gives the counter a distinct end.
  const menuCanvas=document.createElement('canvas');menuCanvas.width=640;menuCanvas.height=384;
  const pen=menuCanvas.getContext('2d');
  pen.fillStyle='#283a35';pen.fillRect(0,0,640,384);
  pen.fillStyle='#dbc294';pen.font='24px Georgia, serif';pen.fillText('MANGLE',44,53);
  pen.font='46px Georgia, serif';pen.fillStyle='#eee3c9';pen.fillText('Café de la casa',42,120);
  pen.fillRect(43,140,553,2);pen.font='26px Georgia, serif';
  for(const [i,line] of ['Cortadito','Café con leche','Pan de guayaba','Pastel de queso'].entries()){
    pen.fillText(line,46,185+i*49);pen.fillText(['3.25','4.50','4.00','4.75'][i],525,185+i*49);
  }
  const menuMap=new THREE.CanvasTexture(menuCanvas);menuMap.colorSpace=THREE.SRGBColorSpace;
  timber(walnut,-14.69,2.60,15.78,1.75,1.07,.12);
  const menu=new THREE.Mesh(new THREE.PlaneGeometry(1.65,.97),new THREE.MeshBasicMaterial({map:menuMap,color:0xc1b396}));
  menu.rotation.y=Math.PI;menu.position.set(-14.69,2.60,15.711);scene.add(menu);

  // The concierge desk sits across a clear approach from the glazed entrance.
  timber(0xb18660,-16.43,2.23,.18,.18,2.78,3.95);
  for(let i=0;i<36;i++)timber(i%3?0x9e7956:0xaf8966,-16.29,2.24,-1.65+i*.103,.083,2.76,.054);
  solid(0x5b594e,-13.72,.92,.68,.82,.17,1.79);
  mineral(0xc8b59c,-13.67,1.35,.68,.88,.73,1.91);
  timber(walnut,-13.72,1.76,.68,1.01,.084,2.05);
  solid(rubber,-13.92,1.942,1.05,.050,.255,.316);
  for(const z of [-1.27,-.22]) {
    const marker=begin(-14.98,z);
    timber(walnut,-14.98,.96,z,.70,.18,.78);solid(0x7e8e81,-14.93,1.17,z,.69,.23,.75);
    solid(0x8e9b8a,-15.23,1.43,z,.16,.51,.75);
    motion.end(marker);
  }
  // Bronze address panel and grazing sconces reveal the depth of the party wall
  // through the lobby doors as a pedestrian approaches from the north.
  const directoryCanvas=document.createElement('canvas');directoryCanvas.width=384;directoryCanvas.height=472;
  const dir=directoryCanvas.getContext('2d');dir.fillStyle='#665747';dir.fillRect(0,0,384,472);
  dir.fillStyle='#f3e2c3';dir.textAlign='center';dir.font='98px Georgia, serif';dir.fillText('810',192,154);
  dir.fillRect(90,184,204,3);dir.font='27px Georgia, serif';dir.fillText('BRICKELL AVENUE',192,238);
  dir.font='19px sans-serif';dir.fillText('R E S I D E N C E S',192,283);
  dir.fillText('CONCIERGE',192,412);
  const directoryMap=new THREE.CanvasTexture(directoryCanvas);directoryMap.colorSpace=THREE.SRGBColorSpace;
  timber(walnut,-12.55,2.31,2.30,.84,1.01,.074);
  const directory=new THREE.Mesh(new THREE.PlaneGeometry(.79,.97),new THREE.MeshBasicMaterial({map:directoryMap,color:0xc2ac8c}));
  directory.rotation.y=Math.PI;directory.position.set(-12.55,2.31,2.253);scene.add(directory);
  for(const x of [-11.74,-13.39]){
    solid(brass,x,2.36,2.285,.09,.39,.10);
    round(0xc5a66d,x,2.38,2.201,.060,.235);
    round(0xffe1a5,x,2.39,2.20,.047,.296);
  }
  // Mail doors lining the north wall are visibly set behind the waiting area.
  solid(0x514e45,-12.85,2.12,-1.80,1.75,1.1,.10);
  for(let i=0;i<6;i++)for(let j=0;j<4;j++) {
    solid(0x9b9887,-13.57+i*.287,1.73+j*.253,-1.737,.266,.227,.042);
    solid(brass,-13.47+i*.287,1.72+j*.253,-1.708,.035,.017,.015);
  }
  // Coastal broadleaf plants, with curved blades and a raised central rib.
  const blade=new THREE.BufferGeometry();
  blade.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.15,.38,.045,0,.39,.105,.15,.38,.045,-.105,.78,.155,0,.78,.21,.105,.78,.155,0,1,.24],3));
  blade.setIndex([0,1,2,0,2,3,1,4,5,1,5,2,2,5,6,2,6,3,4,7,5,5,7,6]);blade.computeVertexNormals();
  function planter(x,z,size) {
    const pot=new THREE.CylinderGeometry(.22,.15,.43,16);
    objects.add(pot,clay,x,foot+.215*size,z,size,size,size);pot.dispose();
    round(0xb88960,x,foot+.41*size,z,.235*size,.06*size);
    round(0x554737,x,foot+.44*size,z,.204*size,.012*size);
    for(let i=0;i<14;i++) {
      const a=i*2.40, length=size*(.46+.32*(.5+.5*Math.sin(i*2.08)));
      const high=foot+size*(.63+.36*(.5+.5*Math.sin(i*1.44)));
      const tx=x+size*.14*Math.sin(a), tz=z+size*.14*Math.cos(a);
      objects.beam(0x637450,[x,foot+.435*size,z],[tx,high,tz],.013*size);
      objects.add(blade,[0x5c7656,0x78916a,0x46624a][i%3],tx,high,tz,length,length,length,.43+Math.sin(i)*.21,a,.12*Math.cos(i));
    }
  }
  for(const [x,z,s] of planters)planter(x,z,s);
  // Downturned terracotta and brass pendant shades carry a warm, luminous underside.
  const shade=new THREE.LatheGeometry([new THREE.Vector2(.020,.02),new THREE.Vector2(.045,-.025),new THREE.Vector2(.16,-.065),new THREE.Vector2(.25,-.13),new THREE.Vector2(.27,-.19)],20);
  const lamps=new Batch();
  function pendant(x,z,height,scale) {
    round(0x594e41,x,3.70,z,.069,.048);
    round(rubber,x,(3.68+height)/2,z,.009,3.68-height);
    objects.add(shade,clay,x,height,z,scale,scale,scale);
    lamps.add(cylinder,0xffe0a1,x,height-.19*scale,z,.257*scale,.012,.257*scale);
  }
  for(const z of [8.92,11.15,13.38])pendant(-13.56,z,3.10,1.05);
  for(const z of [4.48,6.51])pendant(-14.58,z,3.16,.88);
  pendant(-13.70,.67,3.15,1.21);
  // The exterior shadow map covers an entire district. Shade the rooms using the
  // actual window depth and pendant positions without allocating additional shadow maps.
  function surface(map=null){
    const material=new THREE.MeshBasicMaterial({vertexColors:true,map,side:THREE.DoubleSide});
    material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 roomPosition;varying vec3 roomNormal;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nroomPosition=(modelMatrix*vec4(position,1.)).xyz; roomNormal=normalize(mat3(modelMatrix)*normal);');
      shader.fragmentShader='varying vec3 roomPosition;varying vec3 roomNormal;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
        #include <color_fragment>
        vec3 p=roomPosition,n=normalize(roomNormal);
        vec3 daylight=normalize(vec3(1.,.38,.29));
        float depth=clamp((-9.51-p.x)/7.1,0.,1.);
        float exterior=(.16+.54*max(dot(n,daylight),0.))*exp(-2.15*depth);
        float staff=clamp(floor((p.z-8.92)/2.23+.5),0.,2.);
        vec3 lamp=p.z<2.41 ? vec3(-13.70,3.12,.67) :
          p.z<7.45 ? vec3(-14.58,3.10,p.z<5.52?4.48:6.51) : vec3(-13.56,3.03,8.92+2.23*staff);
        vec3 toLamp=lamp-p;
        float diffuse=max(dot(n,normalize(toLamp)),0.);
        float light=(.21+.8*diffuse)*smoothstep(-.22,.38,toLamp.y)/(1.+.63*dot(toLamp,toLamp));
        float rear=(p.z>2.42?1.:.6)*exp(-3.*abs(p.x+16.42))*.30*
          (.15+.85*pow(max(0.,cos((p.z-9.28)*2.856)),2.))*exp(-2.8*abs(p.y-2.63));
        if(p.z<2.33)rear+=.19*exp(-2.5*abs(p.z-2.27))*exp(-5.*min(abs(p.x+11.74),abs(p.x+13.39)))*exp(-1.7*abs(p.y-2.4));
        float corners=.80+.20*smoothstep(.03,.38,min(p.y-.824,min(abs(p.z-2.41),abs(p.x+16.56))));
        vec3 lit=(vec3(.205,.195,.178)+vec3(.94,.99,1.03)*exterior+
          vec3(1.,.67,.37)*(light+rear))*corners;
        float glint=pow(max(dot(n,normalize(normalize(toLamp)+normalize(cameraPosition-p))),0.),22.);
        diffuseColor.rgb=diffuseColor.rgb*lit+vec3(.12,.087,.052)*light*glint;
      `);
    };
    return material;
  }
  const furnishings=objects.mesh(scene,surface(),false);
  const oakMap=texture('./storefront-oak.webp');oakMap.wrapS=oakMap.wrapT=THREE.RepeatWrapping;
  motion.bind([furnishings,joinery.mesh(scene,surface(oakMap),false)]);
  const plasterMap=texture('./avenue-limestone.webp');plasterMap.wrapS=plasterMap.wrapT=THREE.RepeatWrapping;
  plaster.mesh(scene,surface(plasterMap),false);
  lamps.mesh(scene,new THREE.MeshBasicMaterial({vertexColors:true}),false);
  // One extra transparent batch covers the pastry case.
  const panels=new Batch();for(const p of clearPanels)panels.add(box,0xffffff,...p);
  const glazing=panels.mesh(scene,new THREE.MeshBasicMaterial({color:0xc3e1dc,transparent:true,opacity:.13,depthWrite:false}),false);
  glazing.renderOrder=0;
  for(const g of [box,cylinder,oval,blade,shade])g.dispose();
}
