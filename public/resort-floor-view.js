import {atrium,grandStoryY,resortLevels,grandFurniture} from './grand-resort-layout.js';
import {createGrandAtrium} from './grand-atrium-view.js';
import {buildShowroomStage} from './lantern-stage.js';
import * as THREE from 'three';
import {resortFloor,resortChandeliers,resortFurniture,resortLounges,resortMachines} from './resort-floor-layout.js';

const {west,east,north,south,y: floor,ceiling} = resortFloor;
const tau = 2 * Math.PI;
const midX = (west + east) / 2, midZ = (north + south) / 2;
const brass = 0xbe955b, deepBrass = 0x73522c, bronze = 0x694523, champagne = 0xfde0a2;
const walnut = 0x3c2626, teal = 0x253337, deepTeal = 0x1d212a;
const themes = {
  sun: {name: 'GOLDEN HOUR',accent: '#e8ac57',glow: 0xffba63,shade: '#692939',symbol: '☀'},
  moon: {name: 'BLUE HOUR',accent: '#9ab8ff',glow: 0x709cfa,shade: '#24387f',symbol: '☾'},
  lotus: {name: 'LOTUS ROOM',accent: '#ffa5d0',glow: 0xf287c5,shade: '#652451',symbol: '✿'},
  oasis: {name: 'PALM HOUSE',accent: '#91f3ce',glow: 0x6ee6c5,shade: '#16564e',symbol: '✦'},
};

function canvas(width,height,draw) {
  const surface = document.createElement('canvas');
  surface.width = width;
  surface.height = height;
  draw(surface.getContext('2d'),width,height);
  return surface;
}

