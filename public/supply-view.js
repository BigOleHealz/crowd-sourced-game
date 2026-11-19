import * as THREE from 'three';
import { CITY, groundHeight } from './world.js';
import { DEPOT, OUTPOST, supplyGuidance } from './supply-run.js';

export function createSupplyView(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const metal = new THREE.MeshStandardMaterial({ color: 0x38463b, roughness: .9 });
  const paint = new THREE.MeshStandardMaterial({ color: 0xe6ae51, roughness: .8 });
  function mesh(parent, geometry, material, x, y, z) {
    const piece = new THREE.Mesh(geometry, material);
    piece.userData.impactSurface = material === metal || material === paint ? 'metal' : 'solid';
    piece.position.set(x,y,z);
    parent.add(piece);
    return piece;
  }
  function station(point, radius, name) {
    const origin = new THREE.Group();
    origin.position.set(point.x, groundHeight(point.x, point.z), point.z);
    group.add(origin);
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const c = canvas.getContext('2d');
    c.fillStyle = '#263b31'; c.fillRect(0,0,256,64);
    c.strokeStyle = '#e2ae59'; c.lineWidth = 4; c.strokeRect(3,3,250,58);
    c.fillStyle = '#fff1c4'; c.font = 'bold 25px sans-serif'; c.textAlign = 'center';
    c.fillText(name,128,41);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // Paint the station ID onto the apron, following the slope on rural sites.
    const patch=new THREE.PlaneGeometry(2.55,.64,8,2).rotateX(-Math.PI/2);
    const vertices=patch.attributes.position;
    for(let i=0;i<vertices.count;i++){
      const x=vertices.getX(i),z=vertices.getZ(i)+radius*.62;
      vertices.setXYZ(i,x,groundHeight(point.x+x,point.z+z)-origin.position.y+.035,z);
    }
    return mesh(origin,patch,new THREE.MeshBasicMaterial({map:texture}),0,0,0);
  }
  const depotBeacon = station(DEPOT,2.4,CITY ? 'BRICKELL DEPOT' : 'PINE DEPOT');
  const outpostBeacon = station(OUTPOST,3.4,CITY ? 'BAYFRONT LANDING' : 'RIDGE OUTPOST');
  const ringPoints = [];
  for (let i=0;i<80;i++) {
    const a = i/80*Math.PI*2, x = OUTPOST.x+3.25*Math.cos(a), z = OUTPOST.z+3.25*Math.sin(a);
    ringPoints.push(new THREE.Vector3(x,groundHeight(x,z)+.06,z));
  }
  group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPoints),
    new THREE.LineBasicMaterial({color:0xffdb82})));
  function cases(parent) {
    const rack = new THREE.Group();
    for (let i=0;i<3;i++) {
      const x = (i-1)*.43;
      mesh(rack,new THREE.BoxGeometry(.4,.38,.45),paint,x,.19,0);
      mesh(rack,new THREE.BoxGeometry(.08,.39,.46),metal,x,.19,0);
    }
    parent.add(rack);
    return rack;
  }
  const stock = cases(group);
  stock.position.set(DEPOT.x-1.9,groundHeight(DEPOT.x-1.9,DEPOT.z),DEPOT.z);
  const helicopterRack = new THREE.Group();
  group.add(helicopterRack);
  cases(helicopterRack).position.set(0,.48,1.05);
  return world => {
    group.visible = !!world?.mission && !!world.rover;
    if (!group.visible) return;
    const stage = world.mission.stage, heli = world.heli;
    stock.visible = depotBeacon.visible = stage === 'pickup';
    outpostBeacon.visible = stage === 'delivery' || stage === 'complete';
    helicopterRack.visible = heli.cargo > 0 && !heli.wrecked;
    helicopterRack.position.set(heli.x,heli.y,heli.z);
    helicopterRack.rotation.y = -heli.yaw;
  };
}

const captions = {pickup:'1 / 3 · Collect',transfer:'2 / 3 · Transfer',delivery:'3 / 3 · Deliver',complete:'Completed'};
const bearings = ['N','NE','E','SE','S','SW','W','NW'];

export function updateSupplyHud(world, local, id) {
  const guide = supplyGuidance(world,local,id);
  const card = document.getElementById('supply-card');
  card.hidden = !guide;
  if (!guide) return;
  const {stage, delivered, hold} = world.mission;
  const turn = guide.point && Math.atan2(guide.point.x-local.x, local.z-guide.point.z);
  const dir = bearings[(Math.round(turn/(Math.PI/4))+8)%8];
  const distance = guide.point && Math.round(Math.hypot(guide.point.x-local.x,guide.point.z-local.z));
  document.getElementById('supply-step').textContent = 'Supply run ' + (delivered + (stage !== 'complete' ? 1 : 0)) + ' · ' + captions[stage];
  document.getElementById('supply-name').textContent = guide.label;
  document.getElementById('supply-action').textContent = guide.action;
  document.getElementById('supply-bearing').textContent = guide.point ? dir + ' · ' + distance + ' m' : '';
  const progress = document.getElementById('supply-hold');
  progress.hidden = hold <= 0;
  progress.value = hold;
}

export function drawSupplyMap(ctx,sx,sy,world,player,id) {
  const guide = supplyGuidance(world,player,id);
  if (!guide) return;
  ctx.save();
  ctx.strokeStyle = '#ffdb82'; ctx.fillStyle = '#ffe3a0'; ctx.lineWidth = 2;
  if (guide.point) {
    ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(sx(player.x),sy(player.z));
    ctx.lineTo(sx(guide.point.x),sy(guide.point.z)); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(sx(guide.point.x),sy(guide.point.z),7,0,Math.PI*2); ctx.stroke();
  }
  ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
  for (const [p,label] of [[DEPOT,'P'],[OUTPOST,'D']]) {
    ctx.fillRect(sx(p.x)-2,sy(p.z)-2,4,4); ctx.fillText(label,sx(p.x)+5,sy(p.z)+4);
  }
  ctx.restore();
}
