import * as THREE from 'three';
import {beachHut, harborHouses} from './harbor-key-structures.js';
import {sandHeight} from './beach-layout.js';

function addResidences(houses, box, gable, podiumTop) {
  const variation = new THREE.Color();
  for(const house of harborHouses) {
    const {x,z,w,d,base,eave,rise,siding,trim,roof,shutters,finish} = house;
    const top=base+eave, height=top-podiumTop;
    const piece=(tint,dx,y,dz,sx,sy,sz,rx=0,ry=0)=>
      houses.add(box,tint,x+dx,y,z+dz,sx,sy,sz,rx,ry);
    const shade=(color,factor)=>variation.setHex(color).multiplyScalar(factor).getHex();
    piece(siding,0,podiumTop+height/2,0,w,height,d);
    piece(trim,0,podiumTop+.045,0,w+.16,.13,d+.16);
    if(finish==='clapboard'){
      for(let y=podiumTop+.17;y<top-.10;y+=.235) {
        const tint=shade(siding,.89+.07*Math.sin(y*11+z));
        for(const side of [-1,1]){
          piece(tint,side*w/2,y,0,.035,.046,d);
          piece(tint,0,y,side*d/2,w,.046,.035);
        }
      }
    }
    if(finish==='batten'){
      for(const side of [-1,1]){
        for(let at=-d/2+.41;at<d/2;at+=.46)piece(shade(siding,1.16),side*w/2,podiumTop+height/2,at,.042,height,.054);
        for(let at=-w/2+.41;at<w/2;at+=.46)piece(shade(siding,1.16),at,podiumTop+height/2,side*d/2,.054,height,.042);
      }
    }
    for(const side of [-1,1]) for(const end of [-1,1]){
      piece(trim,side*(w/2-.055),podiumTop+height/2,end*(d/2-.055),.17,height,.17);
    }
    // The roof slopes are the same metre-scale rise and run used by flight and walking collision.
    const run=d/2, eaves=.22, tilt=Math.atan2(rise,run), halfRoofLength=(run+eaves)/Math.cos(tilt);
    for(const side of [-1,1]) {
      houses.add(gable,siding,x+side*w/2,top,z,1,rise,d,0,side===1 ? 0 : Math.PI);
      const dz=side*(run+eaves)/2, y=top+rise-Math.abs(dz)*Math.tan(tilt)-.028;
      piece(roof,0,y,dz,w+.43,.11,halfRoofLength,side*tilt);
      piece(shade(roof,.78),0,top-.055,side*(run+.205),w+.46,.12,.095);
      for(let at=-w/2+.18;at<=w/2;at+=.49){
        piece(shade(roof,1.14),at,y+.062,dz,.023,.028,halfRoofLength,side*tilt);
      }
    }
    piece(shade(roof,1.12),0,top+rise+.04,0,w+.46,.09,.24);

    function window(tint, axis, side, across, y, width, height, withShutters=true) {
      const line=side*(axis==='x' ? w/2 : d/2);
      const face=(color,u,v,span,tall,depth=.05,offset=.028)=>{
        if(axis==='x')piece(color,line+side*offset,v,u,depth,tall,span);
        else piece(color,u,v,line+side*offset,span,tall,depth);
      };
      face(trim,across,y,width+.17,height+.17);
      face(tint,across,y,width,height,.037,.071);
      face(trim,across,y,.036,height,.033,.095);
      face(trim,across,y,width,.034,.031,.095);
      face(trim,across,y-height/2-.08,width+.24,.070,.19,.09);
      if(withShutters){
        for(const wing of [-1,1]){
          const at=across+wing*(width/2+.26);
          face(shutters,at,y,.37,height,.047,.073);
          for(let i=0;i<6;i++)face(shade(shutters,1.21),at,y+height*(i/6-.43),.31,.029,.03,.104);
        }
      }
    }
    const glaze=finish==='stucco' ? 0x5d6765 : 0x556d70;
    const rows=height>3.85 ? 2 : 1, spacing=height/rows;
    for(let row=0;row<rows;row++){
      const y=podiumTop+(row+.52)*spacing, windowHeight=Math.min(1.12,spacing*.52);
      for(const side of [-1,1]){
        for(const end of [-1,1]){
          window(glaze,'x',side,end*d*.29,y,1.20,windowHeight);
          window(glaze,'z',side,end*w*.27,y,1.16,windowHeight);
        }
        if(finish!=='batten')window(0x627678,'x',side,0,y,1.60,windowHeight,false);
      }
    }
    for(const side of [-1,1]){
      window(0x606866,'x',side,0,top+rise*.34,finish==='batten'?.66:1.02,.58,false);
      for(const end of [-1,1]){
        piece(roof,side*(w/2-.32),podiumTop+height/2,end*(d/2+.055),.089,height,.115);
      }
    }
  }
}