function texture(surface) {
  const map = new THREE.CanvasTexture(surface);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function textureMaterial(surface) {
  return new THREE.MeshBasicMaterial({map: texture(surface)});
}

function hexPath(g) {
  g.beginPath();
  g.moveTo(0,-51);
  g.lineTo(66,-35);
  g.lineTo(66,35);
  g.lineTo(0,51);
  g.lineTo(-66,35);
  g.lineTo(-66,-35);
  g.closePath();
}

function carpetPattern() {
  return canvas(288,232,(g,w,h) => {
    g.fillStyle = '#46263c';
    g.fillRect(0,0,w,h);
    for (const [x,y] of [[72,58],[216,174],[216,-58],[72,290],[-72,174],[360,58]]) {
      g.save();
      g.translate(x,y);
      for (const turn of [0,Math.PI]) {
        g.rotate(turn);
        const petal = g.createLinearGradient(0,3,0,64);
        petal.addColorStop(0,'#a44e56');
        petal.addColorStop(1,'#66324b');
        g.fillStyle = petal;
        g.beginPath();
        g.moveTo(-51,19);
        g.bezierCurveTo(-40,59,-13,50,0,77);
        g.bezierCurveTo(12,54,40,59,51,19);
        g.bezierCurveTo(28,35,18,20,0,7);
        g.bezierCurveTo(-18,20,-28,35,-51,19);
        g.fill();
        for (const side of [-1,1]) {
          g.strokeStyle = '#ae6f6c';
          g.lineWidth = 1.35;
          for (let i=0;i<5;i++) {
            g.beginPath();
            g.moveTo(0,61-i*5);
            g.quadraticCurveTo(side*(31-i*4),50-i*4,side*(44-i*7),26-i*.9);
            g.stroke();
          }
        }
      }
      hexPath(g);
      g.strokeStyle = '#7a4e65';
      g.lineWidth = 2.7;
      g.stroke();
      g.scale(.91,.88);
      hexPath(g);
      g.strokeStyle = '#9a6d73';
      g.lineWidth = 1.25;
      g.stroke();
      g.fillStyle = '#d29b72';
      g.rotate(Math.PI / 4);
      g.fillRect(-4,-4,8,8);
      g.restore();
    }
    let seed = 492;
    for (let i=0;i<23000;i++) {
      seed = Math.imul(1664525,seed) + 1013904223;
      const x = (seed >>> 7) % w, y = (seed >>> 19) % h;
      g.fillStyle = i % 3 ? '#ffe3b812' : '#0d12222d';
      g.fillRect(x,y,1,1 + (i % 2));
    }
  });
}

function carpet() {
  const width = east - west, depth = south - north, pixels = 68, res = carpetPattern();
  return canvas(width*pixels,depth*pixels,g => {
    const pattern = g.createPattern(res,'repeat');
    pattern.setTransform(new DOMMatrix().scale(.57/pixels));
    g.scale(pixels,pixels);
    g.translate(-west,-north);
    g.fillStyle = pattern;
    g.fillRect(west,north,width,depth);
    for (const [left,right] of [[-57.32,-57.04],[-52.96,-52.68]]) {
      g.fillStyle = '#613649';
      g.fillRect(left,north,right-left,depth);
      g.fillStyle = '#bd825b';
      for (const offset of [.043,right-left-.057]) g.fillRect(left+offset,north,.016,depth);
      g.fillStyle = '#f1b885a6';
      for (let z=north+.08;z<south;z+=.13) g.fillRect((left+right)*.5-.023,z,.046,.032);
    }
    for (const {x,z,radius} of resortChandeliers) {
      const shine = g.createRadialGradient(x,z,.18,x,z,radius*3.2);
      shine.addColorStop(0,'#ffc08438');
      shine.addColorStop(.5,'#ffc08416');
      shine.addColorStop(1,'#ffc08400');
      g.fillStyle = shine;
      g.fillRect(x-6,z-6,12,12);
    }
    for (const {x,z,w,d} of resortFurniture) {
      g.save();
      g.translate(x,z);
      g.scale(Math.max(.31,w*.73),Math.max(.31,d*.72));
      const shadow = g.createRadialGradient(0,0,.22,0,0,1);
      shadow.addColorStop(0,'#120b19d9');
      shadow.addColorStop(.65,'#120b1980');
      shadow.addColorStop(1,'#120b1900');
      g.fillStyle = shadow;
      g.fillRect(-1,-1,2,2);
      g.restore();
    }
  });
}

function screenArt(theme) {
  const {name,accent,shade,symbol} = theme;
  return canvas(256,512,(g,w,h) => {
    g.fillStyle = '#10131f';
    g.fillRect(0,0,w,h);
    const image = g.createRadialGradient(128,110,18,128,90,150);
    image.addColorStop(0,accent);
    image.addColorStop(.4,shade);
    image.addColorStop(1,'#120f21');
    g.fillStyle = image;
    g.fillRect(10,7,236,240);
    g.strokeStyle = accent;
    g.lineWidth = 1.75;
    g.strokeRect(10,7,236,240);
    g.strokeRect(18,15,220,224);
    g.save();
    g.translate(128,104);
    for (let i=0;i<18;i++) {
      g.rotate(tau/18);
      g.beginPath();
      g.moveTo(49,0);
      g.lineTo(62,0);
      g.stroke();
    }
    g.beginPath();
    g.arc(0,0,44,0,tau);
    g.stroke();
    g.restore();
    g.textAlign = 'center';
    g.fillStyle = '#fff4db';
    g.font = '64px Georgia, serif';
    g.fillText(symbol,128,127);
    g.fillStyle = accent;
    g.font = 'bold 25px Georgia, serif';
    g.fillText(name,128,196);
    g.font = '10px Arial, sans-serif';
    g.fillText('L A N T E R N   C L U B',128,220);
    g.fillStyle = shade;
    g.fillRect(0,256,w,234);
    g.fillStyle = '#0e1424';
    g.fillRect(9,266,238,214);
    g.strokeRect(9,266,238,214);
    g.fillStyle = accent;
    g.font = 'bold 11px Arial, sans-serif';
    g.fillText('25¢  •  5 LINES',128,289);
    const reels = ['7',symbol,'BAR'];
    for (let i=0;i<3;i++) {
      const x = 22+i*73;
      const reel = g.createLinearGradient(0,304,0,428);
      reel.addColorStop(0,'#928486');
      reel.addColorStop(.5,'#fff4d7');
      reel.addColorStop(1,'#98909e');
      g.fillStyle = reel;
      g.fillRect(x,304,67,123);
      g.fillStyle = i % 2 ? shade : '#8e2641';
      g.font = i===2 ? 'bold 18px Arial, sans-serif' : 'bold 37px Georgia, serif';
      g.fillText(reels[i],x+33,378);
      g.globalAlpha = .34;
      g.font = '21px Georgia, serif';
      g.fillText(reels[(i+1)%3],x+33,326);
      g.fillText(reels[(i+2)%3],x+33,418);
      g.globalAlpha = 1;
    }
    g.fillStyle = accent;
    g.font = 'bold 10px Arial, sans-serif';
    g.fillText('CREDIT',47,448);
    g.fillText('WIN',212,448);
    g.fillStyle = '#fff4db';
    g.font = '14px monospace';
    g.fillText('000',47,467);
    g.fillText('000',212,467);
    g.fillStyle = '#ffffff0b';
    for (let y=0;y<h;y+=3) g.fillRect(0,y,w,1);
    const glass = g.createLinearGradient(0,0,w,h*.33);
    glass.addColorStop(.16,'#ffffff00');
    glass.addColorStop(.235,'#e9e5ff2e');
    glass.addColorStop(.24,'#e9e5ff00');
    g.fillStyle = glass;
    g.fillRect(0,0,w,h);
  });
}

function signArt(title,subtitle) {
  return canvas(1024,226,(g,w,h) => {
    g.fillStyle = '#25232b';
    g.fillRect(0,0,w,h);
    const border = g.createLinearGradient(0,0,w,h);
    border.addColorStop(0,'#b28a57');
    border.addColorStop(.49,'#ffe1a2');
    border.addColorStop(1,'#bf8e59');
    g.strokeStyle = border;
    g.lineWidth = 4;
    g.strokeRect(11,11,w-22,h-22);
    g.lineWidth = 1.5;
    g.strokeRect(20,20,w-40,h-40);
    for (const side of [-1,1]) {
      for (let i=0;i<4;i++) {
        g.beginPath();
        g.moveTo(w/2+side*302,103+9*i);
        g.lineTo(w/2+side*(360+i*16),69+9*i);
        g.lineTo(w/2+side*471,69+9*i);
        g.stroke();
      }
    }
    g.textAlign = 'center';
    g.fillStyle = '#ffe4b5';
    g.font = '57px Georgia, serif';
    g.fillText(title,w/2,subtitle?117:132);
    if (subtitle) {
      g.fillStyle = '#dfb980';
      g.font = '26px Georgia, serif';
      g.fillText(subtitle,w/2,166);
    }
  });
}

function interiorFinish(polished) {
  const material = new THREE.MeshBasicMaterial({vertexColors: true});
  // The fixtures are baked into the room's diffuse light. Polished surfaces pick up
  // bands of warm reflection as the player moves, without extra lights on the city.
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 roomP, roomN;\n'+shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n roomP=position; roomN=normal;');
    shader.fragmentShader = 'varying vec3 roomP, roomN;\n'+shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 n = normalize(roomN);
      vec2 p = roomP.xz;
      float spot = 0.0;
      ${resortChandeliers.map(({x,z,radius}) =>
        'spot = max(spot, exp(-dot(p-vec2('+x.toFixed(2)+','+z.toFixed(2)+'),p-vec2('+x.toFixed(2)+','+z.toFixed(2)+'))*'+(.24/radius).toFixed(3)+'));').join('\n')}
      float diffuse = .75+.23*n.y+.29*spot+.17*max(0.,dot(n,vec3(.54,.36,.53)));
      diffuseColor.rgb *= vec3(1.12,1.0,.91)*diffuse;
      ${polished?`
        vec3 r=reflect(normalize(roomP-cameraPosition),n);
        float band=pow(.5+.5*sin(r.z*17.+r.y*7.),9.);
        float hot=pow(max(0.,dot(r,normalize(vec3(.17,.73,.61)))),8.);
        diffuseColor.rgb+=vec3(.38,.185,.075)*(.22*band+.51*hot)*(.65+.35*spot);
      `:`
        float fiber=.982+.018*sin(roomP.y*220.)*sin((p.x+p.y)*251.);
        diffuseColor.rgb *= fiber;
      `}
    `);
  };
  material.customProgramCacheKey = () => polished ? 'resort-polished' : 'resort-fabric';
  return material;
}

export function resortFloorView(scene,Batch) {
  const updateAtrium=createGrandAtrium(scene,Batch);
  const room = new THREE.Group();
  room.name = 'Lantern Club gaming floor';
  scene.add(room);
  const matte = new Batch(), metal = new Batch(), luminous = new Batch();
  const accents = new Batch();
  const box = new THREE.BoxGeometry();
  const drum = new THREE.CylinderGeometry(.5,.5,1,18);
  const bead = new THREE.SphereGeometry(.5,8,5);
  const leaf = new THREE.SphereGeometry(.5,6,3);
  const globe = new THREE.OctahedronGeometry(.5);
  const cushion = new THREE.SphereGeometry(.5,12,8);
  const vertices = cushion.attributes.position;
  const round = value => .5*Math.sign(value)*Math.abs(2*value)**.42;
  for (let i=0;i<vertices.count;i++) {
    vertices.setXYZ(i,round(vertices.getX(i)),round(vertices.getY(i)),round(vertices.getZ(i)));
  }
  cushion.computeVertexNormals();

  const trackMat = new THREE.MeshBasicMaterial({vertexColors: true});
  const glowMat = new THREE.MeshBasicMaterial({vertexColors: true});
  const skin = interiorFinish(false), trim = interiorFinish(true);
  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(east-west,south-north).rotateX(-Math.PI/2),
    textureMaterial(carpet())
  );
  floorMesh.position.set(midX,floor+.015,midZ);
  room.add(floorMesh);

  function plate(material,w,h,x,y,z,yaw) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);
    panel.position.set(x,y,z);
    panel.rotation.y = yaw;
    room.add(panel);
  }

  // Create a local frame for repeating joinery and furniture in world space.
  const angles = new THREE.Euler();
  function frame(x,y,z,yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const point = (u,v,d) => [x+u*c+d*s,y+v,z-u*s+d*c];
    const put = (batch,geometry,color,u,v,d,w,h,depth,rx=0) => {
      angles.set(rx,yaw,0,'YXZ').reorder('XYZ');
      batch.add(geometry,color,...point(u,v,d),w,h,depth,angles.x,angles.y,angles.z);
    };
    return {
      put,
      point,
      block: (batch,...args) => put(batch,box,...args),
      bar: (batch,color,a,b,w,d=w) => batch.beam(color,point(...a),point(...b),w,d),
    };
  }

  const head = ceiling-floor;
  const wallTop = 3.98;
  function paneling(x,z,length,yaw) {
    const {block,bar} = frame(x,floor,z,yaw);
    block(matte,deepTeal,0,head*.5,-.045,length,head,.09);
    block(matte,walnut,0,.52,.016,length,1.0,.052);
    block(metal,deepBrass,0,.074,.051,length,.095,.045);
    block(metal,brass,0,.99,.05,length,.027,.058);
    block(matte,walnut,0,wallTop+.08,.048,length,.14,.20);
    block(metal,deepBrass,0,wallTop+.154,.095,length,.036,.19);
    block(luminous,champagne,0,wallTop+.177,.112,length,.018,.145);
    block(matte,teal,0,wallTop+.43,.032,length,.46,.087);
    block(metal,brass,0,head-.13,.11,length,.051,.157);
    const bays = Math.round(length / 2.35);
    const span = length / bays;
    for (let i=0;i<bays;i++) {
      const u = (i+.5)*span - length*.5;
      const line = u-span*.5;
      block(matte,teal,u,2.42,.017,span-.20,2.76,.04);
      block(matte,0x262a32,u,2.47,.039,span-.32,2.62,.016);
      block(matte,walnut,line,2.35,.065,.124,2.84,.097);
      block(metal,deepBrass,line,2.35,.122,.032,2.84,.037);
      for (const side of [-1,1]) {
        block(metal,0x875f38,u,2.44+side*1.22,.053,span-.55,.012,.012);
        block(metal,0x875f38,u+side*(span-.55)*.5,2.44,.054,.012,2.44,.012);
      }
      // Reeds stay subtle and the taller divisions give the room a scale from the entrance.
      for (let j=-3;j<=3;j++) block(matte,0x583837,u+j*.14,.51,.050,.038,.74,.024);
      if (i % 2 === 0) {
        for (const dir of [-1,1]) {
          bar(metal,brass,[u,2.16,.076],[u+dir*.39,2.87,.076],.021,.016);
          bar(metal,deepBrass,[u,2.14,.075],[u+dir*.55,2.66,.075],.017,.014);
          bar(metal,deepBrass,[u,2.13,.075],[u+dir*.60,2.47,.075],.015,.014);
        }
        bar(metal,brass,[u,2.13,.075],[u,2.99,.075],.016,.014);
      }
    }
  }
  paneling(-67.26,39.28,8.92,0);
  paneling(-52.74,39.28,12.92,0);
  paneling(-71.72,42.15,5.52,Math.PI/2);
  paneling(-71.72,51.40,6.42,Math.PI/2);
  paneling(-64.36,54.72,14.72,Math.PI);
  paneling(-49.64,54.72,6.72,Math.PI);
  paneling(-46.28,41.89,5.22,-Math.PI/2);
  paneling(-46.28,51.11,7.22,-Math.PI/2);

  function doorHeader(x,z,yaw,width) {
    const {block} = frame(x,3.85,z,yaw);
    const height = ceiling-3.85;
    block(matte,deepTeal,0,height*.5,-.044,width,height,.10);
    block(metal,deepBrass,0,.032,.027,width,.053,.055);
    block(matte,walnut,0,height-.505,.059,width,.124,.16);
    block(luminous,champagne,0,height-.44,.083,width,.016,.099);
  }
  doorHeader(-61,39.28,0,3.6);
  doorHeader(-55,54.72,Math.PI,4);
  doorHeader(-46.28,46,-Math.PI/2,3);

  function wallSign(x,z,yaw,width,title,subtitle,y,backHeight) {
    const {block,point} = frame(x,y,z,yaw);
    block(matte,walnut,0,0,-.013,width+.24,backHeight+.08,.11);
    block(metal,deepBrass,0,0,.053,width+.07,backHeight+.024,.043);
    plate(textureMaterial(signArt(title,subtitle)),width,backHeight,...point(0,0,.078),yaw);
  }
  wallSign(-57.05,39.54,0,1.58,'B L A C K J A C K','',2.55,.48);
  wallSign(-61,39.30,0,3.45,'H O T E L','',4.23,.57);
  wallSign(-71.50,51.60,Math.PI/2,4.55,'C O C K T A I L S','L O U N G E',3.27,.99);
  wallSign(-55,54.69,Math.PI,3.90,'V A L E T','',4.23,.57);
  wallSign(-46.31,46,-Math.PI/2,2.85,'E X I T','',4.23,.57);

  const galleryCeiling=grandStoryY(1)-.25;
  for(const deck of resortLevels[1].decks){
    matte.add(box,0x29232d,deck.x,galleryCeiling,deck.z,deck.w-.16,.08,deck.d-.13);
    for(const side of [-1,1]){
      metal.add(box,brass,deck.x+side*(deck.w/2-.28),galleryCeiling-.055,deck.z,.055,.04,deck.d-.40);
      luminous.add(box,champagne,deck.x,galleryCeiling-.058,deck.z+side*(deck.d/2-.26),deck.w-.45,.035,.050);
    }
  }

  function chandelier(batch,shine,pulse,x,z,radius,top,drop) {
    const spokes = radius < .65 ? 12 : 24;
    batch.add(drum,deepBrass,x,top-.04,z,radius*.47,.081,radius*.47);
    batch.add(drum,brass,x,top-drop*.39,z,.041,drop*.7,.041);
    batch.add(drum,brass,x,top-drop*.67,z,radius*.34,.093,radius*.34);
    shine.add(drum,champagne,x,top-drop*.67-.058,z,radius*.27,.05,radius*.27);
    for (let i=0;i<spokes;i++) {
      const a = i*tau/spokes, sin = Math.sin(a), cos = Math.cos(a);
      const y = top-drop*.68 - (i%2)*drop*.105;
      const xx = x+cos*radius, zz = z+sin*radius;
      batch.beam(brass,[x+cos*radius*.12,y+.025,z+sin*radius*.12],[xx,y+.062,zz],.023,.042);
      batch.add(drum,brass,xx,y+.075,zz,.09,.035,.09);
      const size = (.073 + (i%3)*.011) * Math.min(1.4,radius+.38);
      shine.add(globe,i%3===1?0xffd493:0xffeacc,xx,y-.065,zz,size,drop*.31,size,0,a,0);
      shine.add(globe,0xffedc6,x+cos*radius*.67,y+.027,z+sin*radius*.67,size*.83,drop*.28,size*.83,0,a,0);
      if (i%3===0) pulse.add(bead,0xffeac1,xx,y-.08,zz,size*.39,drop*.26,size*.39);
    }
  }
  for (const {x,z,radius} of resortChandeliers) {
    if(x>atrium.west && x<atrium.east && z>atrium.north)continue;
    chandelier(metal,luminous,accents,x,z,radius,galleryCeiling-.08,.84);
  }

  const screenMaterials = Object.fromEntries(Object.entries(themes).map(([name,theme]) =>
    [name,textureMaterial(screenArt(theme))]));
  const screenGeometry = new THREE.PlaneGeometry(.684,1.284);
  const screenFixtures = Object.fromEntries(Object.keys(themes).map(name => [name,[]]));
  const lamps = Object.fromEntries(Object.keys(themes).map(name => [name,new Batch()]));
  const pose = new THREE.Object3D();
  const upperSlots=grandFurniture[1].filter(p=>p.kind==='slot').map(({x,z},i)=>({
    x,z,stoolZ:z+1.12,face:1,theme:['sun','moon','lotus','oasis'][i%4],machineY:grandStoryY(1),
  }));
  for (const {x,z,stoolZ,face,theme,machineY=floor} of [...resortMachines,...upperSlots]) {
    const {put,block,point} = frame(x,machineY,z,face===1?0:Math.PI);
    const {glow} = themes[theme];
    const sideChrome = theme === 'moon' ? 0x7892ab : brass;
    block(matte,0x211e28,0,.05,0,.87,.10,.87);
    block(matte,0x302733,0,.48,.025,.76,.82,.67);
    block(metal,0x44343b,0,.2,.334,.72,.21,.075);
    block(matte,0x211f2c,0,1.51,-.139,.76,1.39,.63,-.06);
    block(metal,0x473643,0,2.195,-.152,.83,.14,.64,-.06);
    block(metal,0x322d37,0,.916,.178,.855,.20,.63,-.25);
    block(metal,sideChrome,0,.842,.438,.746,.025,.046,-.25);
    block(matte,0x1c2130,0,.443,.378,.38,.13,.031);
    for (const u of [-.403,.403]) {
      block(metal,0x392d39,u,1.54,-.102,.061,1.31,.615,-.06);
      block(metal,sideChrome,u,1.54,.176,.06,1.31,.079,-.06);
      block(lamps[theme],glow,u,1.57,.219,.022,1.195,.023,-.06);
      block(lamps[theme],glow,u,.9,.458,.041,.038,.015);
    }
    block(metal,0x684d4e,0,1.48,.191,.736,1.35,.061,-.06);
    pose.position.set(...point(0,1.49,.229));
    pose.rotation.set(-.06,face===1?0:Math.PI,0,'YXZ');
    pose.updateMatrix();
    screenFixtures[theme].push(pose.matrix.clone());
    block(lamps[theme],glow,0,2.218,.174,.73,.025,.034);
    for (const u of [-.19,-.10,0,.106,.239]) {
      put(lamps[theme],drum,u===.239?0xffe9bc:glow,u,1.06,.268,u===.239?.097:.067,.025,.065,-.25);
    }
    block(metal,sideChrome,.244,.691,.370,.118,.042,.038);
    block(matte,0x131721,.244,.693,.394,.086,.012,.012);
    luminous.add(box,0xb5eda6,x+face*.318,machineY+.718,z+face*.400,.025,.016,.013);
    metal.add(drum,sideChrome,x,machineY+.037,stoolZ,.49,.068,.49);
    metal.add(drum,deepBrass,x,machineY+.322,stoolZ,.085,.57,.085);
    metal.add(drum,sideChrome,x,machineY+.217,stoolZ,.36,.037,.36);
    matte.add(cushion,0x593349,x,machineY+.633,stoolZ,.52,.113,.52);
    matte.add(cushion,0x623b50,x,machineY+.728,stoolZ+face*.192,.49,.15,.15);
  }
  for (const [theme,fixtures] of Object.entries(screenFixtures)) {
    const screens = new THREE.InstancedMesh(screenGeometry,screenMaterials[theme],fixtures.length);
    fixtures.forEach((matrix,index) => screens.setMatrixAt(index,matrix));
    room.add(screens);
  }

  function seating({x,z,span,depth,yaw,fabric,kind}) {
    const {put,block} = frame(x,floor,z,yaw);
    const tones = fabric === 'wine' ? [0x71364a,0x86435a,0x562d3e] : [0x325f58,0x41716a,0x2a4a4a];
    const sofa = kind === 'sofa';
    put(matte,cushion,tones[2],0,.279,0,span,.34,depth);
    put(matte,cushion,tones[0],0,sofa?.77:.72,-depth*.37,span,sofa?.70:.63,.264,-.071);
    const count = sofa ? 3 : 1, wide = (span-.32)/count;
    for (let i=0;i<count;i++) {
      const u = (i+.5-count/2)*wide;
      put(matte,cushion,tones[1],u,.448,.022,wide-.013,.187,depth*.72,-.075);
      put(matte,cushion,tones[1],u,sofa?.78:.725,-depth*.31,wide-.010,sofa?.522:.432,.201,-.139);
      if (!sofa) continue;
      for (const n of [-1,1]) {
        put(matte,bead,tones[2],u+n*.187,.81,-depth*.193,.033,.028,.024);
      }
    }
    for (const side of [-1,1]) {
      put(matte,cushion,tones[0],side*(span*.5-.088),.58,0,.176,.347,depth*.93);
      for (const j of [-1,1]) {
        put(metal,drum,deepBrass,side*(span*.5-.135),.088,j*depth*.36,.071,.166,.071);
      }
    }
    block(metal,deepBrass,0,.155,depth*.45,span-.20,.025,.037);
  }

  function glass(x,y,z) {
    metal.add(drum,0x9b8f77,x,y+.049,z,.075,.098,.075);
    metal.add(drum,0xd9be75,x,y+.10,z,.075,.011,.075);
    luminous.add(drum,0xc58c50,x,y+.106,z,.058,.006,.058);
    metal.add(drum,0xc2a36a,x,y+.009,z,.14,.018,.14);
  }
  for (const piece of resortLounges) {
    const {x,z,kind,w,d} = piece;
    switch (kind) {
      case 'sofa':
      case 'chair':
        seating(piece);
        break;
      case 'coffee':
        metal.add(drum,deepBrass,x,floor+.038,z,.54,.071,.54);
        metal.add(drum,brass,x,floor+.229,z,.15,.39,.15);
        metal.add(drum,deepBrass,x,floor+.425,z,w,.043,d);
        metal.add(drum,0x233938,x,floor+.454,z,w-.025,.028,d-.025);
        metal.add(drum,0xd9ae6f,x+.16,floor+.477,z+.09,.25,.022,.24);
        glass(x-.19,floor+.469,z-.13);
        glass(x+.10,floor+.469,z+.25);
        break;
      case 'console':
        matte.add(box,walnut,x,floor+.494,z,w-.07,.89,d-.092);
        metal.add(box,0x445555,x,floor+.948,z,w,.043,d);
        metal.add(box,brass,x+w*.48,floor+.925,z,.031,.029,d);
        for (const v of [-.64,-.22,.22,.64]) {
          metal.add(box,deepBrass,x+w*.412,floor+.65,z+v,.024,.04,.142);
          glass(x,floor+.97,z+v);
        }
        break;
      case 'planter': {
        metal.add(drum,deepBrass,x,floor+.327,z,w,.654,d);
        metal.add(drum,brass,x,floor+.64,z,w+.019,.022,d+.019);
        matte.add(drum,0x372e2e,x,floor+.653,z,w*.89,.015,d*.89);
        for (let i=0;i<9;i++) {
          const a = i*tau/9, sin = Math.sin(a), cos = Math.cos(a), reach = .48+.11*(i%3);
          const height = 1.49+.13*(i%3);
          matte.beam(0x487559,[x,floor+.64,z],[x+sin*reach*.61,floor+height,z+cos*reach*.61],.028);
          for (let j=1;j<=4;j++) {
            const r = reach*(.27+.19*j), h = floor+height+.086*Math.sin(j)-(.02*j*j);
            for (const side of [-1,1]) {
              matte.add(leaf,j%2===0?0x416850:0x345a49,
                x+sin*r+cos*side*.045,h,z+cos*r-sin*side*.045,.075,.037,.254,.37,a+side*.76,0);
            }
          }
        }
        break;
      }
    }
  }

  matte.mesh(room,skin,false);
  metal.mesh(room,trim,false);
  luminous.mesh(room,glowMat,false);
  accents.mesh(room,trackMat,false);
  const edgeLights = Object.values(lamps).map(batch => {
    const material = trackMat.clone();
    batch.mesh(room,material,false);
    return material;
  });

  const lobbies = [-56,-18].map(x => {
    const lobby = new THREE.Group();
    lobby.name = 'Lantern Club lobby ceiling';
    scene.add(lobby);
    const fittings = new Batch(), light = new Batch();
    const top = 3.77;
    for (const dx of [-1.78,1.78]) {
      fittings.add(box,deepTeal,x+dx,top-.023,69,.35,.041,6.15);
      fittings.add(box,deepBrass,x+dx,top-.049,69,.15,.028,6.15);
      light.add(box,0xf3c98d,x+dx,top-.066,69,.053,.011,6.08);
    }
    for (const z of [67.37,70.63]) {
      chandelier(fittings,light,light,x,z,.52,top-.037,.37);
    }
    fittings.mesh(lobby,trim,false);
    light.mesh(lobby,glowMat,false);
    return {x,lobby};
  });

  for (const geometry of [box,drum,bead,leaf,globe,cushion]) geometry.dispose();

  const stage=buildShowroomStage(scene,Batch);
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let t = 0;
  return (dt,local) => {
    room.visible = Math.abs(local.x-midX)<45 && Math.abs(local.z-midZ)<42 && local.y<20;
    updateAtrium(dt,local);
    stage.visible=Math.abs(local.x+65)<42 && Math.abs(local.z-51)<45 && local.y<23;
    for (const {x,lobby} of lobbies) {
      lobby.visible = Math.abs(local.x-x)<24 && Math.abs(local.z-69)<23;
    }
    if (!room.visible || reducedMotion?.matches) return;
    t = (t + dt) % (tau*12);
    trackMat.color.setScalar(.90+.10*Math.sin(t*1.5));
    edgeLights.forEach((material,index) => {
      material.color.setScalar(.90+.10*Math.sin(t*(.75+.25*index)+index*1.8));
    });
  };
}
