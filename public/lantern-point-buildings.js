import * as THREE from 'three';
import {lanternBuildings} from './lantern-buildings-layout.js';

const ground=.80, inset=.27;
const signs=[
  ['TIDE LINE','SAILMAKER'],['MORROW','WOOD & MARINE JOINERY'],['RÍO STUDIO','CERAMICS & CASTINGS'],
];
const workshopColors=[0x648c85,0xae704e,0x758c9a];
const paneColors=[0x344949,0x415957,0x536b6c,0x708483];
const metalDark=0x394848, sillStone=0xa29783;

// One sheet serves the trade signs and all four faces of the clock.
function lettering(buildings){
  const entries=buildings.map(b=>[b.label,b.sub]).concat(signs);
  const canvas=document.createElement('canvas'), cw=512,ch=108;
  canvas.width=cw*2;canvas.height=ch*Math.ceil((entries.length+1)/2);
  const ink=canvas.getContext('2d');
  const site=i=>[(i%2)*cw,Math.floor(i/2)*ch];
  entries.forEach(([title,subtitle],i)=>{
    const [x,y]=site(i);
    ink.fillStyle='#dec99c';ink.fillRect(x,y,cw,ch);
    ink.fillStyle=i===0||i===3?'#294d50':'#333f3b';ink.fillRect(x+4,y+4,cw-8,ch-8);
    ink.fillStyle='#f7e8c5';ink.textAlign='center';ink.textBaseline='middle';
    ink.font='bold 39px Georgia,serif';ink.fillText(title,x+cw/2,y+40,cw-30);
    ink.font='bold 16px sans-serif';ink.fillText(subtitle,x+cw/2,y+78,cw-32);
  });
  const [clockX,clockY]=site(entries.length);
  ink.save();ink.translate(clockX+cw/2,clockY+ch/2);ink.scale(cw/ch,1);
  ink.fillStyle='#263c3d';ink.fillRect(-ch/2,-ch/2,ch,ch);
  ink.fillStyle='#d7b16a';ink.beginPath();ink.arc(0,0,49,0,Math.PI*2);ink.fill();
  ink.fillStyle='#ede2c1';ink.beginPath();ink.arc(0,0,44,0,Math.PI*2);ink.fill();
  ink.strokeStyle='#242f2d';ink.lineCap='round';
  for(let i=0;i<60;i++){
    const a=i*Math.PI/30,major=i%5===0;
    ink.lineWidth=major?2.2:.8;
    ink.beginPath();ink.moveTo(Math.sin(a)*(major?36:40),Math.cos(a)*(major?36:40));
    ink.lineTo(Math.sin(a)*42,Math.cos(a)*42);ink.stroke();
  }
  for(const [a,r,width] of [[-Math.PI/3,25,4],[Math.PI/3,34,2.6]]){
    ink.lineWidth=width;ink.beginPath();ink.moveTo(0,0);ink.lineTo(Math.sin(a)*r,-Math.cos(a)*r);ink.stroke();
  }
  ink.fillStyle='#916d3f';ink.beginPath();ink.arc(0,0,3.4,0,Math.PI*2);ink.fill();ink.restore();
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  return {map,clock:entries.length,coordinates(index,uv){
    const [x,y]=site(index);
    return [(x+3+uv.x*(cw-6))/canvas.width,1-(y+ch-3-uv.y*(ch-6))/canvas.height];
  }};
}

// Slope polygons use their actual top vertex rather than a scaled pitched box,
// keeping cornices and roof ridges within the registered collision envelope.
function roofPrism(spec,axis,start,end,x,y,z,depth,tint,batch){
  const points=[...spec,[end,0],[start,0]].map(p=>new THREE.Vector2(...p));
  const vertices=[];
  const put=(p,v)=>{
    if(axis==='x')vertices.push(x+v,y+p.y,z+p.x);
    else vertices.push(x+p.x,y+p.y,z-v);
  };
  for(const tri of THREE.ShapeUtils.triangulateShape(points,[])){
    for(const j of tri)put(points[j],-depth/2);
    for(const j of [...tri].reverse())put(points[j],depth/2);
  }
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    put(a,-depth/2);put(a,depth/2);put(b,-depth/2);
    put(b,-depth/2);put(a,depth/2);put(b,depth/2);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
  batch.add(g,tint,0,0,0);g.dispose();
}

