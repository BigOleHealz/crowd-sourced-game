import * as THREE from 'three';
import {reefAnchor,reefTrail,seabedHeight,reefGridSpacing,reefTileSize} from './reef-channel.js';

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

function buildTrailPlants(scene,Batch) {
  const weedMaterial=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  const vegetation=new Batch(),blade=new THREE.PlaneGeometry(.12,1,1,3),tube=new THREE.LatheGeometry([
    new THREE.Vector2(.12,-.28),new THREE.Vector2(.17,-.19),new THREE.Vector2(.15,.06),
    new THREE.Vector2(.18,.23),new THREE.Vector2(.21,.30),new THREE.Vector2(.165,.28),new THREE.Vector2(.12,.12),
  ],10);
  const p=blade.attributes.position;
  for(let i=0;i<p.count;i++){
    const h=p.getY(i)+.5;
    p.setXYZ(i,p.getX(i)*(1-.8*h)+.11*Math.sin(h*3),h,.34*h*h);
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
  const {x:ax,z:az,yaw}=reefAnchor;
  function anchorPoint(x,z,h=.15){
    const wx=ax+x*Math.cos(yaw)+z*Math.sin(yaw),wz=az-x*Math.sin(yaw)+z*Math.cos(yaw);
    return [wx,seabedHeight(wx,wz)+h,wz];
  }
  const iron=0x64564a, patina=0x657064;
  vegetation.beam(iron,anchorPoint(0,-1.65),anchorPoint(0,1.58),.22);
  vegetation.beam(patina,anchorPoint(-1.1,.75),anchorPoint(1.1,.75),.15);
  const loop=new THREE.TorusGeometry(.24,.065,6,18);
  vegetation.add(loop,iron,...anchorPoint(0,1.74,.17),1,1,1,Math.PI/2);
  const fluke=new THREE.ConeGeometry(.26,.65,3);
  for(const sign of [-1,1]){
    vegetation.beam(iron,anchorPoint(0,-1.58),anchorPoint(sign*.8,-1.22),.25);
    vegetation.beam(patina,anchorPoint(sign*.8,-1.22),anchorPoint(sign*1.44,-.76),.22);
    vegetation.add(fluke,iron,...anchorPoint(sign*1.45,-.71,.2),1,1,1,.91,yaw,sign*-.50);
  }
  loop.dispose();fluke.dispose();
  const plants=vegetation.mesh(scene,weedMaterial,false);
  blade.dispose();tube.dispose();
  return plants;
}

export function reefChannelView(scene,Batch) {
  const floorMaterial=new THREE.MeshLambertMaterial({vertexColors:true});
  const waterClock={value:0};
  floorMaterial.onBeforeCompile=shader=>{
    shader.uniforms.reefTime=waterClock;
    shader.vertexShader='varying vec2 reefXZ;\n'+shader.vertexShader.replace('#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n reefXZ=(modelMatrix*vec4(transformed,1.)).xz;');
    shader.fragmentShader='varying vec2 reefXZ; uniform float reefTime;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec2 p=reefXZ;
      float ripple=sin(p.y*7.1+sin(p.x*.9)*1.8+sin(p.x*1.87+p.y*.37));
      float shoal=sin(p.x*.7+p.y*.34)*sin(p.y*.63-p.x*.16);
      float lace=sin(p.x*2.7+sin(p.y*2.1+reefTime*.4))+sin(p.y*2.3+sin(p.x*1.8-reefTime*.4));
      float light=1.-smoothstep(.045,.28,abs(lace));
      diffuseColor.rgb*=.95+.10*ripple+.08*shoal;
      diffuseColor.rgb+=vec3(.06,.105,.088)*light;
    `);
  };
  let plants;
  const tiles=new Map();
  let lastX,lastZ,submerged=false;
  return function update(camera,waterY) {
    const under=camera.position.y<waterY-.04;
    if(!under && !submerged)return;
    submerged=under;
    const nearTrail=under && camera.position.z>-450 && camera.position.z< -260 && camera.position.x>-77 && camera.position.x<135;
    if(nearTrail && !plants)plants=buildTrailPlants(scene,Batch);
    if(plants)plants.visible=nearTrail;
    if(under)waterClock.value=performance.now()*.001;
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