function shadeDeck(scene, hut) {
  // The island is beyond the district's shadow map. Bake this small canopy
  // shadow onto the deck using the same northwest sun direction.
  const sheet=document.createElement('canvas');sheet.width=64;sheet.height=48;
  const brush=sheet.getContext('2d'), image=brush.createImageData(sheet.width,sheet.height);
  const height=hut.canopy.bottom-hut.deckY;
  const edgeX=height*36/32-hut.canopy.w/2, edgeZ=height*21/32-hut.canopy.d/2;
  for(let row=0;row<sheet.height;row++)for(let col=0;col<sheet.width;col++){
    const x=(col/(sheet.width-1)-.5)*hut.w, z=(row/(sheet.height-1)-.5)*hut.d;
    const d=Math.min(x-edgeX,z-edgeZ);
    const i=(row*sheet.width+col)*4;
    image.data[i]=33;image.data[i+1]=43;image.data[i+2]=40;
    image.data[i+3]=82*THREE.MathUtils.smoothstep(d,-.42,.30);
  }
  brush.putImageData(image,0,0);
  const map=new THREE.CanvasTexture(sheet);map.colorSpace=THREE.SRGBColorSpace;
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(hut.w,hut.d).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));
  shadow.position.set(hut.x,hut.deckY+.005,hut.z);
  scene.add(shadow);
}

function addBeachShelter(scene, timber, metal, box) {
  const h=beachHut, {x,z,w,d,deckY,canopy}=h;
  const boards=[0xb8a18a,0xa69179,0xb4a792,0xab967a,0xc0ad93];
  const plankCount=30, width=w/plankCount;
  for(let i=0;i<plankCount;i++)timber.add(box,boards[i%boards.length],x-w/2+(i+.5)*width,deckY-.059,z,width-.006,.118,d);
  for(const side of [-1,1]){
    timber.add(box,0x8c7b64,x+side*w/2,deckY-.065,z,.073,.122,d+.05);
    timber.add(box,0x928167,x,deckY-.075,z+side*d/2,w,.135,.09);
  }
  for(const p of h.posts){
    const bottom=sandHeight(p.x,p.z)-.04, height=p.top-bottom;
    timber.add(box,0xede1c6,p.x,bottom+height/2,p.z,p.w,height,p.d);
    metal.add(box,0x687b73,p.x,deckY+.10,p.z,p.w+.025,.21,p.d+.025);
    timber.beam(0xded0b3,[p.x,canopy.bottom-.53,p.z],[p.x+Math.sign(x-p.x)*.51,canopy.bottom-.04,p.z],.084);
  }
  for(const p of h.benches){
    for(let i=0;i<4;i++)timber.add(box,boards[(i+1)%boards.length],p.x,p.top-.038,p.z+p.d*((i+.5)/4-.5),p.w,.076,p.d/4-.009);
    for(const end of [-1,1]){
      timber.add(box,0x88806d,p.x+end*(p.w/2-.16),deckY+.20,p.z,.07,.43,p.d-.04);
    }
  }

  const panels=17, panelWidth=canopy.d/panels;
  for(let i=0;i<panels;i++){
    const panelZ=z-canopy.d/2+(i+.5)*panelWidth;
    metal.add(box,i%4===0?0x6d9a91:0x7ba29b,x,canopy.top-.043,panelZ,canopy.w,.086,panelWidth);
    metal.add(box,0x648b83,x,canopy.top-.006,panelZ-panelWidth/2,canopy.w,.016,.023);
  }
  for(const side of [-1,1]){
    timber.add(box,0xe6d5b5,x+side*(canopy.w/2-.045),canopy.bottom+.012,z,.09,.16,canopy.d+.05);
    timber.add(box,0xeee1c8,x,canopy.bottom+.012,z+side*(canopy.d/2-.045),canopy.w,.16,.09);
  }

  shadeDeck(scene,h);

  const label=document.createElement('canvas');
  label.width=640;label.height=192;
  const ink=label.getContext('2d');
  ink.fillStyle='#f3e9d2';ink.fillRect(0,0,640,192);
  ink.fillStyle='#356760';ink.fillRect(8,8,624,176);
  ink.fillStyle='#fff1d0';ink.textAlign='center';ink.textBaseline='middle';
  ink.font='bold 28px sans-serif';ink.fillText('H A R B O R   K E Y',320,50);
  ink.font='bold 73px sans-serif';ink.fillText('BEACH SHADE',320,119);
  const map=new THREE.CanvasTexture(label);map.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.PlaneGeometry(1.42,.42), coating=new THREE.MeshLambertMaterial({map});
  for(const side of [-1,1]){
    const panel=new THREE.Mesh(sign,coating);
    panel.position.set(x+side*(canopy.w/2+.021),canopy.bottom-.038,z);
    panel.rotation.y=side*Math.PI/2;
    scene.add(panel);
  }
}

export function addHarborKeyStructures(scene,Batch,podiumTop) {
  const box=new THREE.BoxGeometry(), gable=new THREE.BufferGeometry();
  gable.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-.5,0,1,0,0,0,.5],3));
  gable.computeVertexNormals();
  const houses=new Batch(), timber=new Batch(), metal=new Batch();
  addResidences(houses,box,gable,podiumTop);
  addBeachShelter(scene,timber,metal,box);
  const material=new THREE.MeshLambertMaterial({vertexColors:true});
  houses.mesh(scene,material).userData.impactSurface='solid';
  timber.mesh(scene,material).userData.impactSurface='wood';
  metal.mesh(scene,material).userData.impactSurface='metal';
  box.dispose();gable.dispose();
}
