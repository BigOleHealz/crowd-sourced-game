import * as THREE from 'three';
import {reefAnchor,reefDiveSite,reefTrail,seabedHeight,reefGridSpacing,reefTileSize} from './reef-channel.js';

function sandTile(tx,tz,material) {
  const geo=new THREE.PlaneGeometry(reefTileSize,reefTileSize,reefTileSize/reefGridSpacing,reefTileSize/reefGridSpacing);
  geo.rotateX(-Math.PI/2);
  const p=geo.attributes.position, colors=[], shade=new THREE.Color();
  const cx=(tx+.5)*reefTileSize, cz=(tz+.5)*reefTileSize;
  const count=reefTileSize/reefGridSpacing+1, indices=[];
  for(let i=0;i<p.count;i++){
    const x=cx+p.getX(i), z=cz+p.getZ(i), h=seabedHeight(x,z);
    p.setY(i,h);
    geo.attributes.uv.setXY(i,(x*.96+z*.28)/7.5,(z*.96-x*.28)/7.5);
    const relief=seabedHeight(x+1,z)-h;
    shade.setRGB(.66+relief*.13,.76+relief*.12,.65+relief*.10);
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
  // Low limestone fragments half buried on the flanks of the seagrass beds.
  // Reuse one silhouette, embedded in the existing vegetation batch.
  const rock=new THREE.IcosahedronGeometry(1,1);
  const rv=rock.attributes.position;
  for(let i=0;i<rv.count;i++){
    const x=rv.getX(i),y=rv.getY(i),z=rv.getZ(i);
    const wear=.93+.16*Math.sin(x*4.3+y*7.2+z*2.7);
    rv.setXYZ(i,x*wear,y*wear+.08*x,z*wear);
  }
  // Smooth normals from the parent stone keep the small worn facets rounded.
  const tintNoise=Array.from({length:rv.count},(_,i)=>
    .94+.16*Math.sin(rv.getX(i)*8.1+rv.getY(i)*4.2)*Math.cos(rv.getZ(i)*7.9));

  const stones=[0x797863,0x88856c,0x757967,0x939078,0x859178];
  for(const [i,[cx,cz]] of reefTrail.entries()){
    if(i%2===0){
      const centerX=cx+2.6*Math.cos(i*1.7),centerZ=cz+2.6*Math.sin(i*1.7);
      for(let n=0;n<8;n++){
        const a=i*.83+n*2.39,r=.44*Math.sqrt(n),size=n===0?.90:.18+.52*(1-n/8);
        const x=centerX+r*Math.cos(a)*1.48,z=centerZ+r*Math.sin(a);
        const start=vegetation.positions.length;
        vegetation.add(rock,stones[(i+n)%stones.length],x,seabedHeight(x,z)-.035,z,
          size*1.42,size*.32,size*.94,.10*Math.sin(a),a,.12*Math.cos(a));
        const slopeX=seabedHeight(x+.5,z)-seabedHeight(x-.5,z);
        const slopeZ=seabedHeight(x,z+.5)-seabedHeight(x,z-.5);
        for(let j=0;j<rv.count;j++){
          const v=start+j*3,gain=tintNoise[j];
          vegetation.positions[v+1]+=(vegetation.positions[v]-x)*slopeX+(vegetation.positions[v+2]-z)*slopeZ;
          for(let k=0;k<3;k++)vegetation.colors[v+k]*=gain;
        }
      }
    }
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
  blade.dispose();tube.dispose();rock.dispose();
  return plants;
}

// Merge the float, pole and two-sided diver-down pennant into one draw.
function buildDiveBuoy(scene,Batch){
  const batch=new Batch(),red=0xf03237,white=0xfff4de;
  function ring(top,bottom,height,y,tint){
    const shape=new THREE.CylinderGeometry(top,bottom,height,20);
    batch.add(shape,tint,0,y,0);shape.dispose();
  }
  ring(.83,.55,.46,.04,red);
  ring(.81,.83,.18,.36,white);
  ring(.40,.81,.31,.605,red);
  ring(.07,.10,2.1,1.78,0xe9e6d3);
  // A slight ripple keeps the stripe visible from oblique approaches.
  function cloth(u,v){
    return [.055+u*1.46,2.87-v*.93-u*.12,.24*Math.sin(u*4.4)];
  }
  for(let i=0;i<8;i++){
    const a=i/8,b=(i+1)/8;
    const bands=u=>[0,Math.max(0,u-.14),Math.min(1,u+.14),1];
    const left=bands(a),right=bands(b);
    for(let j=0;j<3;j++){
      const corners=[cloth(a,left[j]),cloth(a,left[j+1]),cloth(b,right[j]),cloth(b,right[j+1])];
      const shape=new THREE.BufferGeometry();
      shape.setAttribute('position',new THREE.Float32BufferAttribute(corners.flat(),3));
      shape.setIndex([0,1,2,2,1,3]);shape.computeVertexNormals();
      batch.add(shape,j===1?white:red,0,0,0);shape.dispose();
    }
  }
  const buoy=batch.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}),false);
  buoy.name='Coral Reef dive buoy';buoy.position.set(reefDiveSite.x,0,reefDiveSite.z);
  return buoy;
}

export function reefChannelView(scene,Batch) {
  const floorMaterial=new THREE.MeshLambertMaterial({vertexColors:true});
  const waterClock={value:0};
  const buoy=buildDiveBuoy(scene,Batch);
  floorMaterial.onBeforeCompile=shader=>{
    shader.uniforms.reefTime=waterClock;
    shader.vertexShader='varying vec2 reefXZ;\n'+shader.vertexShader.replace('#include <worldpos_vertex>',
      '#include <worldpos_vertex>\n reefXZ=(modelMatrix*vec4(transformed,1.)).xz;');
    shader.fragmentShader='varying vec2 reefXZ; uniform float reefTime;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec2 p=reefXZ;
      float lace=sin(p.x*2.7+sin(p.y*2.1+reefTime*.4))+sin(p.y*2.3+sin(p.x*1.8-reefTime*.4));
      float light=1.-smoothstep(.045,.28,abs(lace));
      diffuseColor.rgb+=vec3(.026,.046,.036)*light;
    `);
  };
  let plants;
  const tiles=new Map();
  let lastX,lastZ,submerged=false;
  return function update(camera,waterY) {
    const phase=performance.now()*.0016;
    buoy.position.y=waterY+.062*Math.sin(phase);
    buoy.rotation.z=.036*Math.sin(phase*.8);
    const under=camera.position.y<waterY-.04;
    if(!under && !submerged)return;
    submerged=under;
    const nearTrail=under && camera.position.z>-450 && camera.position.z< -260 && camera.position.x>-77 && camera.position.x<135;
    if(nearTrail && !plants)plants=buildTrailPlants(scene,Batch);
    if(plants)plants.visible=nearTrail;
    if(under && !floorMaterial.map){
      // Rob Tuytel's CC0 Aerial Beach 01 scan, with baked ripple relief.
      // https://polyhaven.com/a/aerial_beach_01
      const sand=new THREE.TextureLoader().load('./marina-reef-sand.webp');
      sand.colorSpace=THREE.SRGBColorSpace;sand.wrapS=sand.wrapT=THREE.RepeatWrapping;
      sand.anisotropy=2;floorMaterial.map=sand;floorMaterial.needsUpdate=true;
    }
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
