import * as THREE from 'three';
import {reefTrail,seabedHeight,reefGridSpacing,reefTileSize} from './reef-channel.js';

function sandTile(tx,tz,material) {
  const geo=new THREE.PlaneGeometry(reefTileSize,reefTileSize,reefTileSize/reefGridSpacing,reefTileSize/reefGridSpacing);
  geo.rotateX(-Math.PI/2);
  const p=geo.attributes.position, colors=[], shade=new THREE.Color();
  const cx=(tx+.5)*reefTileSize, cz=(tz+.5)*reefTileSize;
  const count=reefTileSize/reefGridSpacing+1, indices=[];
  for(let i=0;i<p.count;i++){
    const x=cx+p.getX(i), z=cz+p.getZ(i), h=seabedHeight(x,z);
    p.setY(i,h);
    const relief=seabedHeight(x+1,z)-h, ripple=Math.sin(z*1.6+x*.43)*.034;
    shade.setRGB(.32+relief*.13+ripple,.37+relief*.12+ripple,.28+relief*.10+ripple);
    colors.push(shade.r,shade.g,shade.b);
    if(i%count!==count-1 && i<p.count-count)indices.push(i,i+count,i+1,i+1,i+count,i+count+1);
  }
  geo.setIndex(indices);geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,material);mesh.position.set(cx,0,cz);return mesh;
}

export function reefChannelView(scene,Batch) {
  const floorMaterial=new THREE.MeshLambertMaterial({vertexColors:true});
  const weedMaterial=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  const vegetation=new Batch(),blade=new THREE.PlaneGeometry(.12,1,1,3),tube=new THREE.CylinderGeometry(.19,.105,.6,8,1,true);
  const p=blade.attributes.position;
  for(let i=0;i<p.count;i++){
    const h=p.getY(i)+.5;
    p.setXYZ(i,p.getX(i)*(1-.8*h),h,.25*h*h);
  }
  blade.computeVertexNormals();
  for(const [i,[cx,cz]] of reefTrail.entries()){
    for(let n=0;n<38;n++){
      const a=n*2.399+i, r=.4+Math.sqrt(n)*.57, x=cx+Math.cos(a)*r, z=cz+Math.sin(a)*r;
      const y=seabedHeight(x,z);
      const length=.38+((n*11+i*3)%12)*.065;
      for(let k=0;k<3;k++)
        vegetation.add(blade,n%3===0?0x557647:0x467957,x,y-.03,z,1,length,1,.17,a+k*2.1,.09);
    }
    // Broad purple sponges at the slip, amber near the headland, red below the bridge.
    const tint=i<4?0x9c628c:i<9?0xb48044:0xb25d48;
    for(let n=0;n<6;n++){
      const x=cx+Math.sin(n*2.4)*.6,z=cz+Math.cos(n*2.4)*.6,s=.7+n*.1;
      vegetation.add(tube,tint,x,seabedHeight(x,z)+.27*s,z,s,s,s,.09,n,.11);
    }
  }
  const plants=vegetation.mesh(scene,weedMaterial,false);plants.visible=false;
  blade.dispose();tube.dispose();
  const tiles=new Map();
  let lastX,lastZ,submerged=false;
  return function update(camera,waterY) {
    const under=camera.position.y<waterY-.04;
    if(!under && !submerged)return;
    submerged=under;plants.visible=under;
    const tx=Math.floor(camera.position.x/reefTileSize),tz=Math.floor(camera.position.z/reefTileSize);
    if(!under){for(const tile of tiles.values())tile.visible=false;lastX=lastZ=undefined;return;}
    if(tx===lastX && tz===lastZ)return;
    lastX=tx;lastZ=tz;
    for(const tile of tiles.values())tile.visible=false;
    for(let j=tz-1;j<=tz+1;j++)for(let i=tx-1;i<=tx+1;i++){
      const key=i+','+j;
      let tile=tiles.get(key);
      if(!tile){tile=sandTile(i,j,floorMaterial);tiles.set(key,tile);scene.add(tile);}
      tile.visible=true;
    }
    for(const [key,tile] of tiles){
      if(!tile.visible){scene.remove(tile);tile.geometry.dispose();tiles.delete(key);}
    }
  };
}