export function addLanternBuildings(scene,Batch,buildings=lanternBuildings){
  const signsheet=lettering(buildings);
  const shape=new THREE.BoxGeometry(), face=new THREE.PlaneGeometry();
  const roofGeometry=new THREE.CylinderGeometry(0,1,1,4,1).rotateY(Math.PI/4);
  const walls=new Batch(), roofs=new Batch(), labels=new Batch(true);
  const color=new THREE.Color();
  const tint=(value,n)=>color.setHex(value).multiplyScalar(n).getHex();

  for(const [index,b] of buildings.entries()){
    const {x,z,w,d,h,body,trim,roof,accent,type,facing}=b;
    const west=w/2-inset,south=d/2-inset,wallW=2*west,wallD=2*south;
    const box=(shade,u,y,v,sx,sy,sz,batch=walls,rx=0,ry=0,rz=0)=>
      batch.add(shape,shade,x+u,ground+y,z+v,sx,sy,sz,rx,ry,rz);
    function onWall(axis,side,u,y,span,height,shade,depth=.04,raise=.032){
      if(axis==='x')box(shade,side*(west+raise),y,u,depth,height,span);
      else box(shade,u,y,side*(south+raise),span,height,depth);
    }
    function label(i,axis,side,u,y,span,height,raise=.085){
      const uv=face.attributes.uv.clone();
      for(let n=0;n<uv.count;n++){
        uv.setXY(n,...signsheet.coordinates(i,{x:uv.getX(n),y:uv.getY(n)}));
      }
      face.setAttribute('batchUv',uv);
      const px=x+(axis==='x'?side*(west+raise):u), pz=z+(axis==='x'?u:side*(south+raise));
      const yaw=axis==='x'?side*Math.PI/2:side>0?0:Math.PI;
      labels.add(face,0xffffff,px,ground+y,pz,span,height,1,0,yaw);
    }
    function window(axis,side,u,y,span,height,shade=trim,grid=2){
      onWall(axis,side,u,y,span+.14,height+.15,shade,.05,.027);
      onWall(axis,side,u,y,span,height,paneColors[0],.04,.068);
      const clear=span-.15, step=clear/grid;
      for(let i=0;i<grid;i++){
        const at=u-clear/2+(i+.5)*step;
        onWall(axis,side,at,y+.015,step-.045,height-.13,paneColors[(i+1)%4],.022,.102);
        onWall(axis,side,at,y+height*.30,step-.048,.035,paneColors[3],.014,.119);
      }
      onWall(axis,side,u,y-height/2-.085,span+.2,.078,sillStone,.12,.071);
    }
    function loadingDoor(axis,side,u,doorWidth,height,shade){
      onWall(axis,side,u,(height+.10)/2,doorWidth+.24,height+.10,tint(shade,.72),.065,.035);
      onWall(axis,side,u,height/2,doorWidth,height-.15,shade,.04,.085);
      for(let y=.19;y<height-.17;y+=.177)onWall(axis,side,u,y,doorWidth-.055,.022,tint(shade,.78),.026,.114);
      onWall(axis,side,u,.16,doorWidth,.12,tint(shade,.49),.032,.123);
      onWall(axis,side,u,.94,.22,.074,0x9e9b82,.038,.136);
    }
    function belt(y,height,shade,width=wallW+.20,depth=wallD+.19){
      box(shade,0,y,0,width,height,depth);
    }
    function seams(axis,y,span,depth,rise,center=0){
      const half=depth/2, tilt=Math.atan2(rise,half), slope=Math.hypot(half,rise);
      for(const end of [-1,1])for(let s=-span/2+.46;s<span/2-.30;s+=.69){
        const level=y+rise/2+.024;
        if(axis==='x')box(tint(roof,1.27),s,level,center+end*half/2,.031,.044,slope,roofs,end*tilt);
        else box(tint(roof,1.25),center+end*half/2,level,s,slope,.044,.031,roofs,0,0,-end*tilt);
      }
    }

    if(type==='clock'){
      belt(.26,.52,sillStone,w-.12,d-.12);
      box(body,0,5.43,0,wallW,10.86,wallD);
      belt(1.05,.21,trim);belt(8.98,.17,trim);belt(10.72,.30,trim);
      box(tint(body,1.09),0,12.00,0,wallW-.86,2.19,wallD-.86);
      belt(13.05,.22,accent,wallW-.42,wallD-.42);
      roofs.add(roofGeometry,roof,x,ground+14.65,z,(wallW-.24)/Math.SQRT2,2.91,(wallD-.24)/Math.SQRT2);
      box(0xcfb783,0,16.15,0,.14,.48,.14,roofs);
      for(const side of [-1,1]){
        for(const u of [-1,1]){
          box(trim,side*(west-.14),5.55,u*(south-.16),.30,10.50,.34);
        }
        window('x',side,0,5.51,1.14,2.13,trim,2);
        window('z',side,0,5.51,1.14,2.13,trim,2);
        onWall('x',side,0,8.20,1.2,1.02,accent);
        onWall('z',side,0,8.20,1.2,1.02,accent);
        for(const axis of ['x','z']){
          onWall(axis,side,0,9.70,2.35,2.32,0x5c6c65,.048,.038);
          label(signsheet.clock,axis,side,0,9.70,2.31,2.28);
        }
      }
      loadingDoor('x',facing,0,1.70,2.26,0x676b5d);
      label(index,'x',facing,0,3.05,2.91,.53);
      continue;
    }

    const upper=type==='customs', market=type==='market', exchange=type==='exchange', workshop=type==='workshops';
    const shopfront=market||workshop||type==='chandlery';
    const eave=upper?8.32:exchange?5.33:market?5.03:workshop?5.13:h-1.20;
    box(body,0,eave/2,0,wallW,eave,wallD);
    belt(.23,.46,tint(body,.83));
    belt(eave-.075,.16,trim,w-.19,d-.19);
    if(upper){
      const top=h-.17;
      box(tint(body,.86),0,(eave+top-.36)/2,0,wallW-.90,top-.36-eave,wallD-2.0);
      belt(eave+.20,.39,tint(trim,.73),w-.12,d-.12);
      belt(top,.26,roof,wallW-.68,wallD-1.74);
      belt(4.65,.14,tint(trim,.93));
      for(const axis of ['x','z'])for(const side of [-1,1]){
        const width=axis==='x'?wallD:wallW;
        for(const u of [-.31,0,.31]){
          window(axis,side,width*u,6.65,1.42,1.63,trim,2);
          if(u||axis==='z')window(axis,side,width*u,2.28,1.56,1.54,trim,2);
        }
      }
      loadingDoor('x',facing,0,2.30,2.90,accent);
      label(index,'x',facing,0,3.71,4.67,.64);
      continue;
    }

    if(exchange){
      // Paired industrial monitors admit north light above the covered auction floor.
      const half=wallW/2, height=h-eave-.09;
      for(const side of [-1,1]){
        const lo=side<0?-half:0, hi=lo+half;
        roofPrism([[lo,.29],[hi-.25,height],[hi,height]],'z',lo,hi,x,ground+eave,z,wallD,roof,roofs);
        box(tint(roof,.73),hi-.22,eave+height-.73,0,.15,1.31,wallD-.30);
        for(let v=-south+.72;v<south-.50;v+=1.37)box(0x769092,hi-.31,eave+height-.68,v,.057,.58,1.23);
        box(tint(roof,.80),hi-.15,eave+height-.16,0,.16,.125,wallD+.06,roofs);
      }
      for(const side of [-1,1]){
        for(const u of [-.31,0,.31])loadingDoor('x',side,wallD*u,3.18,2.99,accent);
        for(const u of [-.32,0,.32])window('z',side,wallW*u,3.86,3.14,.94,trim,3);
      }
      label(index,'x',facing,0,4.32,7.88,.89);
      label(index,'x',-facing,0,4.31,5.80,.70);
      continue;
    }

    const ridge=h-eave-.055, axis=type==='shed'?'z':'x';
    const across=axis==='x'?wallD:wallW,span=axis==='x'?wallW:wallD;
    const edge=across/2;
    roofPrism([[-edge,.07],[0,ridge],[edge,.07]],axis,-edge,edge,x,ground+eave,z,span+.23,roof,roofs);
    seams(axis,eave+.055,span,across,ridge-.045);
    if(axis==='x')box(tint(roof,1.12),0,h-.028,0,span+.25,.056,.15,roofs);
    else box(tint(roof,1.12),0,h-.028,0,.15,.056,span+.25,roofs);

    if(workshop){
      for(const side of [-1,1])for(let i=0;i<3;i++){
        const segment=(wallW-.38)/3,u=(i-1)*segment,shade=workshopColors[i];
        onWall('z',side,u,eave/2,segment-.11,eave-.57,shade,.067,.025);
        loadingDoor('z',side,u-.99,2.65,2.87,tint(shade,.70));
        window('z',side,u+2.06,1.85,2.25,1.65,trim,2);
        label(buildings.length+i,'z',side,u,3.78,segment*.86,.63,.120);
      }
      for(const side of [-1,1])window('x',side,0,2.86,5.2,1.48,trim,4);
      continue;
    }
    for(const side of [-1,1]){
      for(const u of [-.33,0,.33]){
        if(shopfront && u)window('x',side,wallD*u,2.18,market?3.36:2.11,1.91,trim,3);
        else loadingDoor('x',side,wallD*u,market?2.47:2.68,2.53,accent);
      }
      for(const u of [-.26,.26])window('z',side,wallW*u,2.47,2.30,1.48,trim,2);
      if(market){
        for(let i=-3;i<=3;i++)onWall('x',side,i*wallD*.13,2.15,.12,3.86,tint(body,1.15),.10,.067);
        onWall('x',side,0,4.54,wallD*.88,.20,tint(accent,.75),.16,.063);
      }
    }
    label(index,'x',facing,0,3.71,Math.min(6.69,wallD*.74),.77,.128);
  }
  walls.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true})).userData.impactSurface='solid';
  roofs.mesh(scene,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.68,metalness:.12,side:THREE.DoubleSide})).userData.impactSurface='metal';
  labels.mesh(scene,new THREE.MeshLambertMaterial({map:signsheet.map,vertexColors:true}),false);
  shape.dispose();face.dispose();roofGeometry.dispose();
}
