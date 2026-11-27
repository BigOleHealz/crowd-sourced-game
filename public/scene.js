import {sidearmCar,carPistolGrip,carSource} from './car-sidearm.js';
import {pierFishingView} from './pier-fishing-view.js';
import {reefChannelView} from './reef-channel-view.js';
import {aquaticImpactView} from './aquatic-impact-view.js';
import {casinoView,casinoCast,dealerLooks,poseAtTable,uniformDealer} from './casino-view.js';
import {casinoSeat} from './casino-layout.js';
import {resortExterior} from './resort-exterior.js';
import {fitParadeBreeches} from './parade-costume.js';
import {streetRideView,riderPose} from './street-ride-view.js';
import {districtFireEffects} from './fire-effects.js';
import {eveningAtlas,eveningReady,eveningGLSL} from './evening-sky.js';
import {marketStockView} from './market-stock-view.js';
import {airborneCapsules} from './molotov-view.js';
import {poseVolleyball,volleyballActors,volleyballLooks,volleyballView} from './volleyball-view.js';
import {volleyballMember} from './volleyball-court.js';
import {carriedEquipment,scopedEyepiece} from './carried-equipment.js';
import {arcadeMeleeEquipment,arcadeSwordContacts} from './arcade-melee-view.js';
import {isArcadeMelee} from './arcade-melee-feedback.js';
import {inClub} from './club-lucero.js';
import {bankPresentation} from './bank-presentation.js';
import {buildingInteriorView} from './building-interior-view.js';
import {roomAtFeet,ridingHotelShaft} from './building-interiors.js';
import {gunfireAlarm,poseBystanderCover} from './bystander-cover.js';
import {bankCast,bankLooks,poseBankGuest} from './bank-lobby-cast.js';
import {poseBeachClub} from './beach-club-cast.js';
import {poseCabaret} from './club-lucero.js';
import {terrainWidth,terrainLength,terrainCols,terrainRows,ridgeX,ridgeZ} from './outpost-relief.js';
import {addOutpostCreek,riverbedTexture} from './outpost-creek.js';
import {updateWaterfrontBreeze} from './waterfront-breeze.js';
import {dogView} from './dog-view.js';
import {gullView} from './gull-view.js';
import {reefFishView} from './reef-fish-view.js';
import {spearOrigin} from './spearfishing.js';
import {spearfishingView} from './spearfishing-view.js';
import {dolphinView} from './dolphin-view.js';
import {sharkDogSpray} from './shark-dog-spray.js';
import {sharkView} from './shark-view.js';
import {createSharkDefeatView} from './shark-defeat-view.js';
import {manateeView} from './manatee-view.js';
import {cargoHookView} from './cargo-hook-view.js';
import {contactShadows} from './contact-shadows.js';
import {addFuelMarkers} from './fuel-markers.js';
import {createRoadGarages} from './road-garage-view.js';
import {streetHydrants} from './hydrant-view.js';
import {surfaceMarks} from './surface-marks.js';
import {tankView} from './tank-view.js';
import {helicopterAirframeScale,littleBirdModelScale} from './helicopter-layout.js';
import {tankPivot} from './tank-layout.js';
import {noise} from './terrain-noise.js';
import {trailDistance} from './road-surface.js';
import {monitorHeight} from './water-monitor.js';
import {cityTrafficView,poseTakeover} from './city-traffic-view.js';
import {fireEngineCameraContains,fireEngineCameraClearance} from './fire-engine-camera.js';
import {jetView} from './jet-view.js';
import {jetScale} from './jet-size.js';
import {outpostRunway} from './runway-layout.js';
import {teamNames} from './island-rules.js';
import {infectedLook,infectedWardrobe,poseInfected} from './zombie-view.js';
import {createCaseView} from './island-hud.js';
import {addPalms} from './coconut-palms.js';
import {paneBatch} from './pane-damage-view.js';
import {churchRoom} from './ridge-church.js';
import {buildRidgeChurch} from './ridge-church-view.js';
import {casaRoomAt} from './casa-luma.js';
import {inPalazzoMare} from './palazzo-mare.js';
import {viewPitch,zenith} from './view-pitch.js';
import {ridgeBench} from './north-ridge.js';
import {breakablePostView} from './breakable-post-view.js';
import {civilianLooks,civilianScanLooks,cabaretLooks,beachStaffLooks} from './civilian-style.js';
import {patrolProfile} from './patrol-uniform.js';
import {dressPerson} from './civilian-view.js';
import {distantResidents} from './resident-distance-view.js';
import {aimGlassPoint} from './rounds.js';
import {retailRoom} from './frontage-glass.js';
import {doorwayProximity} from './doorway-camera.js';
import {galleryRoomAt,galleryEntryDepth} from './gallery-lobbies.js';
import {roadLighting,skyDarkness} from './road-lighting.js';
import {vehicleWreckBurst,vehicleCrushDust} from './vehicle-wreck-view.js';
import {roadSplashView} from './road-splash-view.js';
import {doorX,storefrontRoom} from './storefront-layout.js';
import { applyLostParts, clearLostParts, characterBurst } from './character-hit-view.js';
import {superyachtView} from './superyacht-view.js';
import {aboardYacht,yachtHelmFeet,yachtRoomDepth,yachtSolidAt,yachtPoint,yachtSmoking} from './yacht-layout.js';
import {crewBoat} from './patrol-boats.js';
import {tireDebris} from './tire-debris.js';
import {trailMarkers} from './scenery-layout.js';
import {preloadPlayerScan, usePlayerScan, fitPlayerScan, fitCharacterScan} from './player-scan.js';
import {createCivilianScans} from './civilian-scans.js';
import {preloadScubaDiver, useScubaDiver, fitScubaDiver} from './scuba-diver-view.js';
import {preloadNathan, useNathan, fitNathan, poseNathan} from './player-nathan.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createRangerRig,poseBasketball,poseRoadBoarding,poseRig} from './ranger-pose.js';
import {sharkDefeatCamera,poseBittenSwimmer} from './shark-defeat.js';
import {poseRagdoll,releaseRagdoll} from './ragdoll-view.js';
import * as THREE from 'three';
import { bootSole, bootUpper, rangerMaterial, rangerIdentity, hood, maskPanel, fieldBib, visorLens, visorRim, trouserSeat, capCrown, fieldJacket, fieldCollar, fieldPack, sleeve, trousers, pocket, jointGarment } from './ranger-surfaces.js';
import { patrolBoatView } from './patrol-boat-view.js';
import {partyYachtView} from './party-yacht-view.js';
import {marinaFleetView} from './marina-fleet-view.js';
import {marinaHullContains,marinaModel} from './marina-fleet-layout.js';
import { missileLaunchers, missileView, turretView } from './mount-view.js';
import { mounts, mountPosition, vehicleById } from './mounts.js';
import { tracePulse } from './expedition.js';
import {createCheetahView} from './cheetah-view.js';
import { createRoverView } from './rover-view.js';
import { createSupplyView } from './supply-view.js';
import { conifers, granite, floorMaterial, alpineGlass, fieldPaint } from './landscape.js';
import { aircraftBody } from './aircraft-body.js';
import { cityStreets } from './brickell-scene.js';
import {addEisenhowerCarrier} from './eisenhower-carrier.js';
import {addBasketballCourt,basketballLooks} from './basketball-view.js';
import {basketballPose} from './basketball-pose.js';
import {onBasketballCourt} from './basketball-layout.js';
import { aircraftWreck } from './aircraft-wreck.js';
import { flightRounds } from './round-view.js';
import { missileCloud } from './missile-cloud.js';
import { surfacePicker } from './surface-hits.js';
import { buildStacks, buildOutpost, meadow } from './outpost.js';
import { CITY, MAP, BREAKABLES, HELIPAD, waterBlend, waterSurfaceAt, stanceDrop, stanceMuzzleHeight, terrainHeight, sceneryHeight, groundHeight, buildingTopAt } from './world.js';

// Static scenery gets merged by material so a forest costs the same number of
// draw calls as a single tree. All placements use the simulation's map.
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const color = (value) => new THREE.Color(value);
const cube = new THREE.BoxGeometry(1, 1, 1);
const stone = new THREE.IcosahedronGeometry(1, 0);
const trunk = new THREE.CylinderGeometry(0.79, 1, 1, 9);
const round = new THREE.SphereGeometry(1, 10, 8);
const vertexMaterial = () => new THREE.MeshLambertMaterial({ vertexColors: true });
const direction = new THREE.Vector3();
const transform = new THREE.Object3D();
const point = new THREE.Vector3();
const normal = new THREE.Vector3();
const normalsMatrix = new THREE.Matrix3();

