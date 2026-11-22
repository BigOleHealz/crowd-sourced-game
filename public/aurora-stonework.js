import * as THREE from 'three';

// One set of architectural finishes for the whole room. The marble veins,
// torchlight pools and backlit ceiling glass are baked once at load time.
export function finishAuroraRoom(group,bounds){
  const {west,east,north,south}=bounds,w=east-west,d=south-north;
  let seed=58241;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function surface(ceiling){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1024;
    const g=canvas.getContext('2d'),width=canvas.width,height=canvas.height;
    g.fillStyle=ceiling?'#664137':'#af9285';g.fillRect(0,0,width,height);
    const cols=ceiling?4:10,rows=ceiling?7:16,tw=width/cols,th=height/rows;
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
      const x=tw*col,y=th*row;
      g.save();g.beginPath();g.rect(x,y,tw,th);g.clip();
      if(ceiling){
        const panel=g.createRadialGradient(x+tw*.45,y+th*.48,0,x+tw*.5,y+th*.5,tw*.70);
        panel.addColorStop(0,'#ffe4a8');panel.addColorStop(.38,'#d79869');panel.addColorStop(.76,'#8e4d57');panel.addColorStop(1,'#4a3847');
        g.fillStyle=panel;g.fillRect(x,y,tw,th);
        for(const k of [.025,.085,.135]){
          g.strokeStyle=k===.085?'#70462e':'#ffdc98';g.lineWidth=k===.085?5:2;
          g.strokeRect(x+tw*k,y+th*k,tw*(1-2*k),th*(1-2*k));
        }
        const cx=x+tw/2,cy=y+th/2;
        g.strokeStyle='#a16e54';g.lineWidth=2;
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          g.beginPath();g.moveTo(cx,cy);g.quadraticCurveTo(cx+Math.cos(a-.20)*tw*.42,cy+Math.sin(a-.20)*th*.42,cx+Math.cos(a)*tw*.34,cy+Math.sin(a)*th*.34);g.stroke();
        }
        g.fillStyle='#ffeac2';g.beginPath();g.ellipse(cx,cy,tw*.077,th*.077,0,0,Math.PI*2);g.fill();
      }else{
        const field=g.createLinearGradient(x,y,x+tw,y+th);
        const tint=Math.floor(rand()*14),r=164+tint;
        field.addColorStop(0,'rgb('+r+','+(r-16)+','+(r-22)+')');
        field.addColorStop(.58,'#cfb6a4');field.addColorStop(1,'#ab9285');g.fillStyle=field;g.fillRect(x,y,tw,th);
        for(let j=0;j<5;j++){
          let yy=y+rand()*th*1.7-th*.45;const slope=(col%2?.6:-.6),weight=rand();
          g.lineWidth=.45+weight*1.15;g.strokeStyle=j%2?'#f5e7d598':'#80676e75';
          g.beginPath();g.moveTo(x,yy);
          for(let k=1;k<=12;k++){yy+=slope*(tw/12)+(rand()-.5)*6;g.lineTo(x+k*tw/12,yy);}g.stroke();
        }
        g.strokeStyle='#8b746380';g.lineWidth=1.3;g.strokeRect(x,y,tw,th);
      }
      g.restore();
    }
    if(!ceiling){
      for(const [px,pz] of [[-85.5,55.7],[-76.1,46.65],[-85.7,36.3],[-75.95,36.3],[-80.4,60.1]]){
        const x=(px-west)/w*width,y=(pz-north)/d*height,r=width*.20;
        const halo=g.createRadialGradient(x,y,0,x,y,r);halo.addColorStop(0,'#fff4bfaa');halo.addColorStop(.42,'#ffd99b55');halo.addColorStop(1,'#ffc4a000');
        g.fillStyle=halo;g.fillRect(x-r,y-r,r*2,r*2);
      }
    }
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
    return tex;
  }
  function face(tex,ceiling,x,z,width,depth,y){
    const m=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:0xffdfbb,
      emissiveIntensity:ceiling?.68:.24,roughness:ceiling?.44:.28,metalness:.065});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),m);
    mesh.rotation.x=ceiling?Math.PI/2:-Math.PI/2;
    mesh.position.set(x,y,z);group.add(mesh);
  }
  const marble=surface(false),glass=surface(true),x=(west+east)/2;
  face(marble,false,x,(north+south)/2,w,d,.805);
  face(marble,false,x,(north+42)/2,w,42-north,4.757);
  face(glass,true,x,(north+south)/2,w,d,9.044);
  face(glass,true,x,(north+42)/2,w,42-north,4.523);
}
