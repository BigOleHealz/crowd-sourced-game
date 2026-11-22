import * as THREE from 'three';
import {paneBatch} from './pane-damage-view.js';
import {beachHut, harborHouses, harborUpperWindows} from './harbor-key-structures.js';
import {sandHeight} from './beach-layout.js';
import {decoResidence} from './harbor-deco-view.js';

function addResidences(houses, panes, box, podiumTop) {
  const variation = new THREE.Color();
  for(const house of harborHouses) {
    const {x,z,w,d,base,eave,rise,siding,trim,roof,shutters,finish} = house;
    const top=base+eave, height=top-podiumTop;
    const piece=(tint,dx,y,dz,sx,sy,sz,rx=0,ry=0)=>
      houses.add(box,tint,x+dx,y,z+dz,sx,sy,sz,rx,ry);
    const shade=(color,factor)=>variation.setHex(color).multiplyScalar(factor).getHex();
    const windows=harborUpperWindows(house,podiumTop);
    for(const axis of ['x','z'])for(const side of [-1,1]){
      const length=axis==='x'?d:w,line=side*(axis==='x'?w:d)/2;
      const openings=windows.filter(p=>p.axis===axis && p.side===side && p.y<top);
      function panel(color,lo,hi,bottom,head,depth,offset){
        if(hi-lo<.002 || head-bottom<.002)return;
        const along=(lo+hi)/2,y=(bottom+head)/2,normal=line+side*offset;
        if(axis==='x')piece(color,normal,y,along,depth,head-bottom,hi-lo);
        else piece(color,along,y,normal,hi-lo,head-bottom,depth);
      }
      function face(color,lo,hi,bottom,head,depth,offset){
        let strips=[[lo,hi,bottom,head]];
        for(const p of openings){
          const left=p.across-p.width/2,right=p.across+p.width/2;
          strips=strips.flatMap(([a,b,c,e])=>{
            if(right<=a || left>=b || p.top<=c || p.bottom>=e)return [[a,b,c,e]];
            const low=Math.max(c,p.bottom),high=Math.min(e,p.top);
            return [[a,b,c,low],[a,b,high,e],[a,Math.max(a,left),low,high],[Math.min(b,right),b,low,high]];
          });
        }
        for(const r of strips)panel(color,...r,depth,offset);
      }
      face(siding,-length/2,length/2,podiumTop,top,.15,-.075);
      if(finish==='clapboard')for(let y=podiumTop+.17;y<top-.10;y+=.235)
        face(shade(siding,.89+.07*Math.sin(y*11+z)),-length/2,length/2,y-.023,y+.023,.035,0);
      if(finish==='batten')for(let u=-length/2+.41;u<length/2;u+=.46)
        face(shade(siding,1.16),u-.027,u+.027,podiumTop,top,.042,0);
    }
    // The decorative podium moulding is only a perimeter band, leaving the
    // walkable upper floor and its actual finish clear on the inside.
    for(const side of [-1,1]){
      piece(trim,side*(w/2-.06),podiumTop+.045,0,.28,.13,d+.16);
      piece(trim,0,podiumTop+.045,side*(d/2-.06),w-.40,.13,.28);
    }
    for(const side of [-1,1]) for(const end of [-1,1]){
      piece(trim,side*(w/2-.055),podiumTop+height/2,end*(d/2-.055),.17,height,.17);
    }
    // The roof slopes are the same metre-scale rise and run used by flight and walking collision.
    const run=d/2, eaves=.22, tilt=Math.atan2(rise,run), halfRoofLength=(run+eaves)/Math.cos(tilt);
    for(const side of [-1,1]) {
      const end=new THREE.Shape();
      end.moveTo(-d/2,0);end.lineTo(0,rise);end.lineTo(d/2,0);end.closePath();
      const vent=windows.find(p=>p.axis==='x' && p.side===side && p.y>top);
      if(vent){
        const hole=new THREE.Path(),a=vent.width/2,low=vent.bottom-top,high=vent.top-top;
        hole.moveTo(-a,low);hole.lineTo(a,low);hole.lineTo(a,high);hole.lineTo(-a,high);hole.closePath();
        end.holes.push(hole);
      }
      const endWall=new THREE.ShapeGeometry(end);
      houses.add(endWall,siding,x+side*w/2,top,z,1,1,1,0,side*Math.PI/2);endWall.dispose();
      const dz=side*(run+eaves)/2, y=top+rise-Math.abs(dz)*Math.tan(tilt)-.028;
      piece(roof,0,y,dz,w+.43,.11,halfRoofLength,side*tilt);
      piece(shade(roof,.78),0,top-.055,side*(run+.205),w+.46,.12,.095);
      for(let at=-w/2+.18;at<=w/2;at+=.49){
        piece(shade(roof,1.14),at,y+.062,dz,.023,.028,halfRoofLength,side*tilt);
      }
    }
    piece(shade(roof,1.12),0,top+rise+.04,0,w+.46,.09,.24);

    decoResidence(houses,box,house,top);

    for(const {id,tint,axis,side,across,y,width,h:height,withShutters} of windows){
      const line=side*(axis==='x' ? w/2 : d/2);
      const face=(color,u,v,span,tall,depth=.05,offset=.028)=>{
        if(axis==='x')piece(color,line+side*offset,v,u,depth,tall,span);
        else piece(color,u,v,line+side*offset,span,tall,depth);
      };
      for(const edge of [-1,1]){
        face(trim,across+edge*(width/2+.041),y,.082,height+.17);
        face(trim,across,y+edge*(height/2+.041),width,.082);
      }
      panes.add(id,()=>face(tint,across,y,width,height,.037,.071));
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
    for(const side of [-1,1]){
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
  const box=new THREE.BoxGeometry();
  const houses=new Batch(), timber=new Batch(), metal=new Batch();
  const panes=paneBatch(houses);
  addResidences(houses,panes,box,podiumTop);
  addBeachShelter(scene,timber,metal,box);
  const material=new THREE.MeshLambertMaterial({vertexColors:true});
  const mesh=houses.mesh(scene,material);mesh.userData.impactSurface='solid';
  timber.mesh(scene,material).userData.impactSurface='wood';
  metal.mesh(scene,material).userData.impactSurface='metal';
  box.dispose();
  return panes.bind(mesh);
}
