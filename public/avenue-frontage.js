import * as THREE from 'three';

// The low-rise shop and apartment entrance share the slab of the tower at (-17, 7).
// All ground-level fittings stay behind its collision line, apart from flush street hardware.
export function avenueFrontage(scene, renderer, Batch, masonry, metals, box, skyline) {
  const loader = new THREE.TextureLoader();
  function texture(path) {
    const image = loader.load(path, () => { renderer.shadowMap.needsUpdate = true; });
    image.colorSpace = THREE.SRGBColorSpace;
    image.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return image;
  }
  function face(map, width, height, pos, rotation, basic = false) {
    const mat = basic ? new THREE.MeshBasicMaterial({map}) :
      new THREE.MeshStandardMaterial({map,roughness:.9});
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width,height),mat);
    mesh.rotation.set(...rotation);
    mesh.position.set(...pos);
    mesh.receiveShadow = !basic;
    scene.add(mesh);
    mesh.userData.impactSurface = 'solid';
    return mesh;
  }
  const part = (batch,tint,x,y,z,w,h,d) => batch.add(box,tint,x,y,z,w,h,d);
  const cladding = new Batch(true);
  const stoneMap=texture('./avenue-limestone.webp');
  stoneMap.wrapS=stoneMap.wrapT=THREE.RepeatWrapping;
  function stone(tint,x,y,z,w,h,d) {
    const shape=box.clone(), uv=shape.attributes.uv;
    const normals=shape.attributes.normal;
    for(let i=0;i<uv.count;i++) {
      const onEnd=Math.abs(normals.getX(i))>.5, onTop=Math.abs(normals.getY(i))>.5;
      uv.setXY(i,(onEnd?d:w)*uv.getX(i)/1.4+z*.31,(onTop?d:h)*uv.getY(i)/1.4+y*.27);
    }
    shape.setAttribute('batchUv',uv);
    cladding.add(shape,tint,x,y,z,w,h,d);shape.dispose();
  }
  const metal = (tint,...args) => part(metals,tint,...args);
  const sand=0xc8bba3, trim=0xdcd2bc, shadow=0x625b50, bronze=0x655440, dark=0x34393a;
  const front=-9.50;
  // Canopy soffit, fascia and drip edge cast a real shadow across the recessed reveals.
  stone(sand,-9.80,4.28,7,1.58,.80,18.08);
  stone(trim,-9.64,4.64,7,1.50,.13,18.34);
  stone(0xaba18e,-9.90,4.03,7,1.68,.12,18.02);
  metal(dark,-9.11,3.62,9.0,2.10,.17,13.31);
  part(masonry,0x91806b,-9.13,3.51,9.0,2.04,.08,13.27);
  for(let i=0;i<11;i++)part(masonry,i%3 ? 0xac9071 : 0x9b8062,-8.16-i*.181,3.464,9.0,.169,.032,13.19);
  metal(0xa68b6b,-8.085,3.64,9.0,.042,.19,13.31);
  metal(bronze,-8.82,3.62,.14,1.47,.13,4.33);
  for(const z of [3.00,6.13,9.26,12.39,15.52]){
    metals.beam(bronze,[-9.54,4.08,z],[-8.24,3.68,z],.038);
    metal(bronze,-8.24,3.66,z,.08,.10,.13);
  }
  // Split the corner pilasters into individually cut limestone courses.
  for(const z of [-1.83,2.35,15.79]){
    stone(shadow,-9.98,2.30,z,1.30,2.96,.51);
    for(let j=0;j<5;j++) {
      stone(j%2?sand:0xd1c5af,-9.94,1.109+j*.588,z,1.24,.578,.46);
    }
    stone(trim,-9.98,.882,z,1.27,.15,.55);
  }
  stone(sand,-10.03,2.33,16.0,1.16,3.06,.24);
  // The back wall sits a full metre behind the street glass for parallax at walking distance.
  const cafeMin=2.61,cafeMax=15.52,cafeMid=(cafeMin+cafeMax)/2;
  face(texture('./avenue-cafe.webp'),cafeMax-cafeMin,2.85,[-10.56,2.36,cafeMid],[0,Math.PI/2,0],true);
  stone(0x706659,-10.01,.86,cafeMid,1.14,.12,cafeMax-cafeMin);
  stone(0x756954,-10.01,3.74,cafeMid,1.14,.20,cafeMax-cafeMin);
  for(const z of [2.68,5.04,7.40,9.76,12.12,14.44,15.40]) {
    metal(dark,front-.075,2.26,z,.105,2.75,.061);
    metal(0xa58e73,front-.012,2.26,z+.018,.022,2.73,.015);
  }
  for(const y of [.90,3.13,3.62]) metal(dark,front-.085,y,cafeMid,.098,.064,cafeMax-cafeMin);
  // Window-height stools and stools' footrests sit between the glazing and the interior.
  const round=new THREE.CylinderGeometry(1,1,1,14);
  for(const tableZ of [4.30,6.57]) {
    metals.add(round,0x635349,-10.02,1.22,tableZ,.033,.73,.033);
    metals.add(round,0xb69a75,-10.02,1.60,tableZ,.281,.037,.281);
    metals.add(round,0x625144,-10.02,.883,tableZ,.17,.033,.17);
    for(const side of [-1,1]){
      const z=tableZ+side*.405;
      metals.add(round,0x9b7152,-10.04,1.31,z,.155,.048,.155);
      for(const dx of [-.1,.1]) for(const dz of [-.085,.085])
        metals.beam(bronze,[-10.04+dx,.879,z+dz],[-10.04+dx*.84,1.29,z+dz*.84],.024);
      metals.beam(bronze,[-10.15,1.00,z-.082],[-9.93,1.00,z-.082],.023);
    }
  }
  round.dispose();
  // Set the cafe entry pair behind the display glazing; brass handles sit at hand height.
  for (const z of [14.5,14.96,15.39]) metal(bronze,front-.13,2.04,z,.075,2.25,.038);
  for (const z of [14.88,15.04]) {
    metal(0xc3a276,front-.014,1.88,z,.028,.43,.027);
    for(const y of [1.70,2.06]) metal(bronze,front-.07,y,z,.11,.027,.026);
  }
  // A recessed vestibule with a timber-lined return distinguishes the residential entry.
  stone(0x534338,-10.34,2.24,.15,.42,2.76,3.88);
  for(let i=0;i<37;i++) part(masonry,i%3 ? 0x947353 : 0x806044,-10.08,2.24,-1.63+i*.096,.14,2.76,.046);
  metal(dark,-9.90,2.29,.23,.23,2.82,1.77);
  for(const z of [-.18,.66]) {
    metal(0x425053,-9.765,2.25,z,.08,2.61,.777);
    metal(0xc3ad88,-9.667,1.82,z+(z<0?.29:-.29),.055,.40,.040);
  }
  stone(trim,-9.92,.827,.19,1.21,.054,3.84);
  const glass = new THREE.ShaderMaterial({
    uniforms:{skyline:{value:skyline}},
    transparent:true,depthWrite:false,
    vertexShader:`varying vec3 vWorld;void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`uniform sampler2D skyline;varying vec3 vWorld;void main(){
      vec3 view=normalize(vWorld-cameraPosition),r=reflect(view,vec3(1.,0.,0.));
      vec2 uv=vec2(atan(r.x,-r.z)*.46+.17,clamp((asin(clamp(r.y,-1.,1.))+.16)/.69,0.,1.));
      vec3 reflection=texture2D(skyline,uv).rgb*vec3(.68,.82,.81);
      float grazing=1.-abs(view.x);
      gl_FragColor=vec4(reflection,min(.46,.11+.45*grazing*grazing));
      #include <colorspace_fragment>
    }`
  });
  const glazing=new THREE.Mesh(new THREE.PlaneGeometry(cafeMax-cafeMin,2.62),glass);
  glazing.rotation.y=Math.PI/2;glazing.position.set(front-.14,2.26,cafeMid);
  scene.add(glazing);
  for(const z of [-.18,.66]) {
    const entryPane=new THREE.Mesh(new THREE.PlaneGeometry(.745,2.52),glass);
    entryPane.rotation.y=Math.PI/2;entryPane.position.set(-9.72,2.25,z);scene.add(entryPane);
  }
  function fascia(title,subtitle,width,height,x,y,z,background,letter) {
    const sheet=document.createElement('canvas');sheet.width=768;sheet.height=128;
    const ctx=sheet.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,768,128);
    ctx.fillStyle=letter;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='500 69px Georgia, serif';ctx.fillText(title,384,49);
    ctx.font='500 21px Arial, sans-serif';ctx.fillText(subtitle,384,105);
    const map=new THREE.CanvasTexture(sheet);map.colorSpace=THREE.SRGBColorSpace;
    face(map,width,height,[x,y,z],[0,Math.PI/2,0]);
  }
  fascia('M A N G L E','P A N A D E R Í A    ·    C A F É',4.28,.64,-8.997,4.30,cafeMid,'#80745d','#f2e4c4');
  fascia('8 1 0','B R I C K E L L   A V E N U E',2.30,.54,-8.993,4.31,.12,'#70644e','#f4ead2');
  const groundRot=[-Math.PI/2,0,0];
  const pavement=texture('./avenue-concrete.webp');
  for(const side of [-1,1]) {
    const pavementMesh=face(pavement,3.79,27.8,[side*7.598,.804,9],groundRot);
    if(side===1) pavementMesh.rotation.z=Math.PI;
    for(let i=0;i<14;i++) stone(i%4===0?0xb7ad97:trim,side*5.747,.773,-3.91+1.986*i,.094,.085,1.974);
  }
  face(texture('./avenue-asphalt.webp'),11.394,27.79,[0,.704,9],groundRot).userData.impactSurface='asphalt';
  cladding.mesh(scene,new THREE.MeshStandardMaterial({map:stoneMap,roughness:.88,vertexColors:true})).userData.impactSurface='solid';
  // Tree grates and curb inlets are flush with the paving; they add no obstacles.
  for(const tx of [-7.3,7.7]) for(const z of [0,21]){
    metal(0x514e43,tx,.81,z,1.28,.010,1.26);
    for(const side of [-1,1]) {
      for(let i=-7;i<=7;i++) {
        const off=i*.073,hole=Math.abs(off)<.24?.29:0;
        const len=.58-hole;
        metal(0x8f8979,tx+off,.818,z+side*(hole+len/2),.032,.012,len);
      }
      metal(0x9b927e,tx,.818,z+side*.61,1.28,.016,.035);
    }
  }
  for(const side of [-1,1]) for(const z of [1.5,18.2]){
    const x=side*5.48;
    metal(dark,x,.713,z,.36,.017,.70);
    for(let i=-4;i<=4;i++) metal(0x837d71,x,.724,z+i*.068,.33,.01,.027);
  }
}