function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export class Batch {
  constructor(textured=false) { this.uv=textured ? [] : null; }
  positions = [];
  normals = [];
  colors = [];
  indices = [];

  add(geometry, tint, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
    transform.position.set(x, y, z);
    transform.rotation.set(rx, ry, rz);
    transform.scale.set(sx, sy, sz);
    transform.updateMatrix();
    const matrix = transform.matrix;
    normalsMatrix.getNormalMatrix(matrix);
    const p = geometry.attributes.position, n = geometry.attributes.normal;
    const base = this.positions.length / 3;
    const uv=geometry.getAttribute('batchUv');
    const c = color(tint);
    for (let i = 0; i < p.count; i++) {
      point.fromBufferAttribute(p, i).applyMatrix4(matrix);
      normal.fromBufferAttribute(n, i).applyNormalMatrix(normalsMatrix);
      this.positions.push(point.x, point.y, point.z);
      this.normals.push(normal.x, normal.y, normal.z);
      this.colors.push(c.r, c.g, c.b);
      if (this.uv) this.uv.push(uv ? uv.getX(i) : .984, uv ? uv.getY(i) : .031);
    }
    const index = geometry.index;
    for (let i = 0, length = index ? index.count : p.count; i < length; i++) {
      this.indices.push(base + (index ? index.getX(i) : i));
    }
  }

  beam(tint, a, b, width, depth = width) {
    direction.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const length = direction.length();
    transform.quaternion.setFromUnitVectors(up, direction.normalize());
    const { x, y, z } = transform.rotation;
    this.add(cube, tint, (a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2, width, length, depth, x, y, z);
  }

  geometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    if (this.uv) geometry.setAttribute('uv',new THREE.Float32BufferAttribute(this.uv,2));
    geometry.setIndex(this.indices);
    return geometry;
  }

  mesh(parent, material, casts = true) {
    if (!this.indices.length) return;
    const mesh = new THREE.Mesh(this.geometry(), material);
    mesh.castShadow = casts;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

const up = new THREE.Vector3(0,1,0);
function addGround(scene,renderer,riverbed) {
  const geo=new THREE.PlaneGeometry(terrainWidth,terrainLength,terrainCols,terrainRows)
    .rotateX(-Math.PI/2).translate(0,0,(terrainWidth-terrainLength)/2);
  const terrainUV=geo.attributes.uv;
  for(let i=0;i<terrainUV.count;i++)terrainUV.setY(i,terrainUV.getY(i)*terrainLength/terrainWidth);
  const positions = geo.attributes.position;
  const cover = new Uint8Array(positions.count);
  const colors = [];
  const dark = color(0x4d573f), light = color(0xa2a27c);
  const path = color(0xb2a184), shale = color(0x85877b);
  const c = new THREE.Color();
  // Spread the outer vertices while retaining the original trail resolution.
  for (let i = 0; i < positions.count; i++) {
    const x=ridgeX(positions.getX(i));
    const z=ridgeZ(positions.getZ(i));
    positions.setX(i,x);positions.setZ(i,z);
    const y = sceneryHeight(x,z);
    positions.setY(i, y);
    const patches = noise(x*.18,z*.18);
    c.copy(dark).lerp(light, patches*.5 + noise(x*.045,z*.045)*.42);
    c.lerp(shale, clamp((MAP.waterY + 1.95 - y)*.65,0,.9));
    const clearing = Math.min(trailDistance(x,z), Math.hypot(x,z-15)*.56);
    c.lerp(path, clamp((2.02 - clearing + .67*(patches-.5))*2.3,0,1)*.94);
    const pad=clamp((2.9-Math.hypot(x-HELIPAD.x,z-HELIPAD.z))*2.5,0,1);
    c.lerp(shale,pad*.89);
    const verge=THREE.MathUtils.smoothstep(clearing+.8*(patches-.5),1.4,3.25);
    const dry=THREE.MathUtils.smoothstep(y,MAP.waterY+.4,MAP.waterY+1.6);
    cover[i]=Math.round(255*verge*dry*(1-pad));
    // Dark organic litter gathers at the bases of trees and stones.
    let shade=1;
    if(Math.abs(x)<35 && z<35 && z>MAP.northBound+2) {
      for(const tree of MAP.trees) {
        const dx=x-tree.x,dz=z-tree.z;
        if(dx*dx+dz*dz<5)shade=Math.min(shade,.66+.34*clamp((dx*dx+dz*dz)/5,0,1));
      }
      for(const rock of MAP.rocks){
        const dx=x-rock.x,dz=z-rock.z,r=rock.radius+1.05;
        if(dx*dx+dz*dz<r*r)shade=Math.min(shade,.58+.42*clamp((dx*dx+dz*dz)/(r*r),0,1));
      }
    }
    c.multiplyScalar(shade*(.76+.24*noise(x*.93,z*.93)+.12*noise(x*3,z*3)));
    colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.setAttribute('forestCover',new THREE.Uint8BufferAttribute(cover,1,true));
  geo.computeVertexNormals();
  const mat=floorMaterial(renderer,riverbed,MAP.waterY);
  const ground = new THREE.Mesh(geo,mat);
  ground.receiveShadow = true;
  scene.add(ground);
}

function addSky(scene) {
  const panorama=new THREE.TextureLoader().load(CITY ? './brickell-sky.webp' : './valley-horizon.webp');
  panorama.colorSpace=THREE.SRGBColorSpace;panorama.wrapS=THREE.MirroredRepeatWrapping;
  // The reflection photographs stay on glass; the sky itself spans a full
  // revolution. The outpost hemisphere includes the hills below the horizon.
  const atmosphere=new THREE.TextureLoader().load(CITY?'./biscayne-sky.webp':'./outpost-sky.webp');
  atmosphere.colorSpace=THREE.SRGBColorSpace;
  atmosphere.wrapS=THREE.RepeatWrapping;
  const sky=new THREE.Mesh(new THREE.SphereGeometry(278,48,22),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{eveningAtlas,eveningReady,panorama:{value:atmosphere},horizonTint:{value:scene.fog.color},skyDarkness},
    vertexShader:`varying vec3 skyDir;void main(){skyDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`${eveningGLSL}
varying vec3 skyDir;uniform sampler2D panorama;uniform vec3 horizonTint;uniform float skyDarkness;
      void main(){
        vec3 d=normalize(skyDir);
        float longitude=atan(d.x,-d.z)/6.28318530718+.5;
        float latitude=asin(clamp(d.y,-1.,1.));
        float elevation=${CITY?'max(0.,latitude)/1.57079632679':'(degrees(latitude)+26.)/116.'};
        vec3 sky=texture2D(panorama,vec2(longitude,elevation)).rgb;
        vec3 evening=eveningReflection(sky,longitude,latitude,skyDarkness);
        ${CITY?'sky=evening;':`vec3 terrain=sky*mix(vec3(1.),vec3(.065,.086,.14),skyDarkness);
        sky=mix(terrain,evening,smoothstep(.025,.18,latitude));`}
        ${CITY?'':'sky=mix(sky,horizonTint,.68*(1.-smoothstep(-.18,.10,latitude)));'}
        gl_FragColor=vec4(sky,1.);
        #include <colorspace_fragment>
      }`
  }));
  sky.frustumCulled=false;
  sky.onBeforeRender=(_r,_s,camera)=>{
    sky.matrixWorld.setPosition(camera.position);
    sky.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse,sky.matrixWorld);
  };
  sky.renderOrder=-20; scene.add(sky);
  return panorama;
}

function addBridge(scene,renderer,rng) {
  // Project the board finish along the longest local dimension of each beam,
  // including diagonal braces, before Batch transforms it into world space.
  const uv=[];
  class BridgeBatch extends Batch {
    add(shape,tint,x,y,z,sx,sy,sz,...rotation) {
      const pos=shape.attributes.position, normal=shape.attributes.normal;
      for(let i=0;i<pos.count;i++) {
        const px=pos.getX(i)*sx,py=pos.getY(i)*sy,pz=pos.getZ(i)*sz;
        const u=sx>=sy && sx>=sz ? px : sy>=sz ? py : pz;
        const v=sx>=sy && sx>=sz ? (Math.abs(normal.getY(i))>.5 ? pz : py)
          : sy>=sz ? (Math.abs(normal.getX(i))>.5 ? pz : px) : (Math.abs(normal.getY(i))>.5 ? px : py);
        uv.push(u*.43+z*.71+x*.15,v*1.2+y*.83+z*.33);
      }
      super.add(shape,tint,x,y,z,sx,sy,sz,...rotation);
    }
  }
  const batch=new BridgeBatch();
  const { x,z,width,length,y }=MAP.bridge;
  const boards=[0xa58b60,0xb29973,0x9e815c,0xa68d68];
  for(let i=0;i<32;i++) {
    const offset=(i+.5)*length/32-length/2;
    batch.add(cube,boards[i%4],x,y-.10,z+offset,width+.12*rng(),.20,length/32-.014,0,(rng()-.5)*.007);
  }
  for(const side of [-1,1]) {
    const xx=x+side*width/2;
    batch.add(cube,0x70583d,xx-.27*side,y-.26,z,.27,.36,length+.25);
    for(let i=0;i<5;i++) {
      const zz=z+(i-2)*2.4;
      batch.add(cube,0x70583f,xx,y+.37,zz,.16,1.2,.17);
      batch.add(cube,0xb39b70,xx,y+1.0,zz,.19,.065,.20);
      if(i % 2 === 0) batch.add(cube,0x615744,xx,y-1.4,zz,.23,2.66,.25);
    }
    batch.add(cube,0xa78c63,xx,y+.90,z,.15,.12,length-.28);
    batch.add(cube,0x867153,xx,y+.39,z,.08,.08,length-.30);
    for(let i=0;i<4;i++){
      const from=z+(i-2)*2.4;
      batch.beam(0x776649,[xx,y+.22,from+.1],[xx,y+.82,from+2.31],.083);
    }
  }
  const map=new THREE.TextureLoader().load('./sawn-timber.webp');
  map.wrapS=map.wrapT=THREE.MirroredRepeatWrapping;
  map.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const wood=new THREE.MeshLambertMaterial({map,vertexColors:true});
  const bridge=batch.mesh(scene,wood);
  bridge.userData.impactSurface='wood';
  bridge.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
}

function addTrailMarker(batch, x,z, heading, flag = false) {
  const y=terrainHeight(x,z);
  batch.add(cube,0x75634b,x,y+.79,z,.14,1.58,.15,0,heading);
  batch.add(cube,0xa38b5d,x,y+1.52,z,.50,.25,.15,0,heading);
  batch.add(cube,0xeee6bd,x+.087*Math.sin(heading),y+1.50,z+.087*Math.cos(heading),.30,.07,.015,0,heading);
  batch.add(cube,0xaf512e,x+.087*Math.sin(heading),y+1.59,z+.087*Math.cos(heading),.30,.06,.018,0,heading);
  if(flag) {
    const flagY=y+2.3;
    batch.add(cube,0x766047,x,y+1.2,z,.075,2.4,.075);
    batch.add(cube,0xcf6d40,x+.28,flagY,z,.57,.25,.025,0,.1,-.07);
  }
}

function signFace(scene,x,z,heading,text) {
  const board=document.createElement('canvas');board.width=384;board.height=104;
  const ink=board.getContext('2d');
  ink.fillStyle='#4b4531';ink.fillRect(0,0,384,104);
  for(let k=0;k<21;k++){
    const y=(k*39)%104;
    ink.fillStyle=k%3?'#514a36':'#413e30';ink.fillRect((k*109)%350,y,40+(k*71)%250,1+k%2);
  }
  ink.strokeStyle='#a59c7a';ink.lineWidth=3;ink.strokeRect(7,7,370,90);
  ink.fillStyle='#e3d9ab';ink.font='bold 42px sans-serif';ink.textAlign='center';ink.fillText(text,192,70);
  const map=new THREE.CanvasTexture(board);map.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.13,.31),new THREE.MeshLambertMaterial({map,side:THREE.DoubleSide}));
  sign.position.set(x+.091*Math.sin(heading),terrainHeight(x,z)+1.55,z+.091*Math.cos(heading));
  sign.rotation.y=heading;scene.add(sign);return sign;
}

function windsock(batch) {
  const x=HELIPAD.x+3.20,z=HELIPAD.z-2.85,y=groundHeight(x,z),mast=3.18;
  batch.add(trunk,0x727a73,x,y+mast/2,z,.042,mast,.042);
  batch.add(trunk,0x756f5b,x,y+.073,z,.20,.146,.20);
  const marks=[0xb65f37,0xd6ccb1,0xb65f37,0xd6ccb1,0xb65f37];
  const angle=.26;
  for(let k=0;k<5;k++){
    const fabric=new THREE.CylinderGeometry(.24-.026*k,.214-.026*k,.246,12,1,true);
    batch.add(fabric,marks[k],x+.13+.238*k,y+mast-.018*k*k,z,.99,1,1,0,0,Math.PI/2-angle*k*.24);
    fabric.dispose();
  }
  const rim=new THREE.TorusGeometry(.24,.011,5,16);
  batch.add(rim,0x7b7e6d,x+.007,y+mast,z,1,1,1,0,Math.PI/2);
  rim.dispose();
}

function addDetails(scene,batch, rng,posts) {
  const granite=[0x7c8179,0x8a897c,0x898d83,0x777f78];
  for(const marker of trailMarkers) {
    posts.add(marker.postId,marker.x,terrainHeight(marker.x,marker.z),marker.z,batch=>{
    addTrailMarker(batch,marker.x,marker.z,marker.heading,marker.h>2);
    return signFace(scene,marker.x,marker.z,marker.heading,marker.text);
    });
  }
  const {x,z}=ridgeBench,y=terrainHeight(x,z);
  for(const side of [-1,1])batch.add(cube,0x6b6555,x+side*.82,y+.21,z,.19,.45,.42);
  for(const dz of [-.14,.14])batch.add(cube,0x886741,x,y+.47,z+dz,2.35,.12,.24);
  batch.add(cube,0x805e3e,x,y+.70,z-.23,2.35,.16,.09);
  for(const side of [-1,1])batch.add(cube,0x655744,x+side*.83,y+.52,z-.23,.09,.47,.09);
  windsock(batch);
  for(let i=0;i<4100;i++) {
    const x=(rng()-.5)*79,z=(rng()-.5)*79,y=terrainHeight(x,z);
    if(y<MAP.waterY+.22 || Math.max(Math.abs(x),Math.abs(z))>34) continue;
    const d=trailDistance(x,z);
    if(d<1.7 && rng()>.12 || Math.hypot(x-HELIPAD.x,z-HELIPAD.z)<2.45) continue;
    if(d<1.7 || rng()<.08) {
      const size=(d<1.7 ? .03:.07)*(1+2*rng());
      batch.add(stone,granite[i%4],x,y+.008,z,size*1.12,size*.36,size*.8,0,rng()*TAU);

    }
  }
}

function contactShadowMap() {
  const stamp=document.createElement('canvas');
  stamp.width=stamp.height=32;
  const ctx=stamp.getContext('2d');
  const gradient=ctx.createRadialGradient(16,16,2,16,16,16);
  gradient.addColorStop(0,'rgba(255,255,255,1)');
  gradient.addColorStop(.55,'rgba(255,255,255,.65)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
  return new THREE.CanvasTexture(stamp);
}

function landingMarks(batch) {
  const {x, z} = HELIPAD;
  const h = (dx,dz) => groundHeight(x + dx,z + dz) + .035;
  // Fit both edges to the ground so the paint stays flush across the slope.
  function stripe(ax,az,bx,bz,width) {
    const dx=bx-ax,dz=bz-az,k=width/(2*Math.hypot(dx,dz));
    const ox=-dz*k,oz=dx*k;
    const corners=[[ax+ox,az+oz],[bx+ox,bz+oz],[bx-ox,bz-oz],[ax-ox,az-oz]];
    const positions=corners.flatMap(([u,v])=>[x+u,h(u,v),z+v]);
    const patch=new THREE.BufferGeometry();
    patch.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    patch.setIndex([0,1,2,0,2,3]);patch.computeVertexNormals();
    batch.add(patch,0xe8ddaa,0,0,0);
    patch.dispose();
  }
  const ringRadius = 2.35;
  for (let i = 0; i < 20; i++) {
    const a = i * TAU / 20, b = (i + .84) * TAU / 20;
    stripe(Math.sin(a)*ringRadius,Math.cos(a)*ringRadius,Math.sin(b)*ringRadius,Math.cos(b)*ringRadius,.073);
  }
  stripe(-.46,-.8,-.46,.8,.14);
  stripe(.46,-.8,.46,.8,.14);
  stripe(-.46,0,.46,0,.14);
}

function objectHealthLabel(scene,title) {
  const tag = document.createElement('canvas');
  tag.width=320; tag.height=64;
  const ink=tag.getContext('2d');
  const labelMap=new THREE.CanvasTexture(tag);
  labelMap.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:labelMap,transparent:true,depthWrite:false}));
  const labelPosition=new THREE.Vector3();
  label.onBeforeRender=(_renderer,_scene,camera)=>{
    label.getWorldPosition(labelPosition);
    const width=Math.min(1.9,labelPosition.distanceTo(camera.position)*.14);
    label.scale.set(width,width*.2,1);
    label.updateMatrixWorld();
  };
  scene.add(label);
  let labelHp, labelMax, labelRecovery, labelUnpiloted;
  function update(hp,maxHp,recovery,unpiloted=false) {
    if (hp===labelHp && maxHp===labelMax && recovery===labelRecovery && unpiloted===labelUnpiloted) return;
    labelHp=hp; labelMax=maxHp; labelRecovery=recovery; labelUnpiloted=unpiloted;
    const condition=hp/maxHp;
    ink.clearRect(0,0,320,64);
    ink.fillStyle='rgba(21,37,36,.90)';
    ink.fillRect(0,0,320,64);
    ink.font='bold 23px sans-serif';
    ink.textAlign='left';
    ink.fillStyle='#f8f5e8';
    ink.fillText(recovery!==null ? 'WRECKED' : unpiloted ? 'UNPILOTED' : title,12,28);
    ink.textAlign='right';
    ink.fillText(recovery===null ? hp+' / '+maxHp : 'RESET '+recovery+'s',308,28);
    ink.fillStyle='#53615d';
    ink.fillRect(12,40,296,12);
    ink.fillStyle=condition<=.30 ? '#ff8b61' : condition<=.60 ? '#f1c46b' : '#98dfad';
    ink.fillRect(12,40,296*condition,12);
    labelMap.needsUpdate=true;
  }

  return {sprite:label,update};
}

function fieldHelicopter(scene,material,shadowMap,panorama) {
  const group = new THREE.Group();
  scene.add(group);
  const hull = new Batch(), glazing=new Batch(), rotor = new Batch(), fan = new Batch();
  const olive=0x59614f, graphite=0x343b36, alloy=0x939489;
  const helicopterPanes=paneBatch(glazing);
  aircraftBody(hull,glazing,helicopterPanes);
  const wheel=new THREE.TorusGeometry(1,.36,8,20);
  hull.add(round,graphite,0,1.03,-1.87,.50,.13,.22);
  hull.add(cube,0x414840,0,1.07,-1.72,.95,.16,.24,-.30);
  // A glare shield below the pilots' sightline and an aft cabin lining give
  // the transparent flight-deck windows a recessed opaque interior.
  hull.add(round,0x252b29,0,1.16,-1.74,.57,.047,.236);
  const lining=new THREE.Shape();
  lining.moveTo(-.68,.77);lining.lineTo(.68,.77);lining.lineTo(.68,1.42);
  lining.quadraticCurveTo(.66,1.63,.42,1.66);lining.lineTo(-.42,1.66);
  lining.quadraticCurveTo(-.66,1.63,-.68,1.42);lining.closePath();
  const bulkhead=new THREE.ShapeGeometry(lining,4);
  hull.add(bulkhead,0x343a34,0,0,-.69,1,1,1,0,Math.PI);
  // Close the partition on the passenger-cabin side as well.
  hull.add(bulkhead,0x858474,0,0,-.675);
  bulkhead.dispose();
  // A continuous footwell, raised cargo deck and rear bench give each bay
  // its own depth when either the windshield or a sliding window is lost.
  hull.add(cube,0x474a43,0,.749,-1.28,1.20,.058,1.12);
  hull.add(cube,0x595c50,0,.691,.29,1.30,.055,1.90);
  hull.add(cube,0x7b796a,0,1.14,1.17,1.29,.82,.056);
  hull.add(cube,0x525950,0,.878,.84,1.15,.10,.40);
  hull.add(cube,0x626758,0,1.08,1.025,1.16,.38,.085);
  for(const x of [-.44,-.22,0,.22,.44])
    hull.add(cube,0x82877a,x,.726,.24,.018,.012,1.59);
  for(const x of [-.35,.35]){
    hull.add(cube,0x464d47,x,1.385,-.88,.21,.15,.095);
    hull.beam(0x393e39,[x,.79,-1.48],[x,1.00,-1.49],.023);
    hull.beam(0x5b6259,[x-.055,1.003,-1.49],[x+.055,1.003,-1.49],.024);
    hull.add(cube,0x242c2b,x,1.089,-1.58,.25,.112,.018);
    hull.add(cube,0x81ab9f,x,1.096,-1.567,.153,.052,.007);
    hull.add(cube,0x383e38,x,1.117,1.07,.057,.27,.025);
  }
  hull.add(cube,0x42483f,0,1.18,-.70,.30,.77,.024);
  hull.add(cube,0x72766a,.113,1.18,-.718,.033,.065,.017);
  for(const side of [-1,1]) {
    hull.add(cube,0x303833,side*.765,.973,-.83,.025,.069,.172);
    hull.add(cube,alloy,side*.785,.983,-.83,.029,.024,.116);
    hull.add(cube,0x303833,side*.763,.928,.80,.036,.073,.185);
    hull.add(cube,alloy,side*.787,.938,.80,.031,.024,.118);
    for(let k=0;k<9;k++) hull.add(round,0x8f9281,side*.757,.894,-.56+k*.122,.009,.010,.010);
  }
  // An upswept boom, fin and low stabilator form the distinctive tail silhouette.
  const fairing=new THREE.CylinderGeometry(.13,.31,3.05,10);
  hull.add(fairing,olive,0,1.54,3.40,1,1,.94,Math.PI/2-.13);
  const fin=new THREE.Shape();
  fin.moveTo(4.25,1.58);fin.lineTo(4.92,1.70);fin.lineTo(5.39,2.99);
  fin.lineTo(4.99,2.97);fin.lineTo(4.66,2.35);fin.closePath();
  const pylon=new THREE.ExtrudeGeometry(fin,{depth:.15,bevelEnabled:false});
  pylon.rotateY(-Math.PI/2);hull.add(pylon,olive,.075,0,0);
  const aerofoil=(outline,thickness)=>{
    const shape=new THREE.Shape(outline.map(([x,z])=>new THREE.Vector2(x,-z)));
    const geo=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false});
    return geo.rotateX(-Math.PI/2);
  };
  const stabilator=aerofoil([[-1.34,4.72],[1.34,4.72],[1.34,4.29],[.33,4.00],[-.33,4.00],[-1.34,4.29]],.055);
  hull.add(stabilator,olive,0,1.66,0);stabilator.dispose();
  for(const side of [-1,1]){
    hull.add(round,graphite,side*.35,.94,-1.28,.23,.16,.26);
    hull.add(round,0x42473e,side*.35,1.18,-.84,.22,.30,.08,-.12);
    // Paired turbine nacelles above the cabin with recessed mouths and rear exhausts.
    hull.add(round,olive,side*.45,1.70,.46,.316,.262,1.14);
    hull.add(trunk,graphite,side*.46,1.76,-.54,.228,.30,.20,Math.PI/2);
    hull.add(round,0x222923,side*.46,1.76,-.69,.182,.154,.038);
    for(let j=-2;j<=2;j++) hull.add(cube,0x737869,side*.46+.058*j,1.76,-.726,.014,.20,.014);
    hull.add(trunk,0x59564b,side*.48,1.73,1.14,.18,.49,.17,Math.PI/2-.17,side*.18);
    hull.add(round,0x252924,side*.51,1.77,1.36,.145,.14,.04);
    hull.add(round,graphite,side*.54,1.76,1.30,.235,.19,.33);
    hull.add(round,0x1c2220,side*.59,1.78,1.57,.16,.125,.07);
    hull.add(cube,0x555c50,side*.72,1.51,1.10,.11,.29,.55);
    for(let l=0;l<8;l++) hull.add(cube,graphite,side*.778,1.51,.90+.052*l,.018,.17,.022,-.15);
    hull.beam(0x292e2b,[side*.60,1.38,-1.84],[side*.35,1.26,-1.99],.017);
    hull.add(round,0xadb2a7,side*.29,.66,-2.30,.084,.055,.042);
    hull.beam(0x7a8073,[side*.39,1.64,-.90],[side*.39,1.77,-1.0],.024);
    hull.beam(graphite,[side*.78,.53,-.52],[side*.78,.53,.94],.039);
    for(const z of [-.48,.80]){
      hull.beam(alloy,[side*.67,.64,z],[side*.84,.42,z],.033);
      hull.add(cube,graphite,side*.797,1.02,z,.035,.042,.14);
    }
    hull.beam(olive,[side*.57,.77,-.72],[side*.98,.30,-.69],.094);
    hull.beam(graphite,[side*.68,.65,-.28],[side*.98,.27,-.69],.059);
    hull.add(wheel,0x272a26,side*.99,.258,-.69,.19,.19,.23,0,Math.PI/2);
    hull.add(trunk,alloy,side*.99,.258,-.69,.121,.17,.121,0,0,Math.PI/2);
    hull.add(round,side<0?0x9e4038:0x558a70,side*.83,1.24,.69,.045,.036,.049);
    hull.beam(graphite,[side*.31,1.35,-1.74],[side*.48,1.46,-1.57],.014);
  }
  hull.beam(graphite,[0,1.52,3.35],[0,.24,3.44],.090);
  hull.beam(olive,[0,1.45,2.85],[0,.28,3.44],.068);
  hull.add(wheel,0x272a26,0,.193,3.44,.142,.142,.15,0,Math.PI/2);
  hull.add(trunk,alloy,0,.193,3.44,.084,.13,.084,0,0,Math.PI/2);
  wheel.dispose();fairing.dispose();pylon.dispose();
  hull.add(round,olive,0,1.79,-.06,.36,.28,.51);
  hull.add(trunk,alloy,0,2.04,-.08,.085,.42,.085);
  hull.add(round,graphite,0,2.22,-.08,.205,.078,.205);
  const airframe=new THREE.Group();
  airframe.scale.setScalar(helicopterAirframeScale);group.add(airframe);
  const launchers=new Batch();missileLaunchers(launchers,'heli');
  const paint=fieldPaint();
  const legacyHull=hull.mesh(airframe,paint,false);
  Object.assign(legacyHull.userData,{impactSurface:'metal',vehicle:'heli',target:'heli'});
  const legacyLaunchers=launchers.mesh(group,paint,false);
  Object.assign(legacyLaunchers.userData,{impactSurface:'metal',vehicle:'heli',target:'heli'});
  const windows=glazing.mesh(airframe,alpineGlass(panorama,{transparent:true,opacity:.83,depthWrite:false}),false);
  Object.assign(windows.userData,{impactSurface:'solid',vehicle:'heli'});
  const updateGlass=helicopterPanes.bind(windows);
  const stencil=document.createElement('canvas');stencil.width=512;stencil.height=112;
  const st=stencil.getContext('2d');st.fillStyle='#a7ad98';st.textAlign='center';
  st.font='bold 76px sans-serif';st.fillText('GOY THEFT AUTO',256,88);
  const decal=new THREE.CanvasTexture(stencil);decal.colorSpace=THREE.SRGBColorSpace;
  const lettering=new THREE.MeshBasicMaterial({map:decal,transparent:true,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-2});
  const placard=new THREE.PlaneGeometry(.69,.105);
  const legacyPlacards=[];
  for(const side of [-1,1]){
    const id=new THREE.Mesh(placard,lettering);
    id.position.set(side*.773,.928,.12);id.rotation.y=side*Math.PI/2;
    airframe.add(id);legacyPlacards.push(id);
  }
  const blade=aerofoil([[-.06,.28],[.08,.28],[.13,.62],[.135,3.98],[-.035,4.40],[-.21,4.39],[-.11,3.92],[-.11,.62]],.026);
  for(let i=0;i<4;i++){
    const a=i*TAU/4, sn=Math.sin(a),cs=Math.cos(a);
    rotor.add(blade,graphite,0,0,0,1,1,1,0,a);
    rotor.beam(alloy,[sn*.07,-.055,cs*.07],[sn*.46,.016,cs*.46],.055);
    rotor.add(round,olive,sn*.28,.017,cs*.28,.085,.052,.105);
    fan.add(cube,graphite,0,Math.cos(a)*.365,Math.sin(a)*.365,.042,.69,.093,a);
    fan.add(cube,0xb3ad92,0,Math.cos(a)*.665,Math.sin(a)*.665,.043,.076,.093,a);
  }
  blade.dispose();
  const mainRotor=rotor.mesh(airframe,material,false);
  mainRotor.position.set(0,2.24,-.08);
  const tailHub=new THREE.Group();
  tailHub.position.set(.17,2.72,5.09);tailHub.rotation.z=.29;airframe.add(tailHub);
  const tailRotor=fan.mesh(tailHub,material,false);
  const replacementMaterials=new Set();
  let replacementFrame=null, modelMainRotor=null, modelTailRotor=null;
  new GLTFLoader().load('./mh-6-little-bird.glb',({scene:model})=>{
    // Sketchfab's root is already upright; turn its diagonal nose toward -Z.
    model.rotation.y=-43*Math.PI/180;
    model.scale.setScalar(littleBirdModelScale);
    model.position.y=1.3;
    model.traverse(node=>{
      if(node.isMesh){
        Object.assign(node.userData,{impactSurface:'metal',vehicle:'heli',target:'heli'});
        for(const mat of Array.isArray(node.material)?node.material:[node.material])replacementMaterials.add(mat);
      }
    });
    // The Sketchfab export merged both fixed rotors into the body mesh. Move
    // their triangles into separate meshes so they can spin without a second
    // set of blades being drawn over them.
    // Center of the GLB's rotor mast (the circular hub spans x=.028..178,
    // y=-.210..-.060). The blades must rotate about this point, not orbit it.
    const mainPivot=new THREE.Vector3(.103,-.135,.30);
    const tailPivot=new THREE.Vector3(-.803,.94,.097);
    modelMainRotor=new THREE.Group();modelMainRotor.position.copy(mainPivot);
    modelTailRotor=new THREE.Group();modelTailRotor.position.copy(tailPivot);
    let rotorParent=null;
    model.traverse(node=>{
      if(!node.isMesh || !node.geometry.index)return;
      const geometry=node.geometry,positions=geometry.getAttribute('position');
      const body=[],main=[],tail=[],indices=geometry.index;
      const parent=Array.from({length:positions.count},(_,i)=>i);
      const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
      for(let i=0;i<indices.count;i+=3){
        const a=root(indices.getX(i)),b=root(indices.getX(i+1)),c=root(indices.getX(i+2));
        parent[b]=a;parent[c]=a;
      }
      const components=new Map();
      for(let v=0;v<positions.count;v++){
        const key=root(v),bounds=components.get(key)??{
          minX:Infinity,minY:Infinity,minZ:Infinity,maxX:-Infinity,maxY:-Infinity,maxZ:-Infinity
        };
        const x=positions.getX(v),y=positions.getY(v),z=positions.getZ(v);
        bounds.minX=Math.min(bounds.minX,x);bounds.maxX=Math.max(bounds.maxX,x);
        bounds.minY=Math.min(bounds.minY,y);bounds.maxY=Math.max(bounds.maxY,y);
        bounds.minZ=Math.min(bounds.minZ,z);bounds.maxZ=Math.max(bounds.maxZ,z);
        components.set(key,bounds);
      }
      for(let i=0;i<indices.count;i+=3){
        const vertices=[indices.getX(i),indices.getX(i+1),indices.getX(i+2)];
        const bounds=components.get(root(vertices[0]));
        const bladeSpan=Math.max(bounds.maxX-bounds.minX,bounds.maxY-bounds.minY);
        const tipRadius=Math.max(
          Math.hypot(bounds.minX-mainPivot.x,bounds.minY-mainPivot.y),
          Math.hypot(bounds.maxX-mainPivot.x,bounds.maxY-mainPivot.y)
        );
        const nearTail=bounds.minX>-.85 && bounds.maxX<-.77 &&
          bounds.minY>.88 && bounds.maxY<1 && bounds.minZ>-.16 && bounds.maxZ<.35;
        // The coloured blade tips are separate tiny components in the GLB.
        // Keep them with the long blades instead of leaving them in midair.
        const isMain=!nearTail && bounds.minZ>.20 && bounds.maxZ<.38 &&
          (bladeSpan>.48 || (bounds.maxZ<.365 && tipRadius>1));
        const isTail=nearTail;
        (isMain?main:isTail?tail:body).push(...vertices);
      }
      for(const [part,pivot,indices] of [[modelMainRotor,mainPivot,main],[modelTailRotor,tailPivot,tail]]){
        if(!indices.length)continue;
        const bladeGeometry=geometry.clone();bladeGeometry.setIndex(indices);
        bladeGeometry.translate(-pivot.x,-pivot.y,-pivot.z);
        const blades=new THREE.Mesh(bladeGeometry,node.material);
        Object.assign(blades.userData,node.userData);
        part.add(blades);
      }
      if(main.length || tail.length)rotorParent=node.parent;
      geometry.setIndex(body);
    });
    rotorParent?.add(modelMainRotor,modelTailRotor);
    airframe.add(model);
    replacementFrame=rotorParent;
    legacyHull.visible=false;legacyLaunchers.visible=false;windows.visible=false;
    for(const placard of legacyPlacards)placard.visible=false;
    // The replacement now owns the animated blades.
    mainRotor.visible=false;tailRotor.visible=false;
  },undefined,error=>console.warn('Little Bird model unavailable; showing original helicopter.',error));
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.0,7.8).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({map:shadowMap,color:0x27382e,transparent:true,opacity:.38,depthWrite:false}));
  scene.add(shadow);
  const healthLabel=objectHealthLabel(scene,'LITTLE BIRD');
  // One instanced draw for the exhaust plume. Each puff grows, drifts, and
  // shrinks out at the top; the entire plume disappears when the craft recovers.
  const puffCount=9;
  const smoke=new THREE.InstancedMesh(stone,new THREE.MeshLambertMaterial({
    color:0x676c6c,transparent:true,opacity:.68,depthWrite:false
  }),puffCount);
  smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  smoke.frustumCulled=false;
  airframe.add(smoke);
  const puff=new THREE.Object3D();
  let phase=0, speed=0;
  const crewPoint=new THREE.Vector3();
  return { group, crewSeat(pilot) {
    if(replacementFrame){
      // Both seats lie just behind the Little Bird's open cockpit frame.
      crewPoint.set(pilot ? .15 : .04,pilot ? -.15 : -.12,-.20);
      return replacementFrame.localToWorld(crewPoint);
    }
    crewPoint.set(pilot ? -.35 : .35,.72,-.78);
    return airframe.localToWorld(crewPoint);
  }, update(heli,dt,crewView) {
    const maxHp=Math.max(1,heli.maxHp??500);
    const hp=clamp(heli.hp??maxHp,0,maxHp);
    const wrecked=heli.wrecked===true;
    const smoking=hp>0 && hp/maxHp<=.30;
    const recovery=wrecked ? Math.max(0,Math.ceil(heli.recoverySeconds??0)) : null;
    const drift = heli.abandonedFor ?? 0;
    healthLabel.sprite.visible=!crewView;
    healthLabel.update(Math.ceil(hp),maxHp,recovery,heli.abandonedFor != null);
    healthLabel.sprite.position.set(heli.x,heli.y+(wrecked ? 4.52 : 3.71),heli.z);
    updateGlass(heli.brokenGlass);
    group.position.set(heli.x,heli.y,heli.z);
    group.rotation.set((heli.pitch || 0)-Math.min(.43,drift*.14),-heli.yaw,wrecked ? -.29 : (heli.roll || 0)-Math.min(.48,drift*.15),'YXZ');
    paint.color.setHex(wrecked ? 0x535253 : smoking ? 0xb3a29b : 0xffffff);
    for(const mat of replacementMaterials)mat.color?.setHex(wrecked ? 0x666666 : smoking ? 0xb3a29b : 0xffffff);
    smoke.visible=smoking;
    if(smoking) {
      phase=(phase+dt*.72)%1;
      for(let i=0;i<puffCount;i++){
        const age=(phase+i/puffCount)%1;
        const radius=.045+.38*Math.sin(Math.PI*age);
        puff.position.set(.22+.75*age+.07*Math.sin(i*2.2),1.58+2.05*age,.48+.65*age);
        puff.scale.set(radius,radius*.79,radius*.90);
        puff.rotation.set(age,2.4*i+age,age*.7);
        puff.updateMatrix(); smoke.setMatrixAt(i,puff.matrix);
      }
      smoke.instanceMatrix.needsUpdate=true;
    } else {
      phase=0;
    }
    mainRotor.rotation.z=wrecked ? -.18 : 0;
    const rotorTarget=heli.fuel===0 ? (heli.grounded?0:7) : heli.pilot!=null ? 20 : heli.abandonedFor!=null ? Math.max(5,18-3*drift) : 0;
    speed=wrecked ? 0 : mix(speed,rotorTarget,1-Math.exp(-dt*4));
    mainRotor.rotation.y += speed*dt; tailRotor.rotation.x -= speed*dt*2;
    if(modelMainRotor)modelMainRotor.rotation.z += speed*dt;
    if(modelTailRotor)modelTailRotor.rotation.x -= speed*dt*2;
    const floor = groundHeight(heli.x,heli.z), height = Math.max(0,heli.y-floor);
    shadow.position.set(heli.x,floor+.07,heli.z);
    shadow.rotation.y = -heli.yaw;
    shadow.material.opacity = .38/(1+.20*height);
    shadow.scale.setScalar(1 + Math.min(height,10)*.06);
  }};
}

// The pool bounds effect draw calls during sustained multiplayer use. Each
// instance represents a short pulse trail, a bloom ring, or a fading shard.
function fieldEffects(scene) {
  const capacity=180, particles=[];
  const geometry=new THREE.IcosahedronGeometry(1,0);
  const material=new THREE.MeshBasicMaterial({color:0xffffff});
  const cloud=new THREE.InstancedMesh(geometry,material,capacity);
  cloud.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cloud.frustumCulled=false;
  cloud.count=0; scene.add(cloud);
  const dummy=new THREE.Object3D(), shade=new THREE.Color();
  const rng=random(84927);
  function particle(pos,vel,scale,tint,life) {
    if(particles.length>=capacity) particles.shift();
    particles.push({pos,vel,scale,tint,life,remaining:life});
  }
  function burst(x,y,z) {
    for(let i=0;i<18;i++) {
      const a=rng()*TAU, s=.6+rng()*3.6, size=.045+rng()*.075;
      particle(new THREE.Vector3(x,y,z),new THREE.Vector3(Math.cos(a)*s,.6+rng()*2.7,Math.sin(a)*s),
        new THREE.Vector3(size,size*(1+rng()),size),i%3?0x958d78:0xb5ac95,.28+rng()*.29);
    }
  }
  const pickSurface=surfacePicker(scene);
  const plume=missileCloud(scene,rng);
  const roadSplash=roadSplashView(scene,plume.puff,particle,rng);
  const fireView=districtFireEffects(scene,plume.puff,rng);
  const wreck=aircraftWreck(scene,plume.puff,particle,rng);
  let nextHullPuff=0;
  function yachtExhaust(yacht,dt) {
    if(!yachtSmoking(yacht)){nextHullPuff=0;return;}
    nextHullPuff-=dt;
    if(nextHullPuff>0)return;
    nextHullPuff=.18;
    const vent=yachtPoint(yacht,-5.7,2.35,13.8);
    plume.puff(new THREE.Vector3().copy(vent),new THREE.Vector3(.40+rng()*.26,1.5+rng()*.65,.25),
      .65,2.9+rng(),2.5+rng()*.55,rng()>.5?0x48494a:0x615e5b,.76);
  }
  function chips(contact) {
    const {point,normal,surface}=contact;
    const metal=surface==='metal', wood=surface==='wood';
    const count=metal ? 2+Math.floor(rng()*3) : 2+Math.floor(rng()*2);
    for(let i=0;i<count;i++){
      const v=new THREE.Vector3(rng()-.5,rng()-.22,rng()-.5);
      v.addScaledVector(normal,.18+1.05*rng()-Math.min(0,v.dot(normal)));
      v.multiplyScalar((metal?3.4:wood?1.8:1.35)*(.63+.61*rng()));
      const width=(metal?.009:wood?.015:.021)*(.62+.7*rng());
      const length=width*(metal ? 3+5*rng() : wood ? 2+2.6*rng() : .8+rng());
      const scale=new THREE.Vector3(width,length,width*(wood?.43:.7));
      const tint=metal ? (i===0?0xffdd9e:0xdba66b) : wood ? (i%2?0xb69265:0x846747) : (i%2?0xa49f95:0x6c6963);
      particle(point.clone().addScaledVector(normal,.012),v,scale,tint,
        (metal?.074:wood?.15:.12)+rng()*(metal?.053:.082));
      particles.at(-1).rotation=new THREE.Quaternion().setFromUnitVectors(up,v.clone().normalize());
    }
  }
  function glassBurst(at){
    for(let i=0;i<23;i++){
      const size=.035+.09*rng(),v=new THREE.Vector3((rng()-.5)*5,.4+3*rng(),(rng()-.5)*5);
      particle(new THREE.Vector3(at.x,at.y,at.z),v,new THREE.Vector3(size,.012,size*1.7),i%3?0x85b5ba:0xe1f0ec,.36+.40*rng());
    }
  }
  function swordCut(part,point,actor){
    characterBurst(part,new THREE.Vector3().copy(point),new THREE.Vector3(actor.x,actor.y+1.3,actor.z),particle,rng);
  }
const chainMetal=new Set(['rover','rover2','rover3','supercar','tank','jet','lamp','superyacht']);
  let lastChainChipTick=-Infinity;
  function shot(s,sourceVehicle,world) {
    if(s.weapon==='bodyBlast'){
      const center=new THREE.Vector3().copy(s.to);
      const size=s.size;
      for(let i=0;i<28;i++){
        const angle=i*2.4+rng()*.42,speed=(1.4+3.2*rng())*size;
        const velocity=new THREE.Vector3(Math.cos(angle)*speed,(1.4+rng()*3.6)*size,Math.sin(angle)*speed);
        const chunk=i%3===0,radius=(chunk?.07+rng()*.09:.027+rng()*.04)*size;
        particle(center.clone(),velocity,new THREE.Vector3(radius,radius*(chunk?.62:1.35),radius*1.4),
          chunk?(i%2?0x822b38:0xbb606b):0xa51d30,chunk?3.5+rng()*1.7:.35+rng()*.4);
        if(chunk)particles.at(-1).settleY=groundHeight(center.x,center.z,center.y)+radius*.45;
      }
      return;
    }
    if(s.weapon==='ember'){fireView.pulse(s);return;}
    if(s.weapon==='molotov'){
      const at=new THREE.Vector3().copy(s.to);at.y+=.075;
      for(let i=0;i<12;i++){
        const angle=i*Math.PI/6+rng()*.16,spread=1.15+rng()*1.6;
        const v=new THREE.Vector3(Math.cos(angle)*spread,.53+rng()*.98,Math.sin(angle)*spread);
        plume.puff(at,v,.16,.52,.32+rng()*.20,s.water?0xb4d7d0:i%2?0xffa342:0xf37635,.89);
      }
      return;
    }
    if(s.weapon==='roadSplash'){roadSplash.enter(s);return;}
    if(s.weapon==='vehicleWreck'){vehicleWreckBurst(s,plume.puff,particle,rng);return;}
    if(s.weapon==='vehicleCrush'){vehicleCrushDust(s,plume.puff,rng);return;}
    if(s.weapon==='launch') return;
    if(s.weapon==='muzzle'){
      particle(new THREE.Vector3(s.from.x,s.from.y,s.from.z),new THREE.Vector3(),new THREE.Vector3(.068,.054,.068),0xffd395,.065);
      return;
    }
    const a=new THREE.Vector3(s.from.x,s.from.y,s.from.z), b=new THREE.Vector3(s.to.x,s.to.y,s.to.z);
    if(s.injury)characterBurst(s.injury,s.injuryPoint ? new THREE.Vector3().copy(s.injuryPoint) : b,a,particle,rng);
    if(s.hitKind==='dolphin' || s.hitKind==='manatee' || s.hitKind==='shark' || s.hitKind==='gull')return;
    if((s.hitKind==='player' || s.hitKind==='npc') && s.weapon!=='missile')return;
    if(CITY && (sourceVehicle==='heli'||sourceVehicle==='heli2') && (s.weapon==='turret' || s.weapon==='pilotGun')){
      // Rapid fire already supplies the contact point. Recasting every impact
      // against Brickell's batched meshes can stall an entire snapshot.
      if(b.y<=MAP.waterY || (s.tick>=lastChainChipTick && s.tick-lastChainChipTick<2))return;
      const metal=chainMetal.has(s.hitKind) || world?.traffic?.some(v=>v.id===s.hitKind) ||
        world?.patrolCars?.some(v=>v.id===s.hitKind) || world?.boats?.some(v=>v.id===s.hitKind);
      if(metal || s.hitKind==='scenery' || s.hitKind==='rubble' || s.hitKind==='post'){
        lastChainChipTick=s.tick;
        const normal=a.sub(b).normalize();
        chips({point:b,normal,surface:metal?'metal':'solid'});
      }
      return;
    }
    const contact=pickSurface(s,a,b,sourceVehicle);
    if(contact) b.copy(contact.point);
    if(s.weapon==='missile'){
      const normal=contact?.normal ?? new THREE.Vector3().subVectors(a,b).normalize();
      if(!normal.lengthSq())normal.copy(up);
      plume.impact(b,normal,contact?.surface);
      for(let i=0;i<9;i++){
        const v=new THREE.Vector3(rng()-.5,rng(),rng()-.5).addScaledVector(normal,.45).multiplyScalar(2+rng()*3);
        particle(b.clone(),v,new THREE.Vector3(.032,.055,.029),i%2?0x776b59:0x585650,.27+rng()*.3);
      }
      return;
    }
    if(contact) chips(contact);
  }
  function update(dt) {
    plume.update(dt);
    roadSplash.update(dt);
    let write=0;
    for(const p of particles) {
      p.remaining-=dt;
      if(p.remaining<=0) continue;
      p.pos.addScaledVector(p.vel,dt);
      if(p.settleY!==undefined && p.pos.y<=p.settleY){
        p.pos.y=p.settleY;p.vel.set(0,0,0);
      }else if(p.vel.lengthSq())p.vel.y-=dt*5.8;
      dummy.position.copy(p.pos);dummy.scale.copy(p.scale).multiplyScalar(Math.min(1,p.remaining/.13));
      if(p.rotation) dummy.quaternion.copy(p.rotation); else dummy.quaternion.identity();
      dummy.updateMatrix();cloud.setMatrixAt(write,dummy.matrix);
      cloud.setColorAt(write,shade.setHex(p.tint));
      particles[write++]=p;
    }
    particles.length=write;cloud.count=write;
    if(write) {cloud.instanceMatrix.needsUpdate=true;cloud.instanceColor.needsUpdate=true;}
  }
  return {shot,burst,wreck,glassBurst,swordCut,update,fireView,yachtExhaust,trail:plume.trail};
}

const coats=[0xc96937,0x427382,0xb9544a,0x80739c,0xb38649,0x5c825e];
function jacketColor(id) {
  const str=String(id);
  let h=0; for(const char of str) h=(h*31+char.charCodeAt(0))>>>0;
  return coats[h%coats.length];
}

// Text and the HP strip share one texture per hiker. Redraw only when the
// displayed value changes; depth testing hides labels behind the landscape.
function characterLabel(root, name) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 60;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, depthWrite: false, sizeAttenuation: false,
  }));
  sprite.scale.set(.102, .024, 1);
  root.add(sprite);
  let previous;
  return {
    sprite,
    update(state) {
      const hp = state.hp ?? 100, max = state.maxHp || 100;
      const status = state.dead ? 'DOWN' : state.protected ? 'SHIELD' : String(hp);
      const key = status + '/' + hp + '/' + max;
      sprite.position.y = state.dead ? .95 : 2.26-stanceDrop(state);
      if (key === previous) return;
      previous = key;
      ctx.clearRect(0, 0, 256, 60);
      ctx.fillStyle = '#16221eeb'; ctx.fillRect(0, 0, 256, 60);
      ctx.fillStyle = '#fff9df'; ctx.font = 'bold 23px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(name, 8, 29, 143);
      ctx.fillStyle = state.protected ? '#a4e6f1' : '#ffe4a2';
      ctx.textAlign = 'right'; ctx.fillText(status, 248, 29);
      ctx.fillStyle = '#52605a'; ctx.fillRect(8, 39, 240, 13);
      ctx.fillStyle = state.protected ? '#75d9e5' : hp <= 30 ? '#ff8a65' : '#9de3a0';
      ctx.fillRect(8, 39, 240 * Math.max(0, Math.min(1, hp / max)), 13);
      texture.needsUpdate = true;
    },
    dispose() { texture.dispose(); sprite.material.dispose(); },
  };
}

// Parts are assembled in model space about real joints. Forward is local -Z.
function hiker(scene,id,tint,material,uniform,visorMaterials,shadowMap,name,appearance=null,diver=false) {
  const rig=createRangerRig(), {root,body,upper,limbs}=rig;
  scene.add(root);
  if(diver) {
    fitScubaDiver(rig);
    rig.tools=carriedEquipment(upper,scene,Batch);
    rig.tools.push(...arcadeMeleeEquipment(limbs[1].forearm,Batch));
    return finishAvatar(scene,rig,material,shadowMap,name);
  }
  if(appearance) {
    if(appearance==='nathan')fitNathan(rig);
    else fitPlayerScan(rig,appearance);
    rig.tools=carriedEquipment(upper,scene,Batch);
    rig.tools.push(...arcadeMeleeEquipment(limbs[1].forearm,Batch));
    return finishAvatar(scene,rig,material,shadowMap,name);
  }
  const identity=rangerIdentity(id);
  const coat=color(tint ?? jacketColor(id)).lerp(color(0xf0ece1),.88);
  const pants=0xdad8c3, binding=0x585745;
  const torso=new Batch(true), headArt=new Batch(true), pelvisArt=new Batch(true);
  const headOrigin=new THREE.Group();headOrigin.position.y=-1.525;rig.head.add(headOrigin);
  torso.add(fieldJacket,coat,0,1.29,.004);
  torso.add(fieldCollar,0xcfcdba,0,1.494,.010);
  torso.add(fieldBib,0xb9aa88,0,1.31,-.013);
  // Bound lower edge, map sleeve zipper, and a small exposed pull tab.
  torso.beam(0x777763,[-.125,1.263,-.152],[0,1.257,-.194],.010,.009);
  torso.beam(0x777763,[0,1.257,-.194],[.125,1.263,-.152],.010,.009);
  torso.beam(0xc3a170,[.104,1.260,-.164],[.111,1.236,-.170],.009);
  pelvisArt.add(trouserSeat,pants,0,.990,0);
  // Bound opening, wind flap and a diagonally cut chest pocket on the field smock.
  torso.beam(0x626958,[.008,1.503,-.078],[.008,1.435,-.135],.009,.006);
  torso.beam(0x6e735e,[.008,1.435,-.135],[.011,1.330,-.146],.010,.006);
  torso.beam(0x999780,[.011,1.330,-.146],[.012,1.103,-.116],.009,.008);
  for(const side of [-1,1]) {
    torso.add(pocket,0xd4c6a5,side*.076,1.204,-.157,.116,.099,.052,.055,side*-.30);
    torso.add(pocket,0xa49a7b,side*.076,1.236,-.170,.119,.038,.049,.055,side*-.30);
    torso.beam(binding,[side*.024,1.411,-.175],[side*.124,1.391,-.139],.008,.008);
    torso.beam(0x8b8775,[side*.033,1.408,-.176],[side*.037,1.388,-.181],.008);
    // Raised shoulder yoke follows the sloping clavicle into the sleeve cap.
    torso.beam(0x929782,[side*.083,1.497,.054],[side*.185,1.455,.082],.009,.011);
  }

  // Fitted balaclava, wraparound lens and a low-profile crown over the occiput.
  const faceY=1.660, fabric=[0xdadcc9,0xe3d6b9,0xcfdcca,0xdacfb9][identity];
  headArt.add(hood,fabric,0,faceY,-.005,.94,1.04,.94);
  headArt.add(maskPanel,0x5b665d,0,faceY,-.008);
  headArt.add(visorRim,0x272c29,0,faceY,-.005,.96,1.05,.98);
  const lens=new THREE.Mesh(visorLens.clone(),visorMaterials[identity]);
  lens.scale.set(.96,1.05,.98);lens.position.set(0,faceY,-.005);headOrigin.add(lens);
  headArt.add(capCrown,0xc0c3aa,0,1.718,.009,1.035,1,1.02);
  headArt.add(round,0x51574d,0,1.722,-.087,.110,.009,.087,-.064);
  for(const side of [-1,1]) {
    headArt.beam(0x424b43,[side*.119,1.699,-.030],[side*.105,1.693,.075],.015,.022);
    headArt.add(round,0x696e61,side*.107,1.680,.031,.015,.032,.027);
    headArt.beam(0x687160,[side*.100,1.694,.057],[side*.071,1.592,-.034],.011,.012);
    headArt.beam(0x7b8377,[side*.031,1.648,-.152],[side*.083,1.637,-.102],.007,.005);
    for(let i=0;i<3;i++)headArt.beam(0x303c37,[side*.038,1.629-.009*i,-.141+i*.003],[side*.080,1.636-.010*i,-.109+i*.002],.005,.006);
  }

  // The loaded back panel sits close over the shoulder blades. A gusset and
  // compression bands break the silhouette at the sides while leaving the front clear.
  torso.add(fieldPack,0xf2ead9,0,1.317,.171,1.01,1.00,.86,-.07);
  torso.add(fieldPack,0xe0d8c5,0,1.264,.220,.85,.63,.58,-.05);
  for(const side of [-1,1]) {
    torso.add(pocket,0xd2c7a7,side*.143,1.222,.170,.077,.135,.113,.09,side*.11,.04*side);
    for(const y of [1.243,1.388]) {
      torso.beam(binding,[side*.153,y,.182],[side*.115,y-.018,.247],.018,.012);
      torso.add(cube,0x5a594b,side*.140,y-.010,.211,.025,.023,.015,.05,side*.6);
    }
  }
  // Zipper tape follows the curved pocket instead of painting over an edge.
  const zip=[[-.119,1.208,.242],[-.125,1.298,.257],[-.116,1.342,.257],[-.091,1.369,.261],
    [-.045,1.384,.257],[.045,1.384,.257],[.091,1.369,.261],[.116,1.342,.257],[.125,1.298,.257],[.119,1.208,.242]];
  for(let i=1;i<zip.length;i++)torso.beam(0x625c49,zip[i-1],zip[i],.009,.008);
  torso.beam(0xa3997f,[-.088,1.368,.267],[-.094,1.334,.271],.009,.006);
  for(const y of [1.210,1.239]){
    torso.beam(0x94866a,[-.091,y+.003,.260],[0,y,.273],.012,.009);
    torso.beam(0x94866a,[0,y,.273],[.091,y+.003,.260],.012,.009);
    for(const x of [-.061,-.023,.023,.061])
      torso.add(cube,0x615f4d,x,y,.274-.013*Math.abs(x)/.091,.004,.014,.007);
  }
  torso.beam(binding,[-.039,1.486,.155],[-.022,1.513,.169],.012);
  torso.beam(binding,[-.022,1.513,.169],[.034,1.513,.172],.012);
  torso.beam(binding,[.034,1.513,.172],[.049,1.487,.159],.012);
  torso.mesh(upper,uniform);pelvisArt.mesh(body,uniform);headArt.mesh(headOrigin,uniform);

  for(const {side,leg,knee,ankle,arm,forearm} of limbs) {
    const pant=new Batch(true);
    pant.add(trousers,pants,0,0,0);
    pant.add(pocket,0xc5c8b1,side*.090,-.207,.011,.052,.144,.130,.10,side*.09);
    pant.beam(0x7b806b,[side*.117,-.151,-.046],[side*.116,-.157,.062],.012);
    jointGarment(pant,uniform,leg,knee,.085);

    const jacket=new Batch(true);
    jacket.add(sleeve,coat,0,0,0,.91,1,.94);
    jacket.add(pocket,0xc6c6af,side*.075,-.131,.004,.033,.096,.090,.12);
    jacket.add(cube,0x706f58,side*.090,-.117,.002,.010,.034,.064,.16);
    jacket.add(cube,0x969279,side*.096,-.119,.002,.005,.009,.049,.16);
    jointGarment(jacket,uniform,arm,forearm,.074);

    const glove=new Batch(true);
    glove.add(trunk,0x5f6255,0,-.215,0,.048,.047,.048);
    glove.add(round,0x605c4b,0,-.254,.002,.040,.055,.035);
    glove.add(round,0x48483d,side*.007,-.245,.014,.032,.039,.025);
    for(let i=0;i<4;i++) {
      const dx=side*(i-1.5)*.016;
      glove.add(round,0x575446,dx,-.286+.005*Math.abs(i-1),-.012,.010,.026-.002*Math.abs(i-1),.013,-.58);
      glove.add(round,0x494b40,dx,-.294+.005*Math.abs(i-1),-.026,.009,.012,.013);
    }
    glove.add(round,0x66614e,-side*.030,-.265,-.025,.017,.031,.018,-.56,0,side*.35);
    glove.mesh(forearm,uniform);

    const boot=new Batch(true);
    boot.add(bootSole,0x353934,0,0,0,.83,1,.90);
    boot.add(bootUpper,0xe4d9c5,0,0,0,.83,1,.90);
    boot.add(round,0x5d6358,0,.051,.016,.059,.061,.056);
    boot.add(round,0x78705a,0,.021,-.040,.049,.066,.032,-.40);
    boot.beam(binding,[0,.020,.066],[0,.105,.060],.023,.009);
    for(const edge of [-1,1]){
      boot.beam(0x645d4e,[edge*.068,-.067,-.120],[edge*.060,.035,-.014],.011,.010);
      boot.beam(0x766c56,[edge*.061,.035,-.022],[edge*.062,.050,.040],.010,.011);
      for(let i=0;i<4;i++){
        const z=-.105+i*.019,y=-.008+i*.016;
        boot.beam(0x454438,[edge*.032,y,z],[-edge*.032,y+.011,z+.015],.005);
      }
    }
    for(const z of [-.150,-.111,-.076,.025,.054])boot.add(cube,0x41443a,0,-.119,z,.114,.012,.016);
    boot.mesh(ankle,uniform);
  }
  rig.tools=carriedEquipment(upper,scene,Batch);
  rig.tools.push(...arcadeMeleeEquipment(limbs[1].forearm,Batch));
  return finishAvatar(scene,rig,material,shadowMap,name);
}

function finishAvatar(scene,rig,material,shadowMap,name){
  const {root}=rig;
  // The mountain sun and static geometry share one cached shadow map.
  // Characters use a soft contact patch that follows their animated pose.
  root.traverse(node=>{if(node.isMesh) node.castShadow=false;});
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,18).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({color:0x27382e,map:shadowMap,transparent:true,opacity:.4,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  scene.add(shadow);
  return {...rig,makeCanopy:makeParachute,material,shadow,label:characterLabel(root,name),cycle:0};
}

function makeParachute(root, material) {
  const canopy = new Batch();
  for (let cell = -4; cell <= 4; cell++) {
    const x = cell * .38, arch = 4.05 - .04 * cell * cell;
    canopy.add(round, Math.abs(cell) === 2 ? 0xffeac1 : 0xd36a36, x,arch,0,.25,.24,.82,0,0,-cell*.13);
    if (cell % 2 === 0) for (const z of [-.50,.50])
      canopy.beam(0x544e43,[Math.sign(cell)*.18,1.45,0],[x,arch-.09,z],.019);
  }
  return canopy.mesh(root,material,false);
}

function diveSpray(avatar,mark,frameTick){
  const age=mark?(frameTick-mark.tick)/30:Infinity;
  let spray=avatar.diveSpray;
  if(age<0 || age>=.9){
    if(spray)spray.visible=false;
    return;
  }
  if(!spray){
    spray=new THREE.Group();
    const material=new THREE.MeshBasicMaterial({color:0xe6faf7,transparent:true,depthWrite:false});
    const ring=new THREE.Mesh(new THREE.RingGeometry(.92,1,32).rotateX(-Math.PI/2),material);
    const drops=new THREE.InstancedMesh(new THREE.SphereGeometry(1,5,4),material,15);
    drops.frustumCulled=false;
    spray.add(ring,drops);avatar.root.parent.add(spray);avatar.diveSpray=spray;
    spray.userData.drop=new THREE.Object3D();
  }
  spray.visible=true;spray.position.set(mark.x,mark.water+.025,mark.z);
  const [ring,drops]=spray.children,size=mark.splash,radius=.18+age*2.1*size;
  ring.scale.set(radius,1,radius);ring.material.opacity=(1-age/.9)*.82;
  const dummy=spray.userData.drop;
  for(let i=0;i<drops.count;i++){
    const angle=i*2.39996,height=Math.max(0,age*((3+i%4*.48)*size-6.6*age));
    const travel=.10+age*(.55+i%5*.19)*size;
    dummy.position.set(Math.sin(angle)*travel,height,Math.cos(angle)*travel);
    const width=height>0?.044*size:0;
    dummy.scale.set(width,width*(1.8+i%3*.5),width);dummy.updateMatrix();drops.setMatrixAt(i,dummy.matrix);
  }
  drops.instanceMatrix.needsUpdate=true;
}

function updateSwimRipples(avatar,state) {
  if(!(state.swimDepth>.28) && (state.swimming || state.moving && waterBlend(state)>.15) && !state.fall && !state.dead) {
    const stroke=avatar.stroke??0;
    if(!avatar.ripples) {
      const rings=Array.from({length:2},()=>{
        const ring=new THREE.Mesh(new THREE.RingGeometry(.95,1,42).rotateX(-Math.PI/2),
          new THREE.MeshBasicMaterial({color:0xd9f6ec,transparent:true,depthWrite:false}));
        ring.visible=false;
        avatar.root.parent.add(ring);
        return ring;
      });
      avatar.ripples={rings,beat:-1};
    }
    // Leave each stroke ring where the swimmer disturbed the surface.
    const beat=Math.floor(stroke/Math.PI);
    const {rings}=avatar.ripples;
    if(beat!==avatar.ripples.beat) {
      const ring=rings[beat%2];
      ring.userData.beat=beat;
      ring.position.set(state.x,waterSurfaceAt(state.x,state.z,state.y)+.019,state.z);
      avatar.ripples.beat=beat;
    }
    for(const ring of rings) {
      const age=(stroke/Math.PI-ring.userData.beat)/2;
      ring.visible=age>=0 && age<1;
      if(ring.visible) {
        const radius=.29+age*.95;
        ring.scale.set(radius,1,radius);
        ring.material.opacity=.33*(1-age)**2;
      }
    }
  } else if(avatar.ripples) {
    avatar.ripples.beat=-1;
    for(const ring of avatar.ripples.rings) {ring.visible=false;delete ring.userData.beat;}
  }
}

function pose(avatar,state,dt,seated,station,doors,tick) {
  if(state.fall?.joints) {poseRagdoll(avatar,state,dt);return;}
  releaseRagdoll(avatar);
  poseRig(avatar,state,dt,seated,station,doors,tick);
  riderPose(avatar,state);
  updateSwimRipples(avatar,state);
}

const marinaBlocks=(boats,x,y,z,padding)=>boats?.some(b=>marinaHullContains(b,x,y,z,padding));
function cameraDistance(target,vector,wanted,hp,margin=0,doors,indoors=false,yacht,marinaBoats,fireEngines=[]) {
  let distance=wanted;
  const close=indoors || yacht || marinaBoats?.length;
  const increment=close ? .08 : .20, minimum=close ? .10 : .45;
  for(let d=minimum;d<=wanted+increment;d+=increment) {
    const x=target.x+vector.x*d,y=target.y+vector.y*d,z=target.z+vector.z*d;
    if(yachtSolidAt(yacht,x,y,z,.14) || marinaBlocks(marinaBoats,x,y,z,.18) ||
      Math.max(groundHeight(x,z,y+.15,doors),buildingTopAt(x,z,.14,y+.15,doors))>y-.15) {distance=Math.min(wanted,Math.max(minimum,d-increment));break;}
  }
  // Sweep the boom against trunk/rock cylinders without testing every mesh.
  const test=(prop, radius) => {
    const h=vector.x*vector.x+vector.z*vector.z;
    if(h<.002) return;
    const along=((prop.x-target.x)*vector.x+(prop.z-target.z)*vector.z)/h;
    const d=clamp(along,0,distance);
    const dx=target.x+d*vector.x-prop.x,dz=target.z+d*vector.z-prop.z;
    const span=radius*radius-dx*dx-dz*dz;
    if(span<=0 && (!margin || dx*dx+dz*dz >= (radius+margin)**2)) return;
    const near=clamp(d-Math.sqrt(Math.max(0,span)/h),.45,distance);
    const y=target.y+near*vector.y,bottom=terrainHeight(prop.x,prop.z);
    if(y<=bottom-.15 || y>=bottom+prop.height+.15) return;
    // Start shortening before the rover camera grazes the side of a tree or rock.
    const gap=Math.hypot(dx,dz)-radius;
    distance=gap>0 ? mix(near,distance,THREE.MathUtils.smoothstep(gap,0,margin)) : near;
  };
  for(const tree of MAP.trees)if(!doors?.fallenTrees?.[tree.treeId])test(tree,tree.radius+.2);
  for(const rock of MAP.rocks) test(rock,rock.radius+.16);
  for(const prop of BREAKABLES) if (hp?.[prop.id] !== 0) test(prop,prop.radius+.12);
  return Math.min(distance,fireEngineCameraClearance(fireEngines,target,vector,distance));
}

import {createSprintGate} from './marina-sprint-view.js';
export function createScene(canvas) {
  preloadPlayerScan();
  preloadNathan();
  const profileFrames=new URLSearchParams(location.search).get('perf')==='1';
  const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),updateInteriors=buildingInteriorView(scene,Batch),camera=new THREE.PerspectiveCamera(55,1,.09,CITY?730:400);
  scene.fog=new THREE.FogExp2(CITY ? 0xc0d3d9 : 0xa5a9a4,CITY ? .005 : .0067);
  const ambient=new THREE.HemisphereLight(0xd6dce1,0xaaa087,1.74);scene.add(ambient);
  const sun=new THREE.DirectionalLight(0xffe3b5,1.93);
  sun.position.set(-36,32,-21); sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:130});
  if(!CITY){
    const centerZ=(MAP.northBound+MAP.bounds)/2;
    sun.position.z+=centerZ;sun.target.position.z=centerZ;scene.add(sun.target);
    Object.assign(sun.shadow.camera,{left:-72,right:72,top:61,bottom:-61});
  }
  if(CITY)scene.add(sun.target);
  let lanternShadows=false,casinoShadowBand=-1,shoreCamera=0;
  sun.shadow.normalBias=.045; sun.shadow.bias=-.0004; scene.add(sun);
  const lighting=roadLighting(scene,ambient,sun);
  const panorama=addSky(scene);
  let diveBackdrop;
  const underwaterFog=new THREE.FogExp2(0x21606a,.115);
  const rng=random(4863), material=vertexMaterial(), uniform=rangerMaterial(renderer);
  const visorMaterials=[0x4a544d,0x44545b,0x46554d,0x5a5044].map(color=>
    alpineGlass(panorama,{color,vertexColors:false,shininess:102}));
  const updatePalms=CITY ? addPalms(scene,renderer) : null;
  const updateDogs=CITY?dogView(scene,Batch):null;
  const updateReef=CITY?reefChannelView(scene,Batch):null;
  const updateGulls=CITY ? gullView(scene,groundHeight,MAP.waterY) : null;
  const updateFishing=CITY ? pierFishingView(scene,MAP.waterY) : null;
  const updateFish=CITY ? reefFishView(scene,MAP.waterY) : null;
  const updateDolphins=CITY ? dolphinView(scene,MAP.waterY) : null;
  const updateSharkDefeats=CITY ? createSharkDefeatView(scene,MAP.waterY) : null;
  let framedBite=null,biteSide=1;
  const updateDogSpray=CITY?sharkDogSpray(scene,MAP.waterY):null;
  const swimmerImpacts=aquaticImpactView(scene,MAP.waterY,[]);
  const updateSharks=CITY ? sharkView(scene,MAP.waterY) : null;
  const updateManatees=CITY ? manateeView(scene,MAP.waterY) : null;
  const updateHydrants=streetHydrants(scene,Batch);
  const features=new Batch();
  const updateCasino=CITY?casinoView(scene,Batch):null;
  const updateResortExterior=CITY?resortExterior(scene,Batch,panorama):null;
  const updateBasketball=CITY?addBasketballCourt(scene,Batch):null;
  let updateCreek,updateRuralGlass, stacks, updateDoors,churchPanes,updateChurch;
  if(CITY) {
    updateDoors=cityStreets(scene,renderer,Batch,panorama);
    addEisenhowerCarrier(scene,MAP.waterY);
    stacks=buildStacks(scene,renderer,Batch);
  } else {
    const riverbed=riverbedTexture(renderer);
    addGround(scene,renderer,riverbed);
    const strip=new Batch(),stripBox=new THREE.BoxGeometry();
    const centerX=(outpostRunway.west+outpostRunway.east)/2;
    const centerZ=(outpostRunway.north+outpostRunway.south)/2;
    strip.add(stripBox,0x41464a,centerX,.807,centerZ,
      outpostRunway.east-outpostRunway.west,.014,outpostRunway.south-outpostRunway.north);
    for(const x of [outpostRunway.west+.25,outpostRunway.east-.25])
      strip.add(stripBox,0xf1eee5,x,.817,centerZ,.10,.008,outpostRunway.south-outpostRunway.north-2);
    for(let z=outpostRunway.north+7;z<outpostRunway.south-5;z+=8)
      strip.add(stripBox,0xf1eee5,centerX,.818,z,.14,.008,2.7);
    strip.mesh(scene,material,false).userData.impactSurface='asphalt';
    const forest=new Batch();
    conifers(scene,forest,MAP.trees,sceneryHeight,renderer,MAP.bounds,MAP.northBound);
    forest.mesh(scene,material).userData.impactSurface='wood';
    granite(scene,MAP.rocks,terrainHeight,renderer);
    addBridge(scene,renderer,rng);
    churchPanes=paneBatch(features);
    buildRidgeChurch(features,churchPanes);
    const posts=breakablePostView(scene,Batch);
    addDetails(scene,features,rng,posts);
    updateDoors=posts.finish();
    updateCreek=addOutpostCreek(scene,panorama,riverbed);
    ({stacks,updateGlass:updateRuralGlass}=buildOutpost(scene,renderer,Batch));
    meadow(scene,renderer,rng,trailDistance);
  }
  addFuelMarkers(scene,features);
  landingMarks(features);const featureMesh=features.mesh(scene,material);
  if(churchPanes)updateChurch=churchPanes.bind(featureMesh);
  let updateCases;
  let updateSupplyView;
  const shadowMap=contactShadowMap();
  const roverLabel=objectHealthLabel(scene,'HUMVEE');
  const extraRoverLabels=CITY?['rover2','rover3'].map(()=>objectHealthLabel(scene,'HUMVEE')):[];
  const roverTurret=turretView(scene,'rover',Batch,material),extraRoverTurrets=CITY?['rover2','rover3'].map(kind=>turretView(scene,kind,Batch,material)):[],heliTurret=turretView(scene,'heli',Batch,material),heli2Turret=CITY&&turretView(scene,'heli2',Batch,material);
  const updateRounds=flightRounds(scene);
  const marks=surfaceMarks(scene);
  const contacts=contactShadows(scene);
  const updateTireDebris=tireDebris(scene,trailDistance);
  const updatePatrolBoats=patrolBoatView(scene,Batch,material);
  const updatePartyYachts=CITY?partyYachtView(scene,Batch):null;
  const updateMarinaFleet=CITY?marinaFleetView(scene,Batch):null;
  const bowGun=CITY && turretView(scene,'superyacht',Batch,material);
  const updateYacht=CITY ? superyachtView(scene,Batch,renderer,panorama) : null;
  const updateTraffic=cityTrafficView(scene,Batch,shadowMap,panorama);
  const updateSupercar=CITY && createCheetahView(scene,shadowMap);
  const updateTank=CITY?tankView(scene,Batch,shadowMap):null;
  const updateGarages=createRoadGarages(scene,Batch);
  const updateRover=createRoverView(scene,Batch,material,shadowMap,panorama);
  const updateExtraRovers=CITY?['rover2','rover3'].map(kind=>createRoverView(scene,Batch,material,shadowMap,panorama,kind)):[];
  const jetModel=jetView(scene,Batch);
  const updateCargoHook=cargoHookView(scene);
  const helicopter=fieldHelicopter(scene,material,shadowMap,panorama);
  const helicopter2=CITY&&fieldHelicopter(scene,material,shadowMap,panorama);

  scene.add(camera);
  const updateSpears=CITY?spearfishingView(scene):null;
  const drawCapsules=airborneCapsules(scene,Batch);
  const sightModels=carriedEquipment(camera,scene,Batch);
  // Keep the Colt's iron sight centered on the aim dot without crowding the camera.
  sightModels[0].position.set(.010,-.255,-.68);
  sightModels[1].position.set(0,-.125,-.40);
  sightModels[4].position.set(.15,-.203,-.80);
  sightModels[4].rotation.set(.04,.23,-.04);
  sightModels[5].position.set(.147,-.071,-.78);
  sightModels[5].rotation.z=-.31;
  sightModels[3].position.set(.136,-.240,-.55);
  camera.remove(sightModels[2]);
  sightModels[2]=scopedEyepiece(camera,Batch);
  const effects=fieldEffects(scene);
  const showSwordContacts=arcadeSwordContacts(scene,effects.swordCut);
  const updateMissiles=missileView(scene,Batch,effects.trail);
  const parked={...HELIPAD,y:groundHeight(HELIPAD.x,HELIPAD.z),yaw:0,pilot:null,grounded:true};
  let lastFocus=null;
  const avatars=new Map(), target=new THREE.Vector3(), boom=new THREE.Vector3();
  const desired=new THREE.Vector3(), sideways=new THREE.Vector3();
  let clock=0,lastWidth=0,lastHeight=0,ready=false;
  function resize(){
    const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
    if(w===lastWidth && h===lastHeight) return;
    lastWidth=w;lastHeight=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  const distant=CITY ? distantResidents(scene) : null;
  const nearbyCivilianScan=CITY ? createCivilianScans() : null;
  let civilianFaces,patrolFaces,civilianShirts,patrolShirts;
  function civilianTexture(path){
    const map=new THREE.TextureLoader().load(path);
    map.colorSpace=THREE.SRGBColorSpace;
    map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    return new THREE.MeshLambertMaterial({map});
  }
  let nightlifeFaces,infectedFaces,infectedShirts;
  const volleyballShirts=new Map();
  function resident(id,name,officer=false,lookId=id,infected=0,scan){
    const athlete=volleyballLooks[id];
    const look=officer?patrolProfile(id,!CITY):(civilianLooks[lookId]??beachStaffLooks[lookId]??cabaretLooks[id]??bankLooks[id]??dealerLooks[id]??athlete??basketballLooks[id]);
    if(scan && !infected){
      const rig=createRangerRig();
      fitCharacterScan(rig,scan,'Civilian scan',true);
      rig.civilian=civilianScanLooks[id];rig.civilianScan=scan;rig.tools=[];
      scene.add(rig.root);
      return finishAvatar(scene,rig,material,shadowMap,name);
    }
    const faces=infected?(infectedFaces??=civilianTexture('./infected-faces.webp')):officer?(patrolFaces??=civilianTexture('./goy-theft-auto-patrol-faces.webp')):
      look.face>=20?(nightlifeFaces??=civilianTexture('./maravela-faces.webp')):(civilianFaces??=civilianTexture('./brickell-faces.webp'));
    if(athlete && !volleyballShirts.has(look.top))
      volleyballShirts.set(look.top,new THREE.MeshLambertMaterial({color:look.top}));
    const shirts=athlete?volleyballShirts.get(look.top):officer?(patrolShirts??=civilianTexture(CITY?'./goy-theft-auto-patrol-shirt.png':'./goy-theft-auto-county-shirt.png')):
      (civilianShirts??=civilianTexture('./brickell-clothing.webp'));
    const rig=createRangerRig();
    if(infected && !infectedShirts){
      infectedShirts=shirts.clone();
      infectedShirts.vertexColors=true;
    }
    dressPerson(rig,infected?infectedWardrobe(look,infected):look,Batch,material,{faces,shirts:infected?infectedShirts:shirts});
    if(dealerLooks[id])uniformDealer(rig,Batch,material);
    if(officer)rig.tools=carriedEquipment(rig.upper,scene,Batch);
    scene.add(rig.root);
    return finishAvatar(scene,rig,material,shadowMap,name);
  }
  let roverBoom = null, bailoutOrbit = 0, indoorAngle=0, interiorBlend=0, footBoom=null;
  function removeAvatar(a) {
    clearLostParts(a);
    a.label.dispose();
    if(a.diveSpray){
      const [ring,drops]=a.diveSpray.children;
      ring.geometry.dispose();drops.geometry.dispose();drops.dispose();ring.material.dispose();scene.remove(a.diveSpray);
    }
    for(const ring of a.ripples?.rings ?? []) {
      scene.remove(ring);
      ring.geometry.dispose();ring.material.dispose();
    }
    a.root.traverse(node=>{if(node.isMesh) {node.skeleton?.dispose();if(!node.geometry.userData.sharedFieldKit)node.geometry.dispose();}});
    a.shadow.geometry.dispose();a.shadow.material.dispose();
    scene.remove(a.root,a.shadow);
  }
  const cursorRay = new THREE.Raycaster();
  const cursorNdc = new THREE.Vector2();
  let displayedWorld, displayedPlayers,viewHeading=0;
  const overheadEye=new THREE.Vector3();
  function aimAt(feet,id,range,station=null) {
    if (!ready || !displayedWorld) return null;
    cursorRay.setFromCamera(cursorNdc,camera);
    const {origin, direction} = cursorRay.ray;
    // At the pole there is no horizontal bearing to recover from atan2.
    // Keep the input heading so lowering the view returns along the same plane.
    if(direction.y>1-1e-12)return {yaw:viewHeading,pitch:zenith};
    const windowCar=station==='car-window' && sidearmCar(displayedWorld,id);
    if(station==='car-window' && !windowCar)return null;
    const muzzle=windowCar ? carPistolGrip(windowCar,id) : station==='spear' ? spearOrigin(feet) : station==='engine' ? {x:feet.x,y:feet.y+monitorHeight,z:feet.z} : station==='tankCannon' ? {x:feet.x,y:feet.y+tankPivot,z:feet.z} : station ? mountPosition(vehicleById(displayedWorld,station),mounts[station].turret) : {x:feet.x,y:feet.y+stanceMuzzleHeight(feet),z:feet.z};
    const muzzleY=muzzle.y;
    const cameraOffset = Math.hypot(origin.x-muzzle.x, origin.y-muzzleY, origin.z-muzzle.z);
    // When the helicopter's sight ray passes through the turret pivot,
    // every point on that ray gives the same bearing from the muzzle.
    if((station==='heli'||station==='heli2') && cursorRay.ray.distanceSqToPoint(muzzle)<1e-8)
      return {yaw:Math.atan2(direction.x,-direction.z),pitch:Math.asin(clamp(direction.y,-1,1))};
    const actors = [...displayedPlayers, ...displayedWorld.npcs]
      .filter(p => !p.dead && p.id !== id && p.id!==displayedWorld.tank?.driver && (station!=='tankCannon' || p.id!==displayedWorld.tank?.gunner) && !crewBoat(displayedWorld,p.id) && !['heli','heli2'].some(kind=>p.id===displayedWorld[kind]?.pilot || p.id===displayedWorld[kind]?.gunner) && !['rover','rover2','rover3'].some(kind=>p.id===displayedWorld[kind]?.driver))
      .map(state => ({id:state.id,state,yaw:state.yaw,moving:state.moving}));
    const aimHit=tracePulse(displayedWorld, actors, origin, direction, range + cameraOffset, false, windowCar?carSource(windowCar):station==='tankCannon'?'tank':station==='spear'?null:station);
    let {to}=aimHit;
    if(CITY && to){
      const depth=Math.hypot(to.x-origin.x,to.y-origin.y,to.z-origin.z);
      to=aimGlassPoint(displayedWorld,origin,direction,depth+(aimHit.blocked ? .205 : 0))??to;
    }
    // An obstruction between the chase camera and the turret cannot be an aim point
    // for the barrel. Keep its forward sightline while the camera passes that cover.
    if(station && station!=='spear' && Math.hypot(to.x-origin.x,to.y-origin.y,to.z-origin.z)<cameraOffset+1) {
      const depth=range+cameraOffset;
      to={x:origin.x+direction.x*depth,y:origin.y+direction.y*depth,z:origin.z+direction.z*depth};
    }
    const dx = to.x - muzzle.x, dz = to.z - muzzle.z;
    return {yaw: Math.atan2(dx, -dz), pitch: Math.atan2(to.y-muzzleY, Math.hypot(dx,dz))};
  }
  let sprintGate,drawMarket,drawVolleyball;
  const drawStreetRides=streetRideView(scene,Batch);
  let localActorId;
  function render(local,remotes,view,dt,world) {
    const updateStart=profileFrames?performance.now():0;
    localActorId=local?.id;
    if(local && world.rides)drawStreetRides(world.rides,local,remotes,dt);
    if(world.market){drawMarket??=marketStockView(scene);drawMarket(world.market);}
    if(view.marinaSprint && local){
      sprintGate??=createSprintGate(scene,Batch);
      sprintGate(local.race?.phase==='racing'?local.race.next:-1);
    }
    if(!local) return;
    if(world.volleyball){
      drawVolleyball??=volleyballView(scene);
      drawVolleyball(world.volleyball,local,remotes,world.volleyballTick,dt);
    }
    const altitude=Math.max(0,local.y-20);
    scene.fog.density=(CITY ? .005 : .0067)/(1+Math.min(4,altitude/32));
    // Bake a new sun map only when the camera's district changes.
    const insideLantern=CITY && local.z<(lanternShadows?-330:-342);
    const nearResort=CITY && Math.hypot(local.x+69,local.z-60)<70;
    const shadowBand=nearResort?Math.floor(Math.max(0,local.y)/25):-1;
    if(lanternShadows!==insideLantern || casinoShadowBand!==shadowBand){
      casinoShadowBand=shadowBand;
      lanternShadows=insideLantern;
      const distance=lanternShadows?2.2:nearResort?1.8:1,centerZ=lanternShadows?-416:nearResort?61:0;
      const centerX=nearResort?-68:0,centerY=nearResort?shadowBand*25+5:0;
      sun.target.position.set(centerX,centerY,centerZ);
      sun.position.set(centerX-36*distance,centerY+(nearResort?45:32)*distance,centerZ-21*distance);
      const extent=lanternShadows?92:nearResort?52:45;
      Object.assign(sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,far:lanternShadows||nearResort?240:130});
      sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
    }
    dt=clamp(dt||.016,0,.10);clock+=dt;
    resize();
    const heli=world?.heli ?? parked,heli2=world?.heli2;
    effects.wreck(heli,dt);
    if(heli2)effects.wreck(heli2,dt);
    lighting.frame(world,local);
    displayedWorld = world;
    displayedPlayers = remotes;
    if(world.match){updateCases??=createCaseView(scene);updateCases(world.match);}
    else {updateSupplyView??=createSupplyView(scene);updateSupplyView(world);}
    updateHydrants(world.doors?.hydrants,dt);
    updateInteriors(local,world.doors,dt,remotes);
    const bankVisual=CITY?bankPresentation(world.bank,world.simTick??0,reducedMotion?.matches):null;
    updateDoors?.(world.doors,dt,local,remotes,world.simTick,bankVisual);
    updateRuralGlass?.(world.doors?.brokenPanes);
    updateChurch?.(world.doors?.brokenPanes);
    updatePatrolBoats(world?.boats,dt,local);
    updatePartyYachts?.(world.boats,dt,local,world.simTick,world.panicCues);
    updateMarinaFleet?.(world.boats,dt,local);
    updateYacht?.(world.yacht,dt,local);
    if(bowGun && world.yacht){bowGun(world.yacht);effects.yachtExhaust(world.yacht,dt);}
    jetModel.update(world.jet,dt);
    const flyingJet=world.jet?.pilot===local.id;
    const aircraft=flyingJet ? world.jet : heli2?.pilot===local.id?heli2:heli;
    const piloting=aircraft.pilot!=null && local.id===aircraft.pilot;
    updateCargoHook(world);
    helicopter.update(heli,dt,local.id===heli.pilot || local.id===heli.gunner);
    if(heli2)helicopter2.update(heli2,dt,local.id===heli2.pilot || local.id===heli2.gunner);
    const rover=world.rover, supercar=world.supercar;
    const inTank=world.tank?.driver===local.id;
    updateTank?.(world.tank,dt);
    const cars=world.traffic??[];
    updateGarages([world.rover,world.rover2,world.rover3,world.supercar,...cars].filter(Boolean));
    updateTraffic(cars,dt,local,world.patrolCars);
    const road=inTank?world.tank:cars.find(car=>car.driver===local.id)??(supercar?.driver===local.id ? supercar : [rover,world.rover2,world.rover3].find(car=>car?.driver===local.id)??rover);
    const driving=road.driver===local.id;
    if(updateSupercar)updateSupercar(supercar,dt);
    marks.update(world,local,remotes,dt);
    updateTireDebris(rover,dt);
    updateRover(rover,dt);roverTurret(rover,!updateRover.usesModel);heliTurret(heli);if(heli2)heli2Turret(heli2);
    for(let i=0;i<updateExtraRovers.length;i++){
      const car=world[['rover2','rover3'][i]];
      if(!car)continue;
      const update=updateExtraRovers[i],label=extraRoverLabels[i];
      update(car,dt);extraRoverTurrets[i](car,!update.usesModel);
      label.sprite.position.set(car.x,car.y+2.65,car.z);
      label.sprite.visible=!car.crushed && local.id!==car.driver && local.id!==car.gunner;
      label.update(car.hp,car.maxHp,car.wrecked?Math.ceil(car.recoverySeconds):null);
    }
    roverLabel.sprite.position.set(rover.x,rover.y+2.65,rover.z);
    roverLabel.sprite.visible=!rover.crushed && local.id!==rover.driver && local.id!==rover.gunner;
    roverLabel.update(rover.hp,rover.maxHp,rover.wrecked ? Math.ceil(rover.recoverySeconds) : null);
    for(const stack of stacks) {
      const {prop,mesh}=stack;
      const hp=world?.hp?.[prop.id] ?? prop.hp;
      if(hp!==stack.hp) {
        if(hp===0 && stack.hp>0) effects.burst(prop.x,mesh.position.y+prop.height*.48,prop.z);
        mesh.visible=hp>0;
        if(hp>0) mesh.scale.y=.78+.22*hp/prop.hp;
        stack.hp=hp;
      }
    }
    updateMissiles(world.missiles ?? [],dt);

    drawCapsules(world.throwables,world.simTick,dt,local.id,view.sighted);
    effects.fireView.update(world.doors,local,dt);
    effects.update(dt);
    contacts.begin(world,local);
    const live=new Set();
    distant?.begin();
    const basketball=world.basketball;
    updateBasketball?.(basketball,local,remotes,clock,dt);
    const hoopPlayers=onBasketballCourt(local,120) ?
      basketball?.npcs.filter((_,i)=>basketball.players[i]==null)??[] : [];
    const detailScale=view.sighted ? (local.weapon===3 ? 3.1 : 1.8) : 1;
    updateCasino?.(world.casino,local);
    updateResortExterior?.(dt,local,world.doors);
    const attackTick=world.frameTick??world.simTick;
    const remoteAttackTick=world.meleeRemoteTick??attackTick;
    const players=[local,...remotes];
    updateFishing?.(players,local,attackTick);
    const blastDeath=local.dead && local.deathKind==='blast';
    const localDefeat=local.dead && !blastDeath && world.sharkDefeats?.find(e=>e.playerId===local.id);
    const athletes=volleyballActors(world.volleyball,world.volleyballAthletes,local);
    for(const state of [...players,...(world?.npcs ?? []),...(CITY?bankCast(local,world,bankVisual):[]),...(CITY?casinoCast(local,world.casino):[]),...athletes,...hoopPlayers]) {
      if(state.venue && Math.hypot(state.x-local.x,state.z-local.z)>(state.venue==='beach'?48:22))continue;
      if(state.burning)effects.fireView.burningActor(state,local);
      live.add(state.id);
      let a=avatars.get(state.id);
      if(state.dead && state.deathKind==='blast'){
        if(a){
          a.root.visible=a.shadow.visible=a.label.sprite.visible=false;
          clearLostParts(a);
          for(const ring of a.ripples?.rings??[])ring.visible=false;
        }
        continue;
      }
      const entering=cars.find(car=>car.takeover && (car.takeover.npcId===state.id || car.takeover.playerId===state.id));
      const inTraffic=state.cruiserId?world.patrolCars?.find(car=>car.id===state.cruiserId):cars.find(car=>car.driver===state.id || car.npcDriver===state.id);
      if(state.evacLook && Math.hypot(state.x-local.x,state.z-local.z)>115*detailScale){
        if(a){
          a.root.visible=a.shadow.visible=a.label.sprite.visible=false;
          for(const ring of a.ripples?.rings??[])ring.visible=false;
        }
        continue;
      }
      if(inTraffic?.npcDriver===state.id && Math.hypot(state.x-local.x,state.z-local.z)>55*detailScale){
        if(a){a.root.visible=a.shadow.visible=a.label.sprite.visible=false;}
        continue;
      }
      if(!state.venue && !state.volleyball && !state.bankRole && !state.casinoDealer && !entering && !inTraffic && typeof state.id==='string' && distant?.add(state,local,detailScale,clock)){
        if(a){
          a.root.visible=false;a.shadow.visible=false;a.label.sprite.visible=false;
          if(a.detached?.size)applyLostParts(a,state,scene,world.hp,dt);
          for(const ring of a.ripples?.rings??[])ring.visible=false;
        }
        continue;
      }
      if(state.scuba)preloadScubaDiver();
      const diver=useScubaDiver(state);
      const appearance=diver ? null : typeof state.id==='number' && useNathan(state) ? 'nathan' : usePlayerScan(state);
      const civilianScan=state.infected ? undefined : nearbyCivilianScan?.(state);
      if(a && ((a.scanned??null)!==appearance || Boolean(a.scubaDiver)!==diver || a.civilianScan!==civilianScan)){removeAvatar(a);a=null;}
      if(!a) {
        const rival = typeof state.id === 'string';
        if(state.infected){
          a=resident(state.id,'Infected',false,infectedLook(state.infected),state.infected);
        }else a=state.officer || (CITY && rival && (state.venue || civilianLooks[state.evacLook??state.id] || cabaretLooks[state.id] || bankLooks[state.id] || dealerLooks[state.id] || basketballLooks[state.id] || volleyballLooks[state.id])) ? resident(state.id,state.name,state.officer,state.lookId??state.evacLook,0,civilianScan) : hiker(scene,state.id,rival ? (state.id==='rival-fern' ? 0xae6974 : 0x868854) : state.color,material,uniform,visorMaterials,shadowMap,state.name || (teamNames[state.team]??'Hiker')+' '+state.id,appearance,diver);
        a.root.name='Actor '+state.id;
        avatars.set(state.id,a);
      }
      if(state.lastDive || a.diveSpray)diveSpray(a,state.lastDive,attackTick);
      if(state.weapon===6){
        const flight=world.throwables?.find(c=>c.shooter===state.id && world.simTick-c.born<12);
        if(flight && a.lastThrow!==flight.id){a.lastThrow=flight.id;a.throwSwing=.40;}
      }
      a.throwSwing=Math.max(0,(a.throwSwing??0)-dt);
      a.label.sprite.visible = (!state.beachRole || state.beachRole==='bar') && !state.bankRole && !state.casinoDealer && !state.volleyball && state.id !== local.id && Math.hypot(local.x-state.x,local.z-state.z)<32;
      const boat=crewBoat(world,state.id);
      const seated=inTraffic??(state.id===supercar?.driver ? supercar : [rover,world.rover2,world.rover3].find(car=>car && (state.id===car.driver || state.id===car.gunner))??(boat?.driver===state.id ? boat : null));
      const station=state.id===world.tank?.gunner ? world.tank : state.id===world.yacht?.gunner ? world.yacht : boat?.gunner===state.id ? boat : null;
      const crewHeli=heli2 && (state.id===heli2.pilot || state.id===heli2.gunner)?heli2:heli;
      const heliPilot=state.id===crewHeli.pilot,heliGunner=state.id===crewHeli.gunner;
      const heliCrew=heliPilot || heliGunner;
      a.root.visible=state.id!==world.tank?.driver && state.id!==world.jet?.pilot;
      a.shadow.visible=a.root.visible && !state.swimming && !seated && !station;
      if(heliCrew)a.shadow.visible=false;
      if(!a.root.visible && a.ripples) for(const ring of a.ripples.rings) ring.visible=false;
      if(state.id===world.tank?.driver || seated || entering || station || heliCrew || state.id===world.jet?.pilot) a.label.sprite.visible=false;
      const skipper=world.yacht?.driver===state.id;
      if(typeof state.id==='number' && state.paradeCostume && !a.parade)a.parade=fitParadeBreeches(a.body,Batch);
      if(state.scuba && !a.scubaDiver && !a.scubaTank){
        const gear=new Batch();
        gear.add(trunk,0xc8cabc,0,1.275,.29,.095,.40,.095);
        for(const y of [1.09,1.29,1.42])gear.add(round,0x38454b,0,y,.29,.102,.022,.102);
        gear.add(round,0xd4aa49,0,1.47,.29,.086,.065,.086);
        gear.beam(0x2f3939,[0,1.52,.29],[.13,1.49,.10],.025);
        a.scubaTank=gear.mesh(a.upper,a.material,false);
      }
      if(a.scubaTank)a.scubaTank.visible=!!state.scuba && !!state.swimming;
      if(a.parade)a.parade.visible=!!state.paradeCostume && !seated && !station && !skipper && !entering;
      const mauling=state.dead && world.sharkDefeats?.find(e=>e.playerId===state.id);
      if(a.root.visible && mauling){
        releaseRagdoll(a);
        poseBittenSwimmer(a,mauling,Math.max(0,(attackTick-mauling.tick)/30));
      }else if(a.root.visible){
        const crewSeat=heliCrew ? (crewHeli===heli2?helicopter2:helicopter).crewSeat(heliPilot) : null;
        const posedState=heliCrew ? {...state,x:crewSeat.x,y:crewSeat.y,z:crewSeat.z,yaw:crewHeli.yaw,moving:false,grounded:false,swimming:false,parachute:'packed'} :
          skipper ? {...state,...yachtHelmFeet(world.yacht),yaw:world.yacht.yaw,moving:false} : state;
        pose(a,posedState,dt,seated,station,world.doors,state.id===local.id?attackTick:remoteAttackTick);
        if(heliCrew){
          a.root.rotation.set(crewHeli.pitch||0,-crewHeli.yaw,crewHeli.roll||0,'YXZ');
          a.root.scale.multiplyScalar(.60);
          for(const limb of a.limbs){
            limb.leg.rotation.x=1.36;limb.knee.rotation.x=-1.30;
            limb.arm.rotation.x=1.04;limb.forearm.rotation.x=.50;
          }
          for(const tool of a.tools)tool.visible=false;
        }
        if(state.infected)poseInfected(a,state,clock);
        if(!seated && !station && !entering && !skipper && !heliCrew)contacts.boots(a,state,local);
        if(state.casinoDealer || world.casino?.player===state.id)poseAtTable(a,!!state.casinoDealer,world.casino,clock);
        if(state.bankRole)poseBankGuest(a,state,bankVisual,(world.simTick??clock*30)/30);
        const volley=state.volleyball??volleyballMember(world.volleyball,state.id);
        if(volley && !state.sidelined && !state.dead && !state.fall)poseVolleyball(a,state,volley,world.volleyballTick);
        const hoops=basketballPose(basketball,state,clock);
        if(hoops)poseBasketball(a,state,hoops);
        if(a.shaker)a.shaker.visible=!!state.pouring;
        if(state.beachPose || state.beachRole)poseBeachClub(a,state,attackTick,skyDarkness.value>0);
        if(state.performer || state.clubSince!=null)poseCabaret(a,state,(world.simTick??clock*30)/30);
        if(typeof state.id==='string' && !state.dead && !state.fall &&
          (state.casinoDealer || state.bankRole)){
          const alarm=gunfireAlarm(world.panicCues,state,world.simTick);
          poseBystanderCover(a,state,alarm,dt,clock,false);
        }
        if(entering)poseTakeover(a,entering,state.id);
        else if(seated?.boarding)poseRoadBoarding(a,seated,seated.boarding);
        if(skipper){
          a.root.rotation.y=-world.yacht.yaw;
          for(const kit of a.tools)kit.visible=false;
          for(const {arm,forearm,side} of a.limbs){arm.rotation.set(.52,0,side*.12);forearm.rotation.set(.94,0,0);}
        }
        if(aboardYacht(world.yacht,state))a.shadow.position.y=state.y+.027;
      }
      if(a.nathan)poseNathan(a);
      applyLostParts(a,state,scene,world.hp,dt);
    }
    showSwordContacts(players,local,attackTick,remoteAttackTick);
    updateDogs?.(world.dogs,avatars,local,dt,clock,attackTick);
    contacts.end(world,local);
    effects.fireView.finishActors();
    distant?.finish();
    for(const [key,a] of avatars) if(!live.has(key)){removeAvatar(a);avatars.delete(key);}
    const boat=crewBoat(world,local.id);
    const marinaBoats=CITY ? world.boats.filter(b=>b.boatModel && !b.wrecked && b!==boat &&
      Math.hypot(local.x-b.x,local.z-b.z)<14) : null;
    const yachtHelm=world.yacht?.driver===local.id;
    const localStation=world.tank?.gunner===local.id ? 'tank' : world.yacht?.gunner===local.id ? 'superyacht' : boat?.gunner===local.id ? boat.id : local.id===heli.gunner ? 'heli' : local.id===heli2?.gunner?'heli2':['rover','rover2','rover3'].find(kind=>world[kind]?.gunner===local.id)??null;
    const tenant=CITY && retailRoom(local.x,local.y,local.z);
    const gallery=CITY && galleryRoomAt(local.x,local.y,local.z);
    const nearbyYacht=world.yacht && Math.hypot(local.x-world.yacht.x,local.z-world.yacht.z)<25 ? world.yacht : null;
    const cabinDepth=yachtRoomDepth(nearbyYacht,local.x,local.y,local.z);
    const chapel=!CITY && churchRoom(local.x,local.y,local.z);
    const palace=CITY && inPalazzoMare(local.x,local.y,local.z);
    const villa=CITY && casaRoomAt(local.x,local.y,local.z);
    const clubRoom=CITY && inClub(local);
    const furnished=roomAtFeet(local,world.doors);
    const indoors=Boolean(furnished || local.liftTravel || clubRoom || chapel || cabinDepth>=0 || palace || villa || tenant || gallery || CITY && storefrontRoom(local.x,local.y,local.z));
    const depth=furnished || local.liftTravel ? 1 : clubRoom ? Math.max(0,-49.5-local.z) : chapel ? 1 : cabinDepth>=0 ? cabinDepth : palace ? 1 : villa ? Math.min(villa.w/2-Math.abs(local.x-villa.x),villa.d/2-Math.abs(local.z-villa.z)) : gallery ? galleryEntryDepth(gallery,local.z) : tenant ? (tenant.x-local.x)*tenant.side : doorX-local.x;
    // The feet cross a doorway in one tick, but the shoulder rig still spans
    // both rooms. Carry close clearance and framing across the threshold.
    const doorway=CITY && !driving && !piloting && !localStation ? doorwayProximity(local.x,local.y,local.z) : 0;
    const interiorTarget=Math.max(doorway*.45,indoors ? .28+.72*THREE.MathUtils.smoothstep(depth,0,1.10) : 0);
    interiorBlend=THREE.MathUtils.damp(interiorBlend,interiorTarget,8,dt);
    const roomBlend=interiorBlend,nearInterior=indoors || doorway>0 || roomBlend>.015;
    const nearbyFireEngines=!driving && !piloting && !localStation ? cars.filter(car=>car.model==='engine' &&
      Math.hypot(car.x-local.x,car.z-local.z)<12) : [];
    // Horizontal field of view narrows in portrait while the shoulder rig is
    // measured in metres. Keep the avatar inside the left third of the screen.
    const portraitInset=view.touch?Math.max(0,1-camera.aspect):0;
    if(localStation) {
      const pivot=mountPosition(vehicleById(world,localStation),mounts[localStation].turret);
      desired.set(pivot.x,pivot.y,pivot.z);
    }
    else if(yachtHelm)desired.set(world.yacht.x,world.yacht.y+6.8,world.yacht.z);
    else if(boat)desired.set(boat.x,boat.y+(marinaModel(boat)?.deck??.38)+.67,boat.z);
    else if(driving){
      const frame=view.road;
      desired.set(road.x+Math.sin(road.yaw)*(frame?.lead??0),
        road.y+(road.model==='engine'?monitorHeight:inTank?3.35:[rover,world.rover2,world.rover3].includes(road)?2.5:1.03)+(frame?.height??0)+(frame?.lift??0),
        road.z-Math.cos(road.yaw)*(frame?.lead??0));
    }
    else if(piloting) desired.set(aircraft.x,aircraft.y+(flyingJet?1.2*jetScale:1.58),aircraft.z);
    else {
      let shoulder=local.parachute ? 0 : mix(mix(view.basketball?.88:.66,.37,roomBlend),.19,doorway)*(1-portraitInset*(view.basketball?.68:1));
      const shoulderHeight=(local.clubSince!=null?1.07:1.46)-stanceDrop(local),cs=Math.cos(view.yaw),sn=Math.sin(view.yaw);
      if(nearInterior && shoulder){
        sideways.set(cs,0,sn);
        desired.set(local.x,local.y+shoulderHeight,local.z);
        shoulder=Math.max(0,cameraDistance(desired,sideways,shoulder,world.hp,0,world.doors,true,nearbyYacht,marinaBoats)-.04);
      }
      const x=local.x+shoulder*cs,z=local.z+shoulder*sn;
      shoreCamera+=clamp(waterBlend(local)-shoreCamera,-dt*3.8,dt*3.8);
      const clear=!yachtSolidAt(nearbyYacht,x,local.y+shoulderHeight,z,.16) &&
        !marinaBlocks(marinaBoats,x,local.y+shoulderHeight,z,.16) &&
        !fireEngineCameraContains(nearbyFireEngines,x,local.y+shoulderHeight,z) &&
        buildingTopAt(x,z,.15,local.y+shoulderHeight,world.doors)<local.y+shoulderHeight-.16;
      desired.set(clear ? x : local.x,local.y+(local.parachute==='open' ? 2.1 : mix(shoulderHeight,1.00,shoreCamera)),clear ? z : local.z);
    }
    // Give the jumper and the drifting aircraft room in the same shot.
    const watchCrash = local.parachute && (heli.abandonedFor != null || heli.wrecked);
    const separation = watchCrash ? Math.hypot(heli.x-local.x,heli.y-local.y,heli.z-local.z) : 0;
    if (watchCrash) desired.lerp(helicopter.group.position, Math.min(.40,5/Math.max(1,separation)));
    if(lastFocus && lastFocus.id===local.id && !watchCrash && !local.dead && !local.fall &&
        Math.hypot(local.x-lastFocus.x,local.z-lastFocus.z)<3) {
      target.x+=local.x-lastFocus.x;target.z+=local.z-lastFocus.z;
    }
    lastFocus={id:local.id,x:local.x,z:local.z};
    if(!ready || cabinDepth>=0 || desired.distanceToSquared(target)>36) {target.copy(desired);ready=true;}
    else target.lerp(desired,1-Math.exp(-dt*24));
    // A slight shoulder view separates the canopy from the aircraft ahead.
    bailoutOrbit = mix(bailoutOrbit,watchCrash ? .31 : 0,1-Math.exp(-dt*6));
    const pitch=viewPitch(view.pitch??-.12),yaw=(view.yaw||0)+bailoutOrbit;
    viewHeading=yaw;
    boom.set(-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
    if(flyingJet){
      camera.rotation.set(aircraft.pitch,-aircraft.yaw,aircraft.roll,'YXZ');
      camera.up.set(0,1,0).applyQuaternion(camera.quaternion);
      boom.set(0,.16,1).normalize().applyQuaternion(camera.quaternion);
      const cockpit=mountPosition(aircraft,[0,1.2*jetScale,-1.0*jetScale]);
      target.set(cockpit.x,cockpit.y,cockpit.z);
    }else camera.up.copy(up);
    const onFoot=!yachtHelm && !boat && !localStation && !piloting && !driving && !local.parachute;
    const humveeDriving=driving && [rover,world.rover2,world.rover3].includes(road);
    const outdoorDistance=flyingJet ? 10+(view.distance||4.4)*jetScale : yachtHelm ? 24+1.45*(view.distance||4.4) : clamp((view.distance||4.4)*(onFoot ? (view.basketball?.82:.53)+.16*portraitInset : 1),1.35,inTank?11:humveeDriving?12:7.5) + (piloting ? 6.0 : boat ? 2.5 : inTank ? 6.8+(view.road?.reach??0) : humveeDriving ? 6.8+(view.road?.reach??0) : driving ? 1.7+(view.road?.reach??0) : Math.min(6,separation*.5));
    const wanted=mix(outdoorDistance,Math.min(2.25,outdoorDistance),roomBlend);
    const cameraYacht=onFoot ? nearbyYacht : null;
    let clearance=cameraDistance(target,boom,wanted,world.hp,driving ? 1.1 : 0,world.doors,nearInterior,cameraYacht,marinaBoats,nearbyFireEngines);
    // When backed against an interior wall, the usual boom can collapse into
    // the character. Swing it along the wall for a short three-quarter view.
    if(onFoot && (nearInterior || marinaBoats?.length)){
      let orbit=0;
      if(clearance<1.50){
        // Try the previous side first to avoid oscillating at a door jamb.
        const turn=THREE.MathUtils.smoothstep(1.50-clearance,0,1.1)*Math.PI*.48;
        const first=indoorAngle<0 ? -1 : 1;
        let best=clearance;
        for(const angle of [first*turn,-first*turn,first*Math.PI*.57,-first*Math.PI*.57]){
          sideways.copy(boom).applyAxisAngle(up,angle);
          const available=cameraDistance(target,sideways,Math.min(wanted,1.64),world.hp,0,world.doors,true,cameraYacht,marinaBoats,nearbyFireEngines);
          if(available>best+.18){orbit=angle;best=available;}
          if(best>1.47)break;
        }
      }
      indoorAngle=THREE.MathUtils.damp(indoorAngle,orbit,10,dt);
      if(Math.abs(indoorAngle)>.01){
        boom.applyAxisAngle(up,indoorAngle);
        clearance=cameraDistance(target,boom,wanted,world.hp,0,world.doors,true,cameraYacht,marinaBoats,nearbyFireEngines);
      }
    }else indoorAngle=0;
    // Pull in at obstructions, then ease back out as the orbit clears them.
    roverBoom = driving ? Math.min(clearance, mix(roverBoom ?? clearance,clearance,1-Math.exp(-8*dt))) : null;
    // Collision sets the hard limit. After a wall or moving door clears, ease
    // back to follow distance instead of snapping behind the character.
    footBoom=onFoot ? Math.min(clearance,THREE.MathUtils.damp(footBoom??clearance,clearance,nearInterior?5.5:10,dt)) : null;
    const distance=roverBoom ?? footBoom ?? clearance;
    camera.position.copy(target).addScaledVector(boom,distance);
    const cameraWater=waterSurfaceAt(camera.position.x,camera.position.z,camera.position.y);
    const exploring=(local.swimDepth??0)>.42;
    if(exploring)camera.position.y=Math.max(groundHeight(camera.position.x,camera.position.z,local.y,world.doors)+.16,Math.min(cameraWater-.12,camera.position.y));
    else if(local.swimming || groundHeight(camera.position.x,camera.position.z,camera.position.y)<cameraWater)camera.position.y=Math.max(camera.position.y,cameraWater+.27);
    // At steep angles transition from the ground-limited chase boom to an
    // unobstructed vertical sightline directly above the person or station.
    const overhead=flyingJet?0:THREE.MathUtils.smoothstep(pitch,.79,zenith);
    if(!flyingJet && zenith-pitch<1e-5)camera.rotation.set(pitch,-yaw,0,'YXZ');
    else camera.lookAt(target);
    if(overhead>0){
      if(localStation){
        const p=mountPosition(vehicleById(world,localStation),mounts[localStation].turret);
        overheadEye.set(p.x,localStation==='heli'||localStation==='heli2' ? Math.max(p.y+2.05,world[localStation].y+3.65) : p.y+2.05,p.z);
      }else if(piloting)overheadEye.set(aircraft.x,aircraft.y+3.65,aircraft.z);
      else if(driving)overheadEye.set(road.x,road.y+2.60,road.z);
      else if(boat)overheadEye.set(boat.x,boat.y+2.50,boat.z);
      else overheadEye.set(local.x,local.y+stanceMuzzleHeight(local),local.z);
      camera.position.lerp(overheadEye,overhead);
    }
    const localBody=avatars.get(local.id)?.root;
    if(localBody)localBody.visible=!blastDeath && !inTank && ((local.id===heli.pilot || local.id===heli.gunner) ||
      (!piloting && (nearInterior || distance>.86) && (!onFoot || overhead<.48)));
    const sighted = onFoot && !local.holstered && Boolean(view.sighted) && !local.dead && !local.fall && !local.climb && !local.swimming && !isArcadeMelee(local.weapon);
    sightModels[0].visible=sighted && local.weapon===1;
    sightModels[1].visible=sighted && local.weapon===2;
    sightModels[5].visible=sighted && local.weapon===6 && !avatars.get(local.id)?.throwSwing;
    sightModels[4].visible=sighted && local.weapon===5;
    sightModels[3].visible=sighted && local.weapon===4;
    sightModels[2].visible=sighted && local.weapon===3;
    if(sightModels[2].visible)sightModels[2].scale.setScalar(Math.min(1,camera.aspect));
    const bowSight=localStation==='superyacht' && !local.dead && !local.fall;
    const fov = bowSight ? 26 : sighted ? (local.weapon===3 ? 19 : 32) : 55+6*roomBlend;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    if (sighted) {
      camera.position.set(local.x, local.y + stanceMuzzleHeight(local), local.z);
      camera.rotation.set(pitch,-yaw,0,'YXZ');
      if(localBody)localBody.visible=false;
    }
    if(ridingHotelShaft(local)){
      camera.position.set(local.x,local.y+1.59,local.z);
      camera.rotation.set(view.pitch,-view.yaw,0,'YXZ');
      avatars.get(local.id).root.visible=false;
    }
    if(local.clubSince!=null){
      // From the booth the camera sits at eye height. Spectators still see
      // the guest seated against the backrest and can look around freely.
      camera.position.set(local.x+.10,local.y+1.13,local.z);
      camera.rotation.set(view.pitch,-view.yaw,0,'YXZ');
      if(localBody)localBody.visible=false;
    }
    if(bowSight){
      const pivot=mountPosition(world.yacht,mounts.superyacht.turret);
      camera.rotation.set(pitch,-yaw,0,'YXZ');
      camera.position.set(pivot.x,pivot.y,pivot.z);
      camera.translateZ(-1.12);
      if(localBody)localBody.visible=false;
    }
    if(localDefeat){
      const age=Math.max(0,(attackTick-localDefeat.tick)/30);
      if(framedBite!==localDefeat.id){
        framedBite=localDefeat.id;
        biteSide=Math.cos(view.yaw-(localDefeat.towYaw??localDefeat.yaw))>=0?1:-1;
      }
      const shot=sharkDefeatCamera(localDefeat,age,biteSide,reducedMotion?.matches,MAP.waterY);
      desired.set(shot.x,shot.y,shot.z);
      camera.position.lerp(desired,THREE.MathUtils.smoothstep(age,0,.36));
      camera.lookAt(shot.lookX,shot.lookY,shot.lookZ);
      if(localBody)localBody.visible=true;
    }
    if(world.casino?.player===local.id && !local.dead){
      camera.position.set(casinoSeat.x+1.13,casinoSeat.y+2.04,casinoSeat.z+.99);
      camera.lookAt(casinoSeat.x,casinoSeat.y+1.08,casinoSeat.z-1.62);
    }
    updateGulls?.(world.gulls,local,world.simTick,dt);
    updateDogSpray?.(world.sharks,local,world.dogs,attackTick);
    updateFish?.(camera.position,attackTick,world.spearedFish);
    updateSpears?.(players,local,view.spearSight,attackTick,avatars.get(local.id));
    updateDolphins?.(world.dolphins,local,world.simTick,dt);
    swimmerImpacts.frame(local,dt);
    updateSharks?.(world.sharks,local,attackTick,dt,world.sharkDefeats);
    updateSharkDefeats?.(world.sharkDefeats,world.simTick,local,dt);
    updateManatees?.(world.manatees,local,world.simTick,dt);
    updateReef?.(camera,MAP.waterY);
    updateCreek?.(clock);
    if(updatePalms){updateWaterfrontBreeze(clock);updatePalms(camera,world.doors,world.simTick);}
    // Sample once the visible gun, avatar and camera all have their current-frame pose.
    for(const flash of pendingMuzzles){
      if(flash.source==='jet'){
        if(world.jet?.pilot===flash.shooter && !world.jet.wrecked)jetModel.flashCannon();
        continue;
      }
      const from=visibleMuzzle(flash.shooter,flash.firedWeapon,muzzlePoint);
      effects.shot(from ? {...flash,from} : flash,flash.source);
    }
    pendingMuzzles.length=0;
    updateRounds(world.bullets,visibleMuzzle,localActorId);
    const drawStart=profileFrames?performance.now():0;
    if((localDefeat || exploring) && camera.position.y<cameraWater){
      if(!diveBackdrop){
        diveBackdrop=new THREE.Mesh(new THREE.SphereGeometry(12,24,12),new THREE.ShaderMaterial({
          side:THREE.BackSide,depthWrite:false,uniforms:{time:{value:0}},
          vertexShader:`varying vec3 dir;void main(){dir=position;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
          fragmentShader:`varying vec3 dir;uniform float time;
            void main(){vec3 d=normalize(dir);float light=smoothstep(-.72,.82,d.y);
              float wave=sin(d.x*19.+d.y*7.+time)*sin(d.z*16.-time*.76);
              vec3 tint=mix(vec3(.007,.030,.043),vec3(.055,.24,.25),light);
              tint+=vec3(.009,.035,.027)*wave*smoothstep(.12,.85,d.y);
              gl_FragColor=vec4(tint,1.);
              #include <colorspace_fragment>
            }`
        }));
        diveBackdrop.renderOrder=-20;scene.add(diveBackdrop);
      }
      const airFog=scene.fog,far=camera.far;
      scene.fog=underwaterFog;camera.far=exploring?38:16;camera.updateProjectionMatrix();
      diveBackdrop.material.uniforms.time.value=clock;
      diveBackdrop.position.copy(camera.position);diveBackdrop.visible=true;
      renderer.render(scene,camera);
      scene.fog=airFog;camera.far=far;camera.updateProjectionMatrix();diveBackdrop.visible=false;
    }else renderer.render(scene,camera);
    const localMesh=profileFrames?avatars.get(local.id)?.root.position:null;
    if(profileFrames)return {mesh:localMesh?{x:localMesh.x,y:localMesh.y,z:localMesh.z}:null,updateMs:drawStart-updateStart,drawMs:performance.now()-drawStart,camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z},drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
  }
  const pendingMuzzles=[];
  const muzzlePoint=new THREE.Vector3();
  const muzzleTips=[[0,.099,-.628],[0,.091,-.202],[0,.120,-.744]];
  function visibleMuzzle(shooter,weapon,out,source,forward){
    if(source==='jet'){
      const jet=displayedWorld?.jet;
      return jet && !jet.wrecked && jet.pilot===shooter ? jetModel.cannonMuzzle(out,forward) : null;
    }
    const tip=muzzleTips[weapon-1];
    if(!tip)return null;
    const avatar=avatars.get(shooter), sight=sightModels[weapon-1];
    if(shooter===localActorId && sight.visible){
      if(weapon===3)return camera.localToWorld(out.set(0,-.065,-.7));
      return sight.localToWorld(out.fromArray(tip));
    }
    const tool=avatar?.tools?.[weapon-1];
    return avatar?.root.visible && tool?.visible ? tool.localToWorld(out.fromArray(tip)) : null;
  }
  function showShots(shots,tick) {
    for(const shot of shots){
      if(isArcadeMelee(shot.weapon) || (shot.weapon==='muzzle' && isArcadeMelee(shot.firedWeapon)))continue;
      if(shot.weapon==='muzzle' && (shot.source==='jet' || (!shot.source && muzzleTips[shot.firedWeapon-1]))){
        pendingMuzzles.push(shot);continue;
      }
      if(shot.weapon==='waterHit'){swimmerImpacts.event(shot,tick);continue;}
      if(shot.weapon==='ember'){
        const tool=shot.shooter===localActorId && sightModels[4].visible ? sightModels[4] : avatars.get(shot.shooter)?.tools[4];
        if(tool){
          const from=tool.localToWorld(new THREE.Vector3(0,.095,-.451));
          // A close wall can be between the server origin and the visual nozzle.
          const toward=new THREE.Vector3().subVectors(shot.to,shot.from);
          if(toward.dot(new THREE.Vector3().subVectors(shot.to,from))>0){
            effects.shot({...shot,from},shot.source);continue;
          }
        }
      }
      effects.shot(shot,shot.source,displayedWorld);
    }
  }
  return {resetSurfaceMarks(){pendingMuzzles.length=0;marks.reset();swimmerImpacts.clear();},setLighting:lighting.setLevel,render,resize,aimAt,showShots,glassBurst:effects.glassBurst,dispose(){scene.traverse(node=>{
    if(node.isMesh){node.skeleton?.dispose();node.geometry.dispose();node.material.map?.dispose();node.material.dispose();}
  });shadowMap.dispose();renderer.dispose();}};
}
